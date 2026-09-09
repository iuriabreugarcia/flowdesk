namespace FlowDesk.Api.Domain.Entities;

public sealed class ServiceOrder
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid? AssignedUserId { get; set; }
    public int SequenceNumber { get; set; }
    public string Number { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "NEW";
    public string Priority { get; set; } = "NORMAL";
    public decimal EstimatedValue { get; set; }
    public DateTime? DueDateUtc { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public Company Company { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public User? AssignedUser { get; set; }
    public ICollection<OrderActivity> Activities { get; set; } = new List<OrderActivity>();
    public ICollection<ServiceOrderItem> Items { get; set; } = new List<ServiceOrderItem>();
}
