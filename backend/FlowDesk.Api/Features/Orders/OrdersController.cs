using System.Data;
using System.Security.Claims;
using FlowDesk.Api.Data;
using FlowDesk.Api.Domain.Entities;
using FlowDesk.Api.Domain.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlowDesk.Api.Features.Orders;

[ApiController]
[Authorize]
[Route("api/orders")]
public sealed class OrdersController(AppDbContext db) : ControllerBase
{
    private static readonly HashSet<string> Statuses = ["NEW", "IN_PROGRESS", "WAITING", "DONE"];
    private static readonly HashSet<string> Priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
    private static readonly HashSet<string> ItemTypes = ["PRODUCT", "SERVICE"];

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<OrderCardResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<OrderCardResponse>>> List(
        [FromQuery] string? q = null,
        [FromQuery] string? status = null,
        [FromQuery] string? priority = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetCompanyId();
        var query = db.Orders.AsNoTracking().Where(x => x.CompanyId == companyId);

        var term = q?.Trim();
        if (!string.IsNullOrWhiteSpace(term))
        {
            var pattern = $"%{term}%";
            query = query.Where(x =>
                EF.Functions.ILike(x.Number, pattern) ||
                EF.Functions.ILike(x.Title, pattern) ||
                EF.Functions.ILike(x.Customer.Name, pattern));
        }

        var normalizedStatus = NormalizeEnum(status);
        if (normalizedStatus is not null && Statuses.Contains(normalizedStatus))
        {
            query = query.Where(x => x.Status == normalizedStatus);
        }

        var normalizedPriority = NormalizeEnum(priority);
        if (normalizedPriority is not null && Priorities.Contains(normalizedPriority))
        {
            query = query.Where(x => x.Priority == normalizedPriority);
        }

        var orders = await query
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Take(150)
            .Select(x => new OrderCardResponse(
                x.Id, x.Number, x.Title, x.CustomerId, x.Customer.Name,
                x.Status, x.Priority, x.EstimatedValue, x.DueDateUtc,
                x.AssignedUserId, x.AssignedUser != null ? x.AssignedUser.Name : null,
                x.CreatedAtUtc, x.UpdatedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(orders);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<OrderDetailsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDetailsResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var order = await BuildDetailsOrNullAsync(id, companyId, cancellationToken);
        return order is null ? NotFound(new { message = "Ordem de serviço não encontrada." }) : Ok(order);
    }

    [HttpPost]
    [ProducesResponseType<OrderDetailsResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<OrderDetailsResponse>> Create(
        [FromBody] CreateOrderRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        if (!await CustomerExistsAsync(companyId, request.CustomerId, cancellationToken))
        {
            return BadRequest(new { message = "O cliente informado não existe ou está inativo." });
        }

        var nextSequence = (await db.Orders
            .Where(x => x.CompanyId == companyId)
            .MaxAsync(x => (int?)x.SequenceNumber, cancellationToken) ?? 0) + 1;

        var now = DateTime.UtcNow;
        var order = new ServiceOrder
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            CustomerId = request.CustomerId,
            AssignedUserId = userId,
            SequenceNumber = nextSequence,
            Number = $"OS-{now.Year}-{nextSequence:0000}",
            Title = request.Title.Trim(),
            Description = NormalizeOptional(request.Description),
            Notes = NormalizeOptional(request.Notes),
            Status = "NEW",
            Priority = NormalizePriority(request.Priority),
            EstimatedValue = request.EstimatedValue,
            DueDateUtc = NormalizeDate(request.DueDateUtc),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        db.Orders.Add(order);
        AddActivity(companyId, order.Id, userId, "CREATED", "Ordem de serviço criada.", null, "NEW", now);

        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, await BuildDetailsAsync(order.Id, companyId, cancellationToken));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<OrderDetailsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<OrderDetailsResponse>> Update(
        Guid id,
        [FromBody] UpdateOrderRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();
        var order = await db.Orders
            .Include(x => x.Items)
            .SingleOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, cancellationToken);

        if (order is null)
        {
            return NotFound(new { message = "Ordem de serviço não encontrada." });
        }

        if (!await CustomerExistsAsync(companyId, request.CustomerId, cancellationToken))
        {
            return BadRequest(new { message = "O cliente informado não existe ou está inativo." });
        }

        order.CustomerId = request.CustomerId;
        order.Title = request.Title.Trim();
        order.Description = NormalizeOptional(request.Description);
        order.Notes = NormalizeOptional(request.Notes);
        order.Priority = NormalizePriority(request.Priority);
        order.EstimatedValue = order.Items.Count > 0 ? order.Items.Sum(x => x.Total) : request.EstimatedValue;
        order.DueDateUtc = NormalizeDate(request.DueDateUtc);
        order.UpdatedAtUtc = DateTime.UtcNow;

        AddActivity(companyId, order.Id, userId, "UPDATED", "Dados da ordem atualizados.", null, null, order.UpdatedAtUtc);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(await BuildDetailsAsync(order.Id, companyId, cancellationToken));
    }

    [HttpPost("{orderId:guid}/items")]
    [ProducesResponseType<OrderDetailsResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<OrderDetailsResponse>> AddItem(
        Guid orderId,
        [FromBody] UpsertOrderItemRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        var order = await db.Orders
            .AsNoTracking()
            .SingleOrDefaultAsync(
                x => x.Id == orderId && x.CompanyId == companyId,
                cancellationToken);

        if (order is null)
            return NotFound(new { message = "Ordem de serviço não encontrada." });

        if (order.Status == "DONE")
            return Conflict(new { message = "Reabra a ordem antes de alterar os itens." });

        var prepared = await PrepareItemAsync(companyId, request, cancellationToken);

        if (prepared.Error is not null)
            return BadRequest(new { message = prepared.Error });

        var now = DateTime.UtcNow;
        var item = new ServiceOrderItem
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            OrderId = order.Id,
            ProductId = prepared.Product?.Id,
            Type = prepared.Type,
            Description = prepared.Description,
            SkuSnapshot = prepared.Product?.Sku,
            Unit = prepared.Unit,
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            DiscountAmount = request.DiscountAmount,
            Total = prepared.Total,
            AffectsStock = prepared.AffectsStock,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await using var transaction =
            await db.Database.BeginTransactionAsync(cancellationToken);

        db.OrderItems.Add(item);

        AddActivity(
            companyId,
            order.Id,
            userId,
            "ITEM_ADDED",
            $"Item adicionado: {item.Description}.",
            null,
            item.Total.ToString("0.00"),
            now);

        // Primeiro persiste apenas as entidades novas.
        // O total da ordem é atualizado depois com ExecuteUpdateAsync, evitando
        // a DbUpdateConcurrencyException observada quando o principal e o novo
        // item eram atualizados no mesmo SaveChanges.
        await db.SaveChangesAsync(cancellationToken);

        var updated = await RefreshOrderTotalAsync(
            order.Id,
            companyId,
            now,
            cancellationToken);

        if (!updated)
        {
            await transaction.RollbackAsync(cancellationToken);
            return NotFound(new { message = "A ordem deixou de existir durante a operação." });
        }

        await transaction.CommitAsync(cancellationToken);

        return Created(
            $"/api/orders/{order.Id}/items/{item.Id}",
            await BuildDetailsAsync(order.Id, companyId, cancellationToken));
    }

    [HttpPut("{orderId:guid}/items/{itemId:guid}")]
    [ProducesResponseType<OrderDetailsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<OrderDetailsResponse>> UpdateItem(
        Guid orderId,
        Guid itemId,
        [FromBody] UpsertOrderItemRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        var order = await db.Orders
            .AsNoTracking()
            .SingleOrDefaultAsync(
                x => x.Id == orderId && x.CompanyId == companyId,
                cancellationToken);

        if (order is null)
            return NotFound(new { message = "Ordem de serviço não encontrada." });

        if (order.Status == "DONE")
            return Conflict(new { message = "Reabra a ordem antes de alterar os itens." });

        var item = await db.OrderItems.SingleOrDefaultAsync(
            x => x.Id == itemId &&
                 x.OrderId == orderId &&
                 x.CompanyId == companyId,
            cancellationToken);

        if (item is null)
            return NotFound(new { message = "Item não encontrado." });

        var prepared = await PrepareItemAsync(companyId, request, cancellationToken);

        if (prepared.Error is not null)
            return BadRequest(new { message = prepared.Error });

        var now = DateTime.UtcNow;

        item.ProductId = prepared.Product?.Id;
        item.Type = prepared.Type;
        item.Description = prepared.Description;
        item.SkuSnapshot = prepared.Product?.Sku;
        item.Unit = prepared.Unit;
        item.Quantity = request.Quantity;
        item.UnitPrice = request.UnitPrice;
        item.DiscountAmount = request.DiscountAmount;
        item.Total = prepared.Total;
        item.AffectsStock = prepared.AffectsStock;
        item.UpdatedAtUtc = now;

        await using var transaction =
            await db.Database.BeginTransactionAsync(cancellationToken);

        AddActivity(
            companyId,
            order.Id,
            userId,
            "ITEM_UPDATED",
            $"Item atualizado: {item.Description}.",
            null,
            item.Total.ToString("0.00"),
            now);

        await db.SaveChangesAsync(cancellationToken);

        var updated = await RefreshOrderTotalAsync(
            order.Id,
            companyId,
            now,
            cancellationToken);

        if (!updated)
        {
            await transaction.RollbackAsync(cancellationToken);
            return NotFound(new { message = "A ordem deixou de existir durante a operação." });
        }

        await transaction.CommitAsync(cancellationToken);

        return Ok(await BuildDetailsAsync(order.Id, companyId, cancellationToken));
    }

    [HttpDelete("{orderId:guid}/items/{itemId:guid}")]
    [ProducesResponseType<OrderDetailsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<OrderDetailsResponse>> DeleteItem(
        Guid orderId,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        var order = await db.Orders
            .AsNoTracking()
            .SingleOrDefaultAsync(
                x => x.Id == orderId && x.CompanyId == companyId,
                cancellationToken);

        if (order is null)
            return NotFound(new { message = "Ordem de serviço não encontrada." });

        if (order.Status == "DONE")
            return Conflict(new { message = "Reabra a ordem antes de alterar os itens." });

        var item = await db.OrderItems.SingleOrDefaultAsync(
            x => x.Id == itemId &&
                 x.OrderId == orderId &&
                 x.CompanyId == companyId,
            cancellationToken);

        if (item is null)
            return NotFound(new { message = "Item não encontrado." });

        var description = item.Description;
        var now = DateTime.UtcNow;

        await using var transaction =
            await db.Database.BeginTransactionAsync(cancellationToken);

        db.OrderItems.Remove(item);

        AddActivity(
            companyId,
            order.Id,
            userId,
            "ITEM_REMOVED",
            $"Item removido: {description}.",
            null,
            null,
            now);

        await db.SaveChangesAsync(cancellationToken);

        var updated = await RefreshOrderTotalAsync(
            order.Id,
            companyId,
            now,
            cancellationToken);

        if (!updated)
        {
            await transaction.RollbackAsync(cancellationToken);
            return NotFound(new { message = "A ordem deixou de existir durante a operação." });
        }

        await transaction.CommitAsync(cancellationToken);

        return Ok(await BuildDetailsAsync(order.Id, companyId, cancellationToken));
    }

    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType<OrderDetailsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDetailsResponse>> UpdateStatus(
        Guid id,
        [FromBody] UpdateOrderStatusRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();
        var newStatus = NormalizeEnum(request.Status) ?? "NEW";
        if (!Statuses.Contains(newStatus)) return BadRequest(new { message = "Status inválido." });

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var order = await db.Orders
            .Include(x => x.Items)
            .SingleOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, cancellationToken);

        if (order is null) return NotFound(new { message = "Ordem de serviço não encontrada." });
        if (order.Status == newStatus) return Ok(await BuildDetailsAsync(order.Id, companyId, cancellationToken));

        var oldStatus = order.Status;
        var now = DateTime.UtcNow;

        if (newStatus == "DONE" && oldStatus != "DONE")
        {
            var stockError = await ApplyStockConsumptionAsync(order, companyId, userId, now, cancellationToken);
            if (stockError is not null) return BadRequest(new { message = stockError });
        }
        else if (oldStatus == "DONE" && newStatus != "DONE")
        {
            await ReverseStockConsumptionAsync(order, companyId, userId, now, cancellationToken);
        }

        order.Status = newStatus;
        order.UpdatedAtUtc = now;
        if (newStatus == "IN_PROGRESS" && order.StartedAtUtc is null) order.StartedAtUtc = now;
        order.CompletedAtUtc = newStatus == "DONE" ? now : null;

        AddActivity(companyId, order.Id, userId, "STATUS_CHANGED",
            $"Status alterado de {StatusLabel(oldStatus)} para {StatusLabel(newStatus)}.", oldStatus, newStatus, now);

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Ok(await BuildDetailsAsync(order.Id, companyId, cancellationToken));
    }

    private async Task<string?> ApplyStockConsumptionAsync(
        ServiceOrder order,
        Guid companyId,
        Guid? userId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var itemGroups = order.Items
            .Where(x => x.Type == "PRODUCT" && x.AffectsStock && x.StockDeductedAtUtc is null && x.ProductId.HasValue)
            .GroupBy(x => x.ProductId!.Value)
            .Select(g => new { ProductId = g.Key, Quantity = g.Sum(x => x.Quantity), Items = g.ToList() })
            .ToList();

        if (itemGroups.Count == 0) return null;

        var productIds = itemGroups.Select(x => x.ProductId).ToList();
        var products = await db.Products
            .Where(x => x.CompanyId == companyId && productIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        foreach (var group in itemGroups)
        {
            if (!products.TryGetValue(group.ProductId, out var product))
                return "Um produto da ordem não está mais disponível no catálogo.";
            if (product.CurrentStock < group.Quantity)
                return $"Estoque insuficiente para {product.Name}. Disponível: {product.CurrentStock:0.###} {product.Unit}; necessário: {group.Quantity:0.###} {product.Unit}.";
        }

        foreach (var group in itemGroups)
        {
            var product = products[group.ProductId];
            var before = product.CurrentStock;
            var after = before - group.Quantity;
            product.CurrentStock = after;
            product.UpdatedAtUtc = now;

            db.StockMovements.Add(new StockMovement
            {
                Id = Guid.NewGuid(), CompanyId = companyId, ProductId = product.Id, UserId = userId,
                Type = "EXIT", Quantity = -group.Quantity, StockBefore = before, StockAfter = after,
                Note = $"Baixa automática da {order.Number}.", CreatedAtUtc = now
            });

            foreach (var item in group.Items) item.StockDeductedAtUtc = now;
        }

        AddActivity(companyId, order.Id, userId, "STOCK_DEDUCTED",
            "Estoque dos produtos baixado automaticamente ao finalizar a ordem.", null, null, now);
        return null;
    }

    private async Task ReverseStockConsumptionAsync(
        ServiceOrder order,
        Guid companyId,
        Guid? userId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var itemGroups = order.Items
            .Where(x => x.Type == "PRODUCT" && x.AffectsStock && x.StockDeductedAtUtc is not null && x.ProductId.HasValue)
            .GroupBy(x => x.ProductId!.Value)
            .Select(g => new { ProductId = g.Key, Quantity = g.Sum(x => x.Quantity), Items = g.ToList() })
            .ToList();

        if (itemGroups.Count == 0) return;
        var productIds = itemGroups.Select(x => x.ProductId).ToList();
        var products = await db.Products
            .Where(x => x.CompanyId == companyId && productIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        foreach (var group in itemGroups)
        {
            if (!products.TryGetValue(group.ProductId, out var product)) continue;
            var before = product.CurrentStock;
            var after = before + group.Quantity;
            product.CurrentStock = after;
            product.UpdatedAtUtc = now;

            db.StockMovements.Add(new StockMovement
            {
                Id = Guid.NewGuid(), CompanyId = companyId, ProductId = product.Id, UserId = userId,
                Type = "ENTRY", Quantity = group.Quantity, StockBefore = before, StockAfter = after,
                Note = $"Estorno automático da {order.Number} reaberta.", CreatedAtUtc = now
            });

            foreach (var item in group.Items) item.StockDeductedAtUtc = null;
        }

        AddActivity(companyId, order.Id, userId, "STOCK_REVERSED",
            "Estoque devolvido automaticamente porque a ordem foi reaberta.", null, null, now);
    }

    private async Task<(string Type, Product? Product, string Description, string Unit, decimal Total, bool AffectsStock, string? Error)> PrepareItemAsync(
        Guid companyId,
        UpsertOrderItemRequest request,
        CancellationToken cancellationToken)
    {
        var type = NormalizeEnum(request.Type) ?? "SERVICE";
        if (!ItemTypes.Contains(type)) return (type, null, "", "UN", 0, false, "Tipo de item inválido.");
        var pricing = OrderItemPricing.Calculate(
            request.Quantity,
            request.UnitPrice,
            request.DiscountAmount);

        if (!pricing.IsValid)
            return (type, null, "", "UN", 0, false, pricing.Error);

        var total = pricing.Total;

        if (type == "PRODUCT")
        {
            if (!request.ProductId.HasValue)
                return (type, null, "", "UN", 0, false, "Selecione um produto.");

            var product = await db.Products.SingleOrDefaultAsync(
                x => x.Id == request.ProductId.Value && x.CompanyId == companyId && x.IsActive,
                cancellationToken);
            if (product is null)
                return (type, null, "", "UN", 0, false, "Produto não encontrado ou inativo.");

            return (type, product, product.Name, product.Unit, total, request.AffectsStock, null);
        }

        var description = NormalizeOptional(request.Description);
        if (description is null)
            return (type, null, "", "SERV", 0, false, "Informe a descrição do serviço.");

        return (type, null, description, NormalizeUnit(request.Unit, "SERV"), total, false, null);
    }

    private async Task<bool> RefreshOrderTotalAsync(
        Guid orderId,
        Guid companyId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var total = await db.OrderItems
            .AsNoTracking()
            .Where(x => x.OrderId == orderId && x.CompanyId == companyId)
            .SumAsync(x => (decimal?)x.Total, cancellationToken) ?? 0m;

        var affectedRows = await db.Orders
            .Where(x => x.Id == orderId && x.CompanyId == companyId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(x => x.EstimatedValue, total)
                    .SetProperty(x => x.UpdatedAtUtc, now),
                cancellationToken);

        return affectedRows == 1;
    }

    private async Task<OrderDetailsResponse> BuildDetailsAsync(Guid id, Guid companyId, CancellationToken cancellationToken)
        => await BuildDetailsOrNullAsync(id, companyId, cancellationToken)
           ?? throw new InvalidOperationException("Ordem não encontrada após persistência.");

    private async Task<OrderDetailsResponse?> BuildDetailsOrNullAsync(Guid id, Guid companyId, CancellationToken cancellationToken)
    {
        return await db.Orders
            .AsNoTracking()
            .AsSplitQuery()
            .Where(x => x.Id == id && x.CompanyId == companyId)
            .Select(x => new OrderDetailsResponse(
                x.Id, x.Number, x.Title, x.Description, x.Notes,
                x.CustomerId, x.Customer.Name, x.Customer.Email, x.Customer.Phone,
                x.Status, x.Priority, x.EstimatedValue,
                x.Items.Sum(i => (decimal?)(i.Quantity * i.UnitPrice)) ?? 0,
                x.Items.Sum(i => (decimal?)i.DiscountAmount) ?? 0,
                x.Items.Sum(i => (decimal?)i.Total) ?? 0,
                x.DueDateUtc, x.StartedAtUtc, x.CompletedAtUtc,
                x.AssignedUserId, x.AssignedUser != null ? x.AssignedUser.Name : null,
                x.CreatedAtUtc, x.UpdatedAtUtc,
                x.Items.OrderBy(i => i.CreatedAtUtc)
                    .Select(i => new OrderItemResponse(
                        i.Id, i.Type, i.ProductId,
                        i.SkuSnapshot ?? (i.Product != null ? i.Product.Sku : null),
                        i.Description, i.Unit, i.Quantity, i.UnitPrice,
                        i.DiscountAmount, i.Total, i.AffectsStock, i.StockDeductedAtUtc,
                        i.Product != null ? i.Product.CurrentStock : null))
                    .ToList(),
                x.Activities.OrderByDescending(a => a.CreatedAtUtc)
                    .Select(a => new OrderActivityResponse(
                        a.Id, a.Type, a.Description, a.FromValue, a.ToValue,
                        a.UserId, a.User != null ? a.User.Name : null, a.CreatedAtUtc))
                    .ToList()))
            .SingleOrDefaultAsync(cancellationToken);
    }

    private static void RecalculateOrderTotal(ServiceOrder order, DateTime now)
    {
        order.EstimatedValue = order.Items.Sum(x => x.Total);
        order.UpdatedAtUtc = now;
    }

    private void AddActivity(Guid companyId, Guid orderId, Guid? userId, string type, string description, string? from, string? to, DateTime now)
    {
        db.OrderActivities.Add(new OrderActivity
        {
            Id = Guid.NewGuid(), CompanyId = companyId, OrderId = orderId, UserId = userId,
            Type = type, Description = description, FromValue = from, ToValue = to, CreatedAtUtc = now
        });
    }

    private async Task<bool> CustomerExistsAsync(Guid companyId, Guid customerId, CancellationToken cancellationToken)
        => await db.Customers.AsNoTracking().AnyAsync(x => x.Id == customerId && x.CompanyId == companyId && x.IsActive, cancellationToken);

    private Guid GetCompanyId()
    {
        var value = User.FindFirstValue("companyId");
        return Guid.TryParse(value, out var id) ? id : throw new UnauthorizedAccessException("Token sem empresa válida.");
    }

    private Guid? GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private static string NormalizePriority(string value)
    {
        var normalized = NormalizeEnum(value) ?? "NORMAL";
        return Priorities.Contains(normalized) ? normalized : "NORMAL";
    }

    private static string? NormalizeEnum(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string NormalizeUnit(string? value, string fallback)
        => string.IsNullOrWhiteSpace(value) ? fallback : value.Trim().ToUpperInvariant()[..Math.Min(value.Trim().Length, 20)];

    private static DateTime? NormalizeDate(DateTime? value)
        => value.HasValue ? DateTime.SpecifyKind(value.Value.Date.AddHours(12), DateTimeKind.Utc) : null;

    private static string StatusLabel(string status) => status switch
    {
        "NEW" => "Nova", "IN_PROGRESS" => "Em andamento", "WAITING" => "Aguardando", "DONE" => "Finalizada", _ => status
    };
}
