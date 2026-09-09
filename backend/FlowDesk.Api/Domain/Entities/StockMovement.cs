namespace FlowDesk.Api.Domain.Entities;

public sealed class StockMovement
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? UserId { get; set; }
    public string Type { get; set; } = "ADJUSTMENT";
    public decimal Quantity { get; set; }
    public decimal StockBefore { get; set; }
    public decimal StockAfter { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public Company Company { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public User? User { get; set; }
}
