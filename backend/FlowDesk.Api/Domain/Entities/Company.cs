namespace FlowDesk.Api.Domain.Entities;

public sealed class Company
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Customer> Customers { get; set; } = new List<Customer>();
    public ICollection<ServiceOrder> Orders { get; set; } = new List<ServiceOrder>();
    public ICollection<OrderActivity> OrderActivities { get; set; } = new List<OrderActivity>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
    public ICollection<ServiceOrderItem> OrderItems { get; set; } = new List<ServiceOrderItem>();
}
