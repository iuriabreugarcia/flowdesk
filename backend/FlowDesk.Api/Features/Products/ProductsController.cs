using System.Security.Claims;
using FlowDesk.Api.Data;
using FlowDesk.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlowDesk.Api.Features.Products;

[ApiController]
[Authorize]
[Route("api/products")]
public sealed class ProductsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<ProductPagedResponse<ProductListItemResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ProductPagedResponse<ProductListItemResponse>>> List(
        [FromQuery] string? q = null,
        [FromQuery] string? category = null,
        [FromQuery] string? stock = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetCompanyId();
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 5, 50);

        var query = db.Products
            .AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.IsActive);

        var term = q?.Trim();
        if (!string.IsNullOrWhiteSpace(term))
        {
            var pattern = $"%{term}%";
            query = query.Where(x =>
                EF.Functions.ILike(x.Sku, pattern) ||
                EF.Functions.ILike(x.Name, pattern) ||
                (x.Category != null && EF.Functions.ILike(x.Category, pattern)));
        }

        var normalizedCategory = NormalizeOptional(category);
        if (normalizedCategory is not null)
        {
            query = query.Where(x => x.Category == normalizedCategory);
        }

        switch (stock?.Trim().ToUpperInvariant())
        {
            case "OUT":
                query = query.Where(x => x.CurrentStock <= 0);
                break;
            case "LOW":
                query = query.Where(x => x.CurrentStock > 0 && x.CurrentStock <= x.MinimumStock);
                break;
            case "OK":
                query = query.Where(x => x.CurrentStock > x.MinimumStock);
                break;
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var totalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)pageSize);
        if (totalPages > 0 && page > totalPages)
        {
            page = totalPages;
        }

        var items = await query
            .OrderBy(x => x.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new ProductListItemResponse(
                x.Id,
                x.Sku,
                x.Name,
                x.Category,
                x.Unit,
                x.CostPrice,
                x.SalePrice,
                x.CurrentStock,
                x.MinimumStock,
                x.CurrentStock <= 0 ? "OUT" : x.CurrentStock <= x.MinimumStock ? "LOW" : "OK",
                x.UpdatedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(new ProductPagedResponse<ProductListItemResponse>(
            items,
            page,
            pageSize,
            totalItems,
            totalPages));
    }

    [HttpGet("categories")]
    [ProducesResponseType<IReadOnlyList<string>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<string>>> Categories(CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var categories = await db.Products
            .AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.IsActive && x.Category != null && x.Category != "")
            .Select(x => x.Category!)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync(cancellationToken);

        return Ok(categories);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ProductResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var product = await db.Products
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId && x.IsActive, cancellationToken);

        return product is null
            ? NotFound(new { message = "Produto não encontrado." })
            : Ok(ToResponse(product));
    }

    [HttpPost]
    [Authorize(Roles = "OWNER,ADMIN,MANAGER")]
    [ProducesResponseType<ProductResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductResponse>> Create(
        [FromBody] CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var sku = NormalizeSku(request.Sku);

        if (await db.Products.AsNoTracking().AnyAsync(x => x.CompanyId == companyId && x.Sku == sku, cancellationToken))
        {
            return Conflict(new { message = "Já existe um produto com este SKU." });
        }

        var now = DateTime.UtcNow;
        var product = new Product
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Sku = sku,
            Name = request.Name.Trim(),
            Category = NormalizeOptional(request.Category),
            Unit = NormalizeUnit(request.Unit),
            CostPrice = request.CostPrice,
            SalePrice = request.SalePrice,
            CurrentStock = request.InitialStock,
            MinimumStock = request.MinimumStock,
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        db.Products.Add(product);

        if (request.InitialStock > 0)
        {
            db.StockMovements.Add(new StockMovement
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                ProductId = product.Id,
                UserId = GetUserId(),
                Type = "INITIAL",
                Quantity = request.InitialStock,
                StockBefore = 0,
                StockAfter = request.InitialStock,
                Note = "Saldo inicial do produto.",
                CreatedAtUtc = now
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, ToResponse(product));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "OWNER,ADMIN,MANAGER")]
    [ProducesResponseType<ProductResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductResponse>> Update(
        Guid id,
        [FromBody] UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var product = await db.Products.SingleOrDefaultAsync(
            x => x.Id == id && x.CompanyId == companyId && x.IsActive,
            cancellationToken);

        if (product is null)
        {
            return NotFound(new { message = "Produto não encontrado." });
        }

        var sku = NormalizeSku(request.Sku);
        var duplicate = await db.Products.AsNoTracking().AnyAsync(
            x => x.CompanyId == companyId && x.Sku == sku && x.Id != id,
            cancellationToken);

        if (duplicate)
        {
            return Conflict(new { message = "Já existe outro produto com este SKU." });
        }

        product.Sku = sku;
        product.Name = request.Name.Trim();
        product.Category = NormalizeOptional(request.Category);
        product.Unit = NormalizeUnit(request.Unit);
        product.CostPrice = request.CostPrice;
        product.SalePrice = request.SalePrice;
        product.MinimumStock = request.MinimumStock;
        product.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(product));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "OWNER,ADMIN")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var product = await db.Products.SingleOrDefaultAsync(
            x => x.Id == id && x.CompanyId == companyId && x.IsActive,
            cancellationToken);

        if (product is null)
        {
            return NotFound(new { message = "Produto não encontrado." });
        }

        product.IsActive = false;
        product.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
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

    private static string NormalizeSku(string value) => value.Trim().ToUpperInvariant();
    private static string NormalizeUnit(string value) => value.Trim().ToUpperInvariant();
    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ProductResponse ToResponse(Product product) => new(
        product.Id,
        product.Sku,
        product.Name,
        product.Category,
        product.Unit,
        product.CostPrice,
        product.SalePrice,
        product.CurrentStock,
        product.MinimumStock,
        StockStatus(product.CurrentStock, product.MinimumStock),
        product.CreatedAtUtc,
        product.UpdatedAtUtc);

    private static string StockStatus(decimal currentStock, decimal minimumStock)
        => currentStock <= 0 ? "OUT" : currentStock <= minimumStock ? "LOW" : "OK";
}
