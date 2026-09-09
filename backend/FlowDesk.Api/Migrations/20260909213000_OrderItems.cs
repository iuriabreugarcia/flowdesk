using System;
using FlowDesk.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlowDesk.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260909213000_OrderItems")]
public partial class OrderItems : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "service_order_items",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                ProductId = table.Column<Guid>(type: "uuid", nullable: true),
                Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                SkuSnapshot = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                Quantity = table.Column<decimal>(type: "numeric(14,3)", precision: 14, scale: 3, nullable: false),
                UnitPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                DiscountAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                Total = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                AffectsStock = table.Column<bool>(type: "boolean", nullable: false),
                StockDeductedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_service_order_items", x => x.Id);
                table.ForeignKey(
                    name: "FK_service_order_items_companies_CompanyId",
                    column: x => x.CompanyId,
                    principalTable: "companies",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_service_order_items_products_ProductId",
                    column: x => x.ProductId,
                    principalTable: "products",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_service_order_items_service_orders_OrderId",
                    column: x => x.OrderId,
                    principalTable: "service_orders",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_service_order_items_CompanyId_OrderId",
            table: "service_order_items",
            columns: new[] { "CompanyId", "OrderId" });

        migrationBuilder.CreateIndex(
            name: "IX_service_order_items_OrderId",
            table: "service_order_items",
            column: "OrderId");

        migrationBuilder.CreateIndex(
            name: "IX_service_order_items_ProductId",
            table: "service_order_items",
            column: "ProductId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "service_order_items");
    }
}
