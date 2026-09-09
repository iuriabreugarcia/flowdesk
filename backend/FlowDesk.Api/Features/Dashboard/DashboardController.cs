using System.Security.Claims;
using FlowDesk.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlowDesk.Api.Features.Dashboard;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public sealed class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryResponse>> GetSummary(CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var companyName = User.FindFirstValue("companyName") ?? "Sua empresa";
        var now = DateTime.UtcNow;
        var currentMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var previousMonth = currentMonth.AddMonths(-1);

        var activeCustomers = await db.Customers.AsNoTracking()
            .CountAsync(x => x.CompanyId == companyId && x.IsActive, cancellationToken);

        var openOrders = await db.Orders.AsNoTracking()
            .CountAsync(x => x.CompanyId == companyId && x.Status != "DONE", cancellationToken);

        var completedOrders = db.Orders.AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.Status == "DONE");

        var revenue = await completedOrders
            .Where(x => x.CompletedAtUtc >= currentMonth)
            .SumAsync(x => x.EstimatedValue, cancellationToken);

        var previousRevenue = await completedOrders
            .Where(x => x.CompletedAtUtc >= previousMonth && x.CompletedAtUtc < currentMonth)
            .SumAsync(x => x.EstimatedValue, cancellationToken);

        var averageTicket = await completedOrders.AnyAsync(cancellationToken)
            ? await completedOrders.AverageAsync(x => x.EstimatedValue, cancellationToken)
            : 0m;

        var currentCreated = await db.Orders.AsNoTracking()
            .CountAsync(x => x.CompanyId == companyId && x.CreatedAtUtc >= currentMonth, cancellationToken);
        var previousCreated = await db.Orders.AsNoTracking()
            .CountAsync(x => x.CompanyId == companyId && x.CreatedAtUtc >= previousMonth && x.CreatedAtUtc < currentMonth, cancellationToken);

        var activities = await db.OrderActivities.AsNoTracking()
            .Where(x => x.CompanyId == companyId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(4)
            .Select(x => new
            {
                x.Order.Number,
                x.Description,
                x.Type,
                x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var response = new DashboardSummaryResponse(
            companyName,
            revenue,
            openOrders,
            averageTicket,
            activeCustomers,
            PercentChange(revenue, previousRevenue),
            PercentChange(currentCreated, previousCreated),
            activities.Select(x => new DashboardActivityResponse(
                x.Number,
                x.Description,
                RelativeTime(x.CreatedAtUtc, now),
                ActivityType(x.Type))).ToList());

        return Ok(response);
    }

    private Guid GetCompanyId()
    {
        var rawCompanyId = User.FindFirstValue("companyId");
        return Guid.TryParse(rawCompanyId, out var companyId)
            ? companyId
            : throw new UnauthorizedAccessException("Token sem empresa válida.");
    }

    private static decimal PercentChange(decimal current, decimal previous)
    {
        if (previous == 0)
        {
            return current == 0 ? 0 : 100;
        }

        return Math.Round(((current - previous) / previous) * 100, 1);
    }

    private static string ActivityType(string type) => type switch
    {
        "CREATED" => "customer",
        "STATUS_CHANGED" => "progress",
        "UPDATED" => "warning",
        _ => "progress"
    };

    private static string RelativeTime(DateTime value, DateTime now)
    {
        var elapsed = now - value;
        if (elapsed.TotalMinutes < 1) return "agora";
        if (elapsed.TotalMinutes < 60) return $"há {(int)elapsed.TotalMinutes} min";
        if (elapsed.TotalHours < 24) return $"há {(int)elapsed.TotalHours} h";
        return $"há {(int)elapsed.TotalDays} d";
    }
}

public sealed record DashboardActivityResponse(string Title, string Description, string Time, string Type);

public sealed record DashboardSummaryResponse(
    string CompanyName,
    decimal Revenue,
    int OpenOrders,
    decimal AverageTicket,
    int ActiveCustomers,
    decimal RevenueChangePercent,
    decimal OrdersChangePercent,
    IReadOnlyCollection<DashboardActivityResponse> Activities);
