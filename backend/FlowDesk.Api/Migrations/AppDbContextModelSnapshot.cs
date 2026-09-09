using System;
using FlowDesk.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace FlowDesk.Api.Migrations;

[DbContext(typeof(AppDbContext))]
partial class AppDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
#pragma warning disable 612, 618
        modelBuilder.HasAnnotation("ProductVersion", "8.0.30");

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.Company", b =>
        {
            b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Name").IsRequired().HasMaxLength(160).HasColumnType("character varying(160)");
            b.Property<string>("Slug").IsRequired().HasMaxLength(100).HasColumnType("character varying(100)");
            b.HasKey("Id");
            b.HasIndex("Slug").IsUnique();
            b.ToTable("companies");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.Customer", b =>
        {
            b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid");
            b.Property<Guid>("CompanyId").HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Document").HasMaxLength(40).HasColumnType("character varying(40)");
            b.Property<string>("Email").HasMaxLength(180).HasColumnType("character varying(180)");
            b.Property<bool>("IsActive").HasColumnType("boolean");
            b.Property<string>("Name").IsRequired().HasMaxLength(160).HasColumnType("character varying(160)");
            b.Property<string>("Notes").HasMaxLength(1000).HasColumnType("character varying(1000)");
            b.Property<string>("Phone").HasMaxLength(40).HasColumnType("character varying(40)");
            b.Property<DateTime>("UpdatedAtUtc").HasColumnType("timestamp with time zone");
            b.HasKey("Id");
            b.HasIndex("CompanyId", "Document");
            b.HasIndex("CompanyId", "Email");
            b.HasIndex("CompanyId", "Name");
            b.ToTable("customers");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.OrderActivity", b =>
        {
            b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid");
            b.Property<Guid>("CompanyId").HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Description").IsRequired().HasMaxLength(500).HasColumnType("character varying(500)");
            b.Property<string>("FromValue").HasMaxLength(120).HasColumnType("character varying(120)");
            b.Property<Guid>("OrderId").HasColumnType("uuid");
            b.Property<string>("ToValue").HasMaxLength(120).HasColumnType("character varying(120)");
            b.Property<string>("Type").IsRequired().HasMaxLength(40).HasColumnType("character varying(40)");
            b.Property<Guid?>("UserId").HasColumnType("uuid");
            b.HasKey("Id");
            b.HasIndex("UserId");
            b.HasIndex("CompanyId", "CreatedAtUtc");
            b.HasIndex("OrderId", "CreatedAtUtc");
            b.ToTable("order_activities");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.Product", b =>
        {
            b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid");
            b.Property<string>("Category").HasMaxLength(100).HasColumnType("character varying(100)");
            b.Property<Guid>("CompanyId").HasColumnType("uuid");
            b.Property<decimal>("CostPrice").HasPrecision(12, 2).HasColumnType("numeric(12,2)");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<decimal>("CurrentStock").HasPrecision(14, 3).HasColumnType("numeric(14,3)");
            b.Property<bool>("IsActive").HasColumnType("boolean");
            b.Property<decimal>("MinimumStock").HasPrecision(14, 3).HasColumnType("numeric(14,3)");
            b.Property<string>("Name").IsRequired().HasMaxLength(160).HasColumnType("character varying(160)");
            b.Property<decimal>("SalePrice").HasPrecision(12, 2).HasColumnType("numeric(12,2)");
            b.Property<string>("Sku").IsRequired().HasMaxLength(60).HasColumnType("character varying(60)");
            b.Property<string>("Unit").IsRequired().HasMaxLength(20).HasColumnType("character varying(20)");
            b.Property<DateTime>("UpdatedAtUtc").HasColumnType("timestamp with time zone");
            b.HasKey("Id");
            b.HasIndex("CompanyId", "Category");
            b.HasIndex("CompanyId", "IsActive");
            b.HasIndex("CompanyId", "Name");
            b.HasIndex("CompanyId", "Sku").IsUnique();
            b.ToTable("products");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.ServiceOrderItem", b =>
        {
            b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid");
            b.Property<bool>("AffectsStock").HasColumnType("boolean");
            b.Property<Guid>("CompanyId").HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Description").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)");
            b.Property<decimal>("DiscountAmount").HasPrecision(12, 2).HasColumnType("numeric(12,2)");
            b.Property<Guid>("OrderId").HasColumnType("uuid");
            b.Property<Guid?>("ProductId").HasColumnType("uuid");
            b.Property<decimal>("Quantity").HasPrecision(14, 3).HasColumnType("numeric(14,3)");
            b.Property<string>("SkuSnapshot").HasMaxLength(60).HasColumnType("character varying(60)");
            b.Property<DateTime?>("StockDeductedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<decimal>("Total").HasPrecision(12, 2).HasColumnType("numeric(12,2)");
            b.Property<string>("Type").IsRequired().HasMaxLength(20).HasColumnType("character varying(20)");
            b.Property<string>("Unit").IsRequired().HasMaxLength(20).HasColumnType("character varying(20)");
            b.Property<decimal>("UnitPrice").HasPrecision(12, 2).HasColumnType("numeric(12,2)");
            b.Property<DateTime>("UpdatedAtUtc").HasColumnType("timestamp with time zone");
            b.HasKey("Id");
            b.HasIndex("OrderId");
            b.HasIndex("ProductId");
            b.HasIndex("CompanyId", "OrderId");
            b.ToTable("service_order_items");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.ServiceOrder", b =>
        {
            b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid");
            b.Property<Guid?>("AssignedUserId").HasColumnType("uuid");
            b.Property<Guid>("CompanyId").HasColumnType("uuid");
            b.Property<DateTime?>("CompletedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<Guid>("CustomerId").HasColumnType("uuid");
            b.Property<string>("Description").HasMaxLength(2000).HasColumnType("character varying(2000)");
            b.Property<DateTime?>("DueDateUtc").HasColumnType("timestamp with time zone");
            b.Property<decimal>("EstimatedValue").HasPrecision(12, 2).HasColumnType("numeric(12,2)");
            b.Property<string>("Notes").HasMaxLength(2000).HasColumnType("character varying(2000)");
            b.Property<string>("Number").IsRequired().HasMaxLength(30).HasColumnType("character varying(30)");
            b.Property<string>("Priority").IsRequired().HasMaxLength(30).HasColumnType("character varying(30)");
            b.Property<int>("SequenceNumber").HasColumnType("integer");
            b.Property<DateTime?>("StartedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Status").IsRequired().HasMaxLength(30).HasColumnType("character varying(30)");
            b.Property<string>("Title").IsRequired().HasMaxLength(160).HasColumnType("character varying(160)");
            b.Property<DateTime>("UpdatedAtUtc").HasColumnType("timestamp with time zone");
            b.HasKey("Id");
            b.HasIndex("AssignedUserId");
            b.HasIndex("CustomerId");
            b.HasIndex("CompanyId", "Number").IsUnique();
            b.HasIndex("CompanyId", "Priority");
            b.HasIndex("CompanyId", "SequenceNumber").IsUnique();
            b.HasIndex("CompanyId", "Status");
            b.HasIndex("CompanyId", "UpdatedAtUtc");
            b.ToTable("service_orders");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.StockMovement", b =>
        {
            b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid");
            b.Property<Guid>("CompanyId").HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Note").HasMaxLength(500).HasColumnType("character varying(500)");
            b.Property<Guid>("ProductId").HasColumnType("uuid");
            b.Property<decimal>("Quantity").HasPrecision(14, 3).HasColumnType("numeric(14,3)");
            b.Property<decimal>("StockAfter").HasPrecision(14, 3).HasColumnType("numeric(14,3)");
            b.Property<decimal>("StockBefore").HasPrecision(14, 3).HasColumnType("numeric(14,3)");
            b.Property<string>("Type").IsRequired().HasMaxLength(30).HasColumnType("character varying(30)");
            b.Property<Guid?>("UserId").HasColumnType("uuid");
            b.HasKey("Id");
            b.HasIndex("UserId");
            b.HasIndex("CompanyId", "CreatedAtUtc");
            b.HasIndex("ProductId", "CreatedAtUtc");
            b.ToTable("stock_movements");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.User", b =>
        {
            b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid");
            b.Property<Guid>("CompanyId").HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Email").IsRequired().HasMaxLength(180).HasColumnType("character varying(180)");
            b.Property<bool>("IsActive").HasColumnType("boolean");
            b.Property<DateTime?>("LastLoginAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Name").IsRequired().HasMaxLength(160).HasColumnType("character varying(160)");
            b.Property<string>("PasswordHash").IsRequired().HasMaxLength(600).HasColumnType("character varying(600)");
            b.Property<string>("Role").IsRequired().HasMaxLength(40).HasColumnType("character varying(40)");
            b.HasKey("Id");
            b.HasIndex("CompanyId");
            b.HasIndex("Email").IsUnique();
            b.ToTable("users");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.Customer", b =>
        {
            b.HasOne("FlowDesk.Api.Domain.Entities.Company", "Company").WithMany("Customers").HasForeignKey("CompanyId").OnDelete(DeleteBehavior.Cascade).IsRequired();
            b.Navigation("Company");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.OrderActivity", b =>
        {
            b.HasOne("FlowDesk.Api.Domain.Entities.Company", "Company").WithMany("OrderActivities").HasForeignKey("CompanyId").OnDelete(DeleteBehavior.Cascade).IsRequired();
            b.HasOne("FlowDesk.Api.Domain.Entities.ServiceOrder", "Order").WithMany("Activities").HasForeignKey("OrderId").OnDelete(DeleteBehavior.Cascade).IsRequired();
            b.HasOne("FlowDesk.Api.Domain.Entities.User", "User").WithMany("OrderActivities").HasForeignKey("UserId").OnDelete(DeleteBehavior.SetNull);
            b.Navigation("Company"); b.Navigation("Order"); b.Navigation("User");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.Product", b =>
        {
            b.HasOne("FlowDesk.Api.Domain.Entities.Company", "Company").WithMany("Products").HasForeignKey("CompanyId").OnDelete(DeleteBehavior.Cascade).IsRequired();
            b.Navigation("Company");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.ServiceOrder", b =>
        {
            b.HasOne("FlowDesk.Api.Domain.Entities.User", "AssignedUser").WithMany("AssignedOrders").HasForeignKey("AssignedUserId").OnDelete(DeleteBehavior.SetNull);
            b.HasOne("FlowDesk.Api.Domain.Entities.Company", "Company").WithMany("Orders").HasForeignKey("CompanyId").OnDelete(DeleteBehavior.Cascade).IsRequired();
            b.HasOne("FlowDesk.Api.Domain.Entities.Customer", "Customer").WithMany("Orders").HasForeignKey("CustomerId").OnDelete(DeleteBehavior.Restrict).IsRequired();
            b.Navigation("AssignedUser"); b.Navigation("Company"); b.Navigation("Customer");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.ServiceOrderItem", b =>
        {
            b.HasOne("FlowDesk.Api.Domain.Entities.Company", "Company").WithMany("OrderItems").HasForeignKey("CompanyId").OnDelete(DeleteBehavior.Cascade).IsRequired();
            b.HasOne("FlowDesk.Api.Domain.Entities.ServiceOrder", "Order").WithMany("Items").HasForeignKey("OrderId").OnDelete(DeleteBehavior.Cascade).IsRequired();
            b.HasOne("FlowDesk.Api.Domain.Entities.Product", "Product").WithMany("OrderItems").HasForeignKey("ProductId").OnDelete(DeleteBehavior.SetNull);
            b.Navigation("Company"); b.Navigation("Order"); b.Navigation("Product");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.StockMovement", b =>
        {
            b.HasOne("FlowDesk.Api.Domain.Entities.Company", "Company").WithMany("StockMovements").HasForeignKey("CompanyId").OnDelete(DeleteBehavior.Cascade).IsRequired();
            b.HasOne("FlowDesk.Api.Domain.Entities.Product", "Product").WithMany("StockMovements").HasForeignKey("ProductId").OnDelete(DeleteBehavior.Cascade).IsRequired();
            b.HasOne("FlowDesk.Api.Domain.Entities.User", "User").WithMany("StockMovements").HasForeignKey("UserId").OnDelete(DeleteBehavior.SetNull);
            b.Navigation("Company"); b.Navigation("Product"); b.Navigation("User");
        });

        modelBuilder.Entity("FlowDesk.Api.Domain.Entities.User", b =>
        {
            b.HasOne("FlowDesk.Api.Domain.Entities.Company", "Company").WithMany("Users").HasForeignKey("CompanyId").OnDelete(DeleteBehavior.Cascade).IsRequired();
            b.Navigation("Company");
        });
#pragma warning restore 612, 618
    }
}
