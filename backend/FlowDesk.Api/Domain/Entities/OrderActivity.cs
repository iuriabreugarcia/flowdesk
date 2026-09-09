namespace FlowDesk.Api.Domain.Entities;

public sealed class OrderActivity
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid OrderId { get; set; }
    public Guid? UserId { get; set; }
    public string Type { get; set; } = "UPDATED";
    public string Description { get; set; } = string.Empty;
    public string? FromValue { get; set; }
    public string? ToValue { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public Company Company { get; set; } = null!;
    public ServiceOrder Order { get; set; } = null!;
    public User? User { get; set; }
}
