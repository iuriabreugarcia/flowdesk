namespace FlowDesk.Api.Domain.Entities;

public sealed class User
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "USER";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? LastLoginAtUtc { get; set; }

    public Company Company { get; set; } = null!;
    public ICollection<ServiceOrder> AssignedOrders { get; set; } = new List<ServiceOrder>();
    public ICollection<OrderActivity> OrderActivities { get; set; } = new List<OrderActivity>();
    public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
}
