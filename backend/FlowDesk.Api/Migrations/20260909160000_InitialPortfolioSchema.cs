using System;
using FlowDesk.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlowDesk.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260909160000_InitialPortfolioSchema")]
public partial class InitialPortfolioSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "companies",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                Slug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_companies", x => x.Id));

        migrationBuilder.CreateTable(
            name: "customers",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                Email = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: true),
                Phone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                Document = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_customers", x => x.Id);
                table.ForeignKey("FK_customers_companies_CompanyId", x => x.CompanyId, "companies", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "users",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                Email = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                PasswordHash = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: false),
                Role = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_users", x => x.Id);
                table.ForeignKey("FK_users_companies_CompanyId", x => x.CompanyId, "companies", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "service_orders",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                AssignedUserId = table.Column<Guid>(type: "uuid", nullable: true),
                SequenceNumber = table.Column<int>(type: "integer", nullable: false),
                Number = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                Priority = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                EstimatedValue = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                DueDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                StartedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_service_orders", x => x.Id);
                table.ForeignKey("FK_service_orders_companies_CompanyId", x => x.CompanyId, "companies", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_service_orders_customers_CustomerId", x => x.CustomerId, "customers", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_service_orders_users_AssignedUserId", x => x.AssignedUserId, "users", "Id", onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateTable(
            name: "order_activities",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                UserId = table.Column<Guid>(type: "uuid", nullable: true),
                Type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                FromValue = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                ToValue = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_order_activities", x => x.Id);
                table.ForeignKey("FK_order_activities_companies_CompanyId", x => x.CompanyId, "companies", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_order_activities_service_orders_OrderId", x => x.OrderId, "service_orders", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_order_activities_users_UserId", x => x.UserId, "users", "Id", onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex("IX_companies_Slug", "companies", "Slug", unique: true);
        migrationBuilder.CreateIndex("IX_customers_CompanyId_Document", "customers", new[] { "CompanyId", "Document" });
        migrationBuilder.CreateIndex("IX_customers_CompanyId_Email", "customers", new[] { "CompanyId", "Email" });
        migrationBuilder.CreateIndex("IX_customers_CompanyId_Name", "customers", new[] { "CompanyId", "Name" });
        migrationBuilder.CreateIndex("IX_users_CompanyId", "users", "CompanyId");
        migrationBuilder.CreateIndex("IX_users_Email", "users", "Email", unique: true);
        migrationBuilder.CreateIndex("IX_service_orders_AssignedUserId", "service_orders", "AssignedUserId");
        migrationBuilder.CreateIndex("IX_service_orders_CustomerId", "service_orders", "CustomerId");
        migrationBuilder.CreateIndex("IX_service_orders_CompanyId_Number", "service_orders", new[] { "CompanyId", "Number" }, unique: true);
        migrationBuilder.CreateIndex("IX_service_orders_CompanyId_SequenceNumber", "service_orders", new[] { "CompanyId", "SequenceNumber" }, unique: true);
        migrationBuilder.CreateIndex("IX_service_orders_CompanyId_Status", "service_orders", new[] { "CompanyId", "Status" });
        migrationBuilder.CreateIndex("IX_service_orders_CompanyId_Priority", "service_orders", new[] { "CompanyId", "Priority" });
        migrationBuilder.CreateIndex("IX_service_orders_CompanyId_UpdatedAtUtc", "service_orders", new[] { "CompanyId", "UpdatedAtUtc" });
        migrationBuilder.CreateIndex("IX_order_activities_UserId", "order_activities", "UserId");
        migrationBuilder.CreateIndex("IX_order_activities_CompanyId_CreatedAtUtc", "order_activities", new[] { "CompanyId", "CreatedAtUtc" });
        migrationBuilder.CreateIndex("IX_order_activities_OrderId_CreatedAtUtc", "order_activities", new[] { "OrderId", "CreatedAtUtc" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("order_activities");
        migrationBuilder.DropTable("service_orders");
        migrationBuilder.DropTable("users");
        migrationBuilder.DropTable("customers");
        migrationBuilder.DropTable("companies");
    }
}
