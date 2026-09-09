using System;
using FlowDesk.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlowDesk.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260909190000_ProductsInventory")]
public partial class ProductsInventory : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "products",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                Sku = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                CostPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                SalePrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                CurrentStock = table.Column<decimal>(type: "numeric(14,3)", precision: 14, scale: 3, nullable: false),
                MinimumStock = table.Column<decimal>(type: "numeric(14,3)", precision: 14, scale: 3, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_products", x => x.Id);
                table.ForeignKey(
                    name: "FK_products_companies_CompanyId",
                    column: x => x.CompanyId,
                    principalTable: "companies",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "stock_movements",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                UserId = table.Column<Guid>(type: "uuid", nullable: true),
                Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                Quantity = table.Column<decimal>(type: "numeric(14,3)", precision: 14, scale: 3, nullable: false),
                StockBefore = table.Column<decimal>(type: "numeric(14,3)", precision: 14, scale: 3, nullable: false),
                StockAfter = table.Column<decimal>(type: "numeric(14,3)", precision: 14, scale: 3, nullable: false),
                Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_stock_movements", x => x.Id);
                table.ForeignKey(
                    name: "FK_stock_movements_companies_CompanyId",
                    column: x => x.CompanyId,
                    principalTable: "companies",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_stock_movements_products_ProductId",
                    column: x => x.ProductId,
                    principalTable: "products",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_stock_movements_users_UserId",
                    column: x => x.UserId,
                    principalTable: "users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(
            name: "IX_products_CompanyId_Category",
            table: "products",
            columns: new[] { "CompanyId", "Category" });

        migrationBuilder.CreateIndex(
            name: "IX_products_CompanyId_IsActive",
            table: "products",
            columns: new[] { "CompanyId", "IsActive" });

        migrationBuilder.CreateIndex(
            name: "IX_products_CompanyId_Name",
            table: "products",
            columns: new[] { "CompanyId", "Name" });

        migrationBuilder.CreateIndex(
            name: "IX_products_CompanyId_Sku",
            table: "products",
            columns: new[] { "CompanyId", "Sku" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_stock_movements_CompanyId_CreatedAtUtc",
            table: "stock_movements",
            columns: new[] { "CompanyId", "CreatedAtUtc" });

        migrationBuilder.CreateIndex(
            name: "IX_stock_movements_ProductId_CreatedAtUtc",
            table: "stock_movements",
            columns: new[] { "ProductId", "CreatedAtUtc" });

        migrationBuilder.CreateIndex(
            name: "IX_stock_movements_UserId",
            table: "stock_movements",
            column: "UserId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "stock_movements");
        migrationBuilder.DropTable(name: "products");
    }
}
