using System;
using FlowDesk.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlowDesk.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260909200000_TeamRbac")]
public partial class TeamRbac : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "LastLoginAtUtc",
            table: "users",
            type: "timestamp with time zone",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "LastLoginAtUtc", table: "users");
    }
}
