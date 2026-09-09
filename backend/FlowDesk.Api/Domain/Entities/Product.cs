namespace FlowDesk.Api.Domain.Entities;

public sealed class Product
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string Unit { get; set; } = "UN";
    public decimal CostPrice { get; set; }
    public decimal SalePrice { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal MinimumStock { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public Company Company { get; set; } = null!;
    public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
    public ICollection<ServiceOrderItem> OrderItems { get; set; } = new List<ServiceOrderItem>();
}
