using FlowDesk.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FlowDesk.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<ServiceOrder> Orders => Set<ServiceOrder>();
    public DbSet<OrderActivity> OrderActivities => Set<OrderActivity>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<ServiceOrderItem> OrderItems => Set<ServiceOrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Company>(entity =>
        {
            entity.ToTable("companies");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(160).IsRequired();
            entity.Property(x => x.Slug).HasMaxLength(100).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(160).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(180).IsRequired();
            entity.Property(x => x.PasswordHash).HasMaxLength(600).IsRequired();
            entity.Property(x => x.Role).HasMaxLength(40).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.LastLoginAtUtc);

            entity
                .HasOne(x => x.Company)
                .WithMany(x => x.Users)
                .HasForeignKey(x => x.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("customers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(160).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.Property(x => x.Phone).HasMaxLength(40);
            entity.Property(x => x.Document).HasMaxLength(40);
            entity.Property(x => x.Notes).HasMaxLength(1000);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();

            entity
                .HasOne(x => x.Company)
                .WithMany(x => x.Customers)
                .HasForeignKey(x => x.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.CompanyId, x.Name });
            entity.HasIndex(x => new { x.CompanyId, x.Email });
            entity.HasIndex(x => new { x.CompanyId, x.Document });
        });

        modelBuilder.Entity<ServiceOrder>(entity =>
        {
            entity.ToTable("service_orders");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Number).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Title).HasMaxLength(160).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(2000);
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.Property(x => x.Status).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Priority).HasMaxLength(30).IsRequired();
            entity.Property(x => x.EstimatedValue).HasPrecision(12, 2);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();

            entity
                .HasOne(x => x.Company)
                .WithMany(x => x.Orders)
                .HasForeignKey(x => x.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity
                .HasOne(x => x.Customer)
                .WithMany(x => x.Orders)
                .HasForeignKey(x => x.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity
                .HasOne(x => x.AssignedUser)
                .WithMany(x => x.AssignedOrders)
                .HasForeignKey(x => x.AssignedUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => new { x.CompanyId, x.Number }).IsUnique();
            entity.HasIndex(x => new { x.CompanyId, x.SequenceNumber }).IsUnique();
            entity.HasIndex(x => new { x.CompanyId, x.Status });
            entity.HasIndex(x => new { x.CompanyId, x.Priority });
            entity.HasIndex(x => new { x.CompanyId, x.UpdatedAtUtc });
        });

        modelBuilder.Entity<OrderActivity>(entity =>
        {
            entity.ToTable("order_activities");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Type).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(500).IsRequired();
            entity.Property(x => x.FromValue).HasMaxLength(120);
            entity.Property(x => x.ToValue).HasMaxLength(120);
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity
                .HasOne(x => x.Company)
                .WithMany(x => x.OrderActivities)
                .HasForeignKey(x => x.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity
                .HasOne(x => x.Order)
                .WithMany(x => x.Activities)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity
                .HasOne(x => x.User)
                .WithMany(x => x.OrderActivities)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => new { x.CompanyId, x.CreatedAtUtc });
            entity.HasIndex(x => new { x.OrderId, x.CreatedAtUtc });
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Sku).HasMaxLength(60).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(160).IsRequired();
            entity.Property(x => x.Category).HasMaxLength(100);
            entity.Property(x => x.Unit).HasMaxLength(20).IsRequired();
            entity.Property(x => x.CostPrice).HasPrecision(12, 2);
            entity.Property(x => x.SalePrice).HasPrecision(12, 2);
            entity.Property(x => x.CurrentStock).HasPrecision(14, 3);
            entity.Property(x => x.MinimumStock).HasPrecision(14, 3);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();

            entity
                .HasOne(x => x.Company)
                .WithMany(x => x.Products)
                .HasForeignKey(x => x.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.CompanyId, x.Sku }).IsUnique();
            entity.HasIndex(x => new { x.CompanyId, x.Name });
            entity.HasIndex(x => new { x.CompanyId, x.Category });
            entity.HasIndex(x => new { x.CompanyId, x.IsActive });
        });

        modelBuilder.Entity<ServiceOrderItem>(entity =>
        {
            entity.ToTable("service_order_items");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Type).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(200).IsRequired();
            entity.Property(x => x.SkuSnapshot).HasMaxLength(60);
            entity.Property(x => x.Unit).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Quantity).HasPrecision(14, 3);
            entity.Property(x => x.UnitPrice).HasPrecision(12, 2);
            entity.Property(x => x.DiscountAmount).HasPrecision(12, 2);
            entity.Property(x => x.Total).HasPrecision(12, 2);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();

            entity
                .HasOne(x => x.Company)
                .WithMany(x => x.OrderItems)
                .HasForeignKey(x => x.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity
                .HasOne(x => x.Order)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity
                .HasOne(x => x.Product)
                .WithMany(x => x.OrderItems)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => new { x.CompanyId, x.OrderId });
            entity.HasIndex(x => x.ProductId);
        });

        modelBuilder.Entity<StockMovement>(entity =>
        {
            entity.ToTable("stock_movements");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Type).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Quantity).HasPrecision(14, 3);
            entity.Property(x => x.StockBefore).HasPrecision(14, 3);
            entity.Property(x => x.StockAfter).HasPrecision(14, 3);
            entity.Property(x => x.Note).HasMaxLength(500);
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity
                .HasOne(x => x.Company)
                .WithMany(x => x.StockMovements)
                .HasForeignKey(x => x.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity
                .HasOne(x => x.Product)
                .WithMany(x => x.StockMovements)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            entity
                .HasOne(x => x.User)
                .WithMany(x => x.StockMovements)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => new { x.CompanyId, x.CreatedAtUtc });
            entity.HasIndex(x => new { x.ProductId, x.CreatedAtUtc });
        });
    }
}
