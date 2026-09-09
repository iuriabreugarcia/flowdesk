using System.ComponentModel.DataAnnotations;

namespace FlowDesk.Api.Features.Orders;

public sealed record OrderCardResponse(
    Guid Id,
    string Number,
    string Title,
    Guid CustomerId,
    string CustomerName,
    string Status,
    string Priority,
    decimal EstimatedValue,
    DateTime? DueDateUtc,
    Guid? AssignedUserId,
    string? AssignedUserName,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record OrderActivityResponse(
    Guid Id,
    string Type,
    string Description,
    string? FromValue,
    string? ToValue,
    Guid? UserId,
    string? UserName,
    DateTime CreatedAtUtc);

public sealed record OrderItemResponse(
    Guid Id,
    string Type,
    Guid? ProductId,
    string? ProductSku,
    string Description,
    string Unit,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountAmount,
    decimal Total,
    bool AffectsStock,
    DateTime? StockDeductedAtUtc,
    decimal? ProductCurrentStock);

public sealed record OrderDetailsResponse(
    Guid Id,
    string Number,
    string Title,
    string? Description,
    string? Notes,
    Guid CustomerId,
    string CustomerName,
    string? CustomerEmail,
    string? CustomerPhone,
    string Status,
    string Priority,
    decimal EstimatedValue,
    decimal ItemsSubtotal,
    decimal ItemsDiscount,
    decimal ItemsTotal,
    DateTime? DueDateUtc,
    DateTime? StartedAtUtc,
    DateTime? CompletedAtUtc,
    Guid? AssignedUserId,
    string? AssignedUserName,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    IReadOnlyList<OrderItemResponse> Items,
    IReadOnlyList<OrderActivityResponse> Activities);

public class CreateOrderRequest
{
    [Required(ErrorMessage = "Informe o cliente.")]
    public Guid CustomerId { get; init; }

    [Required(ErrorMessage = "Informe o título da ordem.")]
    [StringLength(160, MinimumLength = 3, ErrorMessage = "O título deve ter entre 3 e 160 caracteres.")]
    public string Title { get; init; } = string.Empty;

    [StringLength(2000)]
    public string? Description { get; init; }

    [StringLength(2000)]
    public string? Notes { get; init; }

    [Required]
    [RegularExpression("LOW|NORMAL|HIGH|URGENT", ErrorMessage = "Prioridade inválida.")]
    public string Priority { get; init; } = "NORMAL";

    [Range(0, 99_999_999, ErrorMessage = "Informe um valor válido.")]
    public decimal EstimatedValue { get; init; }

    public DateTime? DueDateUtc { get; init; }
}

public sealed class UpdateOrderRequest : CreateOrderRequest
{
}

public sealed class UpdateOrderStatusRequest
{
    [Required]
    [RegularExpression("NEW|IN_PROGRESS|WAITING|DONE", ErrorMessage = "Status inválido.")]
    public string Status { get; init; } = string.Empty;
}

public sealed class UpsertOrderItemRequest
{
    [Required]
    [RegularExpression("PRODUCT|SERVICE", ErrorMessage = "Tipo de item inválido.")]
    public string Type { get; init; } = "SERVICE";

    public Guid? ProductId { get; init; }

    [StringLength(200, ErrorMessage = "A descrição pode ter no máximo 200 caracteres.")]
    public string? Description { get; init; }

    [StringLength(20)]
    public string? Unit { get; init; }

    [Range(typeof(decimal), "0.001", "999999.999", ErrorMessage = "Informe uma quantidade maior que zero.")]
    public decimal Quantity { get; init; }

    [Range(typeof(decimal), "0", "99999999.99", ErrorMessage = "Informe um preço unitário válido.")]
    public decimal UnitPrice { get; init; }

    [Range(typeof(decimal), "0", "99999999.99", ErrorMessage = "Informe um desconto válido.")]
    public decimal DiscountAmount { get; init; }

    public bool AffectsStock { get; init; }
}
