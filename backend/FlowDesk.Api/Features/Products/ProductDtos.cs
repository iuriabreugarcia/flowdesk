using System.ComponentModel.DataAnnotations;

namespace FlowDesk.Api.Features.Products;

public sealed record ProductListItemResponse(
    Guid Id,
    string Sku,
    string Name,
    string? Category,
    string Unit,
    decimal CostPrice,
    decimal SalePrice,
    decimal CurrentStock,
    decimal MinimumStock,
    string StockStatus,
    DateTime UpdatedAtUtc);

public sealed record ProductResponse(
    Guid Id,
    string Sku,
    string Name,
    string? Category,
    string Unit,
    decimal CostPrice,
    decimal SalePrice,
    decimal CurrentStock,
    decimal MinimumStock,
    string StockStatus,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record ProductPagedResponse<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);

public sealed class CreateProductRequest
{
    [Required(ErrorMessage = "Informe o SKU.")]
    [StringLength(60, MinimumLength = 2, ErrorMessage = "O SKU deve ter entre 2 e 60 caracteres.")]
    public string Sku { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe o nome do produto.")]
    [StringLength(160, MinimumLength = 2, ErrorMessage = "O nome deve ter entre 2 e 160 caracteres.")]
    public string Name { get; init; } = string.Empty;

    [StringLength(100)]
    public string? Category { get; init; }

    [Required]
    [StringLength(20, MinimumLength = 1)]
    public string Unit { get; init; } = "UN";

    [Range(0, 99_999_999, ErrorMessage = "Informe um custo válido.")]
    public decimal CostPrice { get; init; }

    [Range(0, 99_999_999, ErrorMessage = "Informe um preço de venda válido.")]
    public decimal SalePrice { get; init; }

    [Range(0, 99_999_999, ErrorMessage = "Informe um estoque inicial válido.")]
    public decimal InitialStock { get; init; }

    [Range(0, 99_999_999, ErrorMessage = "Informe um estoque mínimo válido.")]
    public decimal MinimumStock { get; init; }
}

public sealed class UpdateProductRequest
{
    [Required(ErrorMessage = "Informe o SKU.")]
    [StringLength(60, MinimumLength = 2, ErrorMessage = "O SKU deve ter entre 2 e 60 caracteres.")]
    public string Sku { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe o nome do produto.")]
    [StringLength(160, MinimumLength = 2, ErrorMessage = "O nome deve ter entre 2 e 160 caracteres.")]
    public string Name { get; init; } = string.Empty;

    [StringLength(100)]
    public string? Category { get; init; }

    [Required]
    [StringLength(20, MinimumLength = 1)]
    public string Unit { get; init; } = "UN";

    [Range(0, 99_999_999, ErrorMessage = "Informe um custo válido.")]
    public decimal CostPrice { get; init; }

    [Range(0, 99_999_999, ErrorMessage = "Informe um preço de venda válido.")]
    public decimal SalePrice { get; init; }

    [Range(0, 99_999_999, ErrorMessage = "Informe um estoque mínimo válido.")]
    public decimal MinimumStock { get; init; }
}
