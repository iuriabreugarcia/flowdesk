using System.ComponentModel.DataAnnotations;

namespace FlowDesk.Api.Features.Inventory;

public sealed record InventorySummaryResponse(
    int ActiveProducts,
    int LowStockProducts,
    int OutOfStockProducts,
    decimal InventoryCostValue,
    decimal InventorySaleValue,
    IReadOnlyList<LowStockProductResponse> LowStockItems);

public sealed record LowStockProductResponse(
    Guid Id,
    string Sku,
    string Name,
    string? Category,
    string Unit,
    decimal CurrentStock,
    decimal MinimumStock,
    string StockStatus);

public sealed record StockMovementResponse(
    Guid Id,
    Guid ProductId,
    string ProductSku,
    string ProductName,
    string Type,
    decimal Quantity,
    decimal StockBefore,
    decimal StockAfter,
    string? Note,
    Guid? UserId,
    string? UserName,
    DateTime CreatedAtUtc);

public sealed record MovementPagedResponse<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);

public sealed class CreateStockMovementRequest
{
    [Required]
    [RegularExpression("ENTRY|EXIT|ADJUSTMENT", ErrorMessage = "Tipo de movimentação inválido.")]
    public string Type { get; init; } = "ENTRY";

    [Range(typeof(decimal), "0", "99999999", ErrorMessage = "Informe uma quantidade válida.")]
    public decimal Quantity { get; init; }

    [StringLength(500)]
    public string? Note { get; init; }
}
