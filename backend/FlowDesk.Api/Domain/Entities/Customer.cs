namespace FlowDesk.Api.Domain.Entities;

public sealed class Customer
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Document { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public Company Company { get; set; } = null!;
    public ICollection<ServiceOrder> Orders { get; set; } = new List<ServiceOrder>();
}
