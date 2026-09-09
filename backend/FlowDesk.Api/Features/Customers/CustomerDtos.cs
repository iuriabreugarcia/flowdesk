using System.ComponentModel.DataAnnotations;

namespace FlowDesk.Api.Features.Customers;

public sealed record CustomerListItemResponse(
    Guid Id,
    string Name,
    string? Email,
    string? Phone,
    string? Document,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record CustomerResponse(
    Guid Id,
    string Name,
    string? Email,
    string? Phone,
    string? Document,
    string? Notes,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record PagedResponse<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);

public sealed class CreateCustomerRequest
{
    [Required(ErrorMessage = "Informe o nome do cliente.")]
    [StringLength(160, MinimumLength = 2, ErrorMessage = "O nome deve ter entre 2 e 160 caracteres.")]
    public string Name { get; init; } = string.Empty;

    [EmailAddress(ErrorMessage = "Informe um e-mail válido.")]
    [StringLength(180)]
    public string? Email { get; init; }

    [StringLength(40)]
    public string? Phone { get; init; }

    [StringLength(40)]
    public string? Document { get; init; }

    [StringLength(1000)]
    public string? Notes { get; init; }
}

public sealed class UpdateCustomerRequest
{
    [Required(ErrorMessage = "Informe o nome do cliente.")]
    [StringLength(160, MinimumLength = 2, ErrorMessage = "O nome deve ter entre 2 e 160 caracteres.")]
    public string Name { get; init; } = string.Empty;

    [EmailAddress(ErrorMessage = "Informe um e-mail válido.")]
    [StringLength(180)]
    public string? Email { get; init; }

    [StringLength(40)]
    public string? Phone { get; init; }

    [StringLength(40)]
    public string? Document { get; init; }

    [StringLength(1000)]
    public string? Notes { get; init; }
}
