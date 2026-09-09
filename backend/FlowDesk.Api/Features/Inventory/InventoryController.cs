using System.Data;
using System.Security.Claims;
using FlowDesk.Api.Data;
using FlowDesk.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlowDesk.Api.Features.Inventory;

[ApiController]
[Authorize]
[Route("api/inventory")]
public sealed class InventoryController(AppDbContext db) : ControllerBase
{
    private static readonly HashSet<string> MovementTypes = ["ENTRY", "EXIT", "ADJUSTMENT"];

    [HttpGet("summary")]
    [ProducesResponseType<InventorySummaryResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<InventorySummaryResponse>> Summary(CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var products = db.Products.AsNoTracking().Where(x => x.CompanyId == companyId && x.IsActive);

        var activeProducts = await products.CountAsync(cancellationToken);
        var lowStockProducts = await products.CountAsync(x => x.CurrentStock > 0 && x.CurrentStock <= x.MinimumStock, cancellationToken);
        var outOfStockProducts = await products.CountAsync(x => x.CurrentStock <= 0, cancellationToken);
        var inventoryCostValue = await products.SumAsync(x => (decimal?)(x.CurrentStock * x.CostPrice), cancellationToken) ?? 0;
        var inventorySaleValue = await products.SumAsync(x => (decimal?)(x.CurrentStock * x.SalePrice), cancellationToken) ?? 0;

        var lowStockItems = await products
            .Where(x => x.CurrentStock <= x.MinimumStock)
            .OrderBy(x => x.CurrentStock)
            .ThenBy(x => x.Name)
            .Take(8)
            .Select(x => new LowStockProductResponse(
                x.Id,
                x.Sku,
                x.Name,
                x.Category,
                x.Unit,
                x.CurrentStock,
                x.MinimumStock,
                x.CurrentStock <= 0 ? "OUT" : "LOW"))
            .ToListAsync(cancellationToken);

        return Ok(new InventorySummaryResponse(
            activeProducts,
            lowStockProducts,
            outOfStockProducts,
            inventoryCostValue,
            inventorySaleValue,
            lowStockItems));
    }

    [HttpGet("movements")]
    [ProducesResponseType<MovementPagedResponse<StockMovementResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MovementPagedResponse<StockMovementResponse>>> Movements(
        [FromQuery] Guid? productId = null,
        [FromQuery] string? q = null,
        [FromQuery] string? type = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetCompanyId();
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 5, 50);

        var query = db.StockMovements
            .AsNoTracking()
            .Where(x => x.CompanyId == companyId);

        if (productId.HasValue)
        {
            query = query.Where(x => x.ProductId == productId.Value);
        }

        var term = q?.Trim();
        if (!string.IsNullOrWhiteSpace(term))
        {
            var pattern = $"%{term}%";
            query = query.Where(x =>
                EF.Functions.ILike(x.Product.Name, pattern) ||
                EF.Functions.ILike(x.Product.Sku, pattern) ||
                (x.Note != null && EF.Functions.ILike(x.Note, pattern)));
        }

        var normalizedType = type?.Trim().ToUpperInvariant();
        if (!string.IsNullOrWhiteSpace(normalizedType))
        {
            query = query.Where(x => x.Type == normalizedType);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var totalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)pageSize);
        if (totalPages > 0 && page > totalPages)
        {
            page = totalPages;
        }

        var items = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new StockMovementResponse(
                x.Id,
                x.ProductId,
                x.Product.Sku,
                x.Product.Name,
                x.Type,
                x.Quantity,
                x.StockBefore,
                x.StockAfter,
                x.Note,
                x.UserId,
                x.User != null ? x.User.Name : null,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(new MovementPagedResponse<StockMovementResponse>(items, page, pageSize, totalItems, totalPages));
    }

    [HttpPost("products/{productId:guid}/movements")]
    [Authorize(Roles = "OWNER,ADMIN,MANAGER")]
    [ProducesResponseType<StockMovementResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StockMovementResponse>> CreateMovement(
        Guid productId,
        [FromBody] CreateStockMovementRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var type = request.Type.Trim().ToUpperInvariant();

        if (!MovementTypes.Contains(type))
        {
            return BadRequest(new { message = "Tipo de movimentação inválido." });
        }

        if (type != "ADJUSTMENT" && request.Quantity <= 0)
        {
            return BadRequest(new { message = "Informe uma quantidade maior que zero." });
        }

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        var product = await db.Products.SingleOrDefaultAsync(
            x => x.Id == productId && x.CompanyId == companyId && x.IsActive,
            cancellationToken);

        if (product is null)
        {
            return NotFound(new { message = "Produto não encontrado." });
        }

        var before = product.CurrentStock;
        decimal after;
        decimal delta;

        switch (type)
        {
            case "ENTRY":
                delta = request.Quantity;
                after = before + delta;
                break;
            case "EXIT":
                delta = -request.Quantity;
                after = before + delta;
                if (after < 0)
                {
                    return BadRequest(new { message = $"Estoque insuficiente. Saldo atual: {before:0.###} {product.Unit}." });
                }
                break;
            default:
                after = request.Quantity;
                delta = after - before;
                break;
        }

        var now = DateTime.UtcNow;
        product.CurrentStock = after;
        product.UpdatedAtUtc = now;

        var movement = new StockMovement
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            ProductId = product.Id,
            UserId = GetUserId(),
            Type = type,
            Quantity = delta,
            StockBefore = before,
            StockAfter = after,
            Note = NormalizeOptional(request.Note),
            CreatedAtUtc = now
        };

        db.StockMovements.Add(movement);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var response = await db.StockMovements
            .AsNoTracking()
            .Where(x => x.Id == movement.Id && x.CompanyId == companyId)
            .Select(x => new StockMovementResponse(
                x.Id,
                x.ProductId,
                x.Product.Sku,
                x.Product.Name,
                x.Type,
                x.Quantity,
                x.StockBefore,
                x.StockAfter,
                x.Note,
                x.UserId,
                x.User != null ? x.User.Name : null,
                x.CreatedAtUtc))
            .SingleAsync(cancellationToken);

        return Created($"/api/inventory/movements/{movement.Id}", response);
    }

    private Guid GetCompanyId()
    {
        var value = User.FindFirstValue("companyId");
        return Guid.TryParse(value, out var id)
            ? id
            : throw new UnauthorizedAccessException("Token sem empresa válida.");
    }

    private Guid? GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
