namespace FlowDesk.Api.Domain.Entities;

public sealed class ServiceOrderItem
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid OrderId { get; set; }
    public Guid? ProductId { get; set; }
    public string Type { get; set; } = "SERVICE";
    public string Description { get; set; } = string.Empty;
    public string? SkuSnapshot { get; set; }
    public string Unit { get; set; } = "UN";
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal Total { get; set; }
    public bool AffectsStock { get; set; }
    public DateTime? StockDeductedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public Company Company { get; set; } = null!;
    public ServiceOrder Order { get; set; } = null!;
    public Product? Product { get; set; }
}
