using System.Globalization;
using System.Security.Claims;
using System.Text;
using FlowDesk.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlowDesk.Api.Features.Reports;

[ApiController]
[Authorize]
[Route("api/reports")]
public sealed class ReportsController(AppDbContext db) : ControllerBase
{
    private static readonly string[] StatusOrder = ["NEW", "IN_PROGRESS", "WAITING", "DONE"];

    [HttpGet("overview")]
    [ProducesResponseType<ReportsOverviewResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ReportsOverviewResponse>> Overview(
        [FromQuery] string range = "6m",
        CancellationToken cancellationToken = default)
    {
        var companyId = GetCompanyId();
        var period = ResolvePeriod(range);
        var previousStart = period.StartUtc - (period.EndUtc - period.StartUtc);

        var orders = await db.Orders
            .AsNoTracking()
            .Where(x => x.CompanyId == companyId)
            .Select(x => new OrderRow(
                x.Id,
                x.CustomerId,
                x.Customer.Name,
                x.Number,
                x.Title,
                x.Status,
                x.EstimatedValue,
                x.CreatedAtUtc,
                x.CompletedAtUtc))
            .ToListAsync(cancellationToken);

        var products = await db.Products
            .AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.IsActive)
            .Select(x => new ProductRow(
                x.Id,
                x.Sku,
                x.Name,
                x.Unit,
                x.CostPrice,
                x.SalePrice,
                x.CurrentStock,
                x.MinimumStock))
            .ToListAsync(cancellationToken);

        var movements = await db.StockMovements
            .AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.CreatedAtUtc >= period.StartUtc && x.CreatedAtUtc <= period.EndUtc)
            .Select(x => new MovementRow(
                x.ProductId,
                x.Product.Sku,
                x.Product.Name,
                x.Product.Unit,
                x.Quantity,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        var currentCompleted = orders
            .Where(x => IsBetween(x.CompletedAtUtc, period.StartUtc, period.EndUtc))
            .ToList();

        var previousCompleted = orders
            .Where(x => IsBetween(x.CompletedAtUtc, previousStart, period.StartUtc))
            .ToList();

        var createdInPeriod = orders
            .Where(x => x.CreatedAtUtc >= period.StartUtc && x.CreatedAtUtc <= period.EndUtc)
            .ToList();

        var revenue = currentCompleted.Sum(x => x.EstimatedValue);
        var previousRevenue = previousCompleted.Sum(x => x.EstimatedValue);
        var revenueChange = CalculatePercentChange(revenue, previousRevenue);
        var completedOrders = currentCompleted.Count;
        var averageTicket = completedOrders == 0 ? 0 : revenue / completedOrders;
        var completionRate = createdInPeriod.Count == 0
            ? 0
            : Math.Round((decimal)completedOrders / createdInPeriod.Count * 100m, 1);
        var averageLeadTimeHours = completedOrders == 0
            ? 0
            : Math.Round((decimal)currentCompleted.Average(x => (x.CompletedAtUtc!.Value - x.CreatedAtUtc).TotalHours), 1);

        var openOrders = orders.Where(x => x.Status != "DONE").ToList();

        var kpis = new ReportKpisResponse(
            Revenue: revenue,
            RevenueChangePercent: revenueChange,
            OrdersCreated: createdInPeriod.Count,
            CompletedOrders: completedOrders,
            CompletionRate: completionRate,
            AverageTicket: averageTicket,
            OpenOrders: openOrders.Count,
            OpenPipeline: openOrders.Sum(x => x.EstimatedValue),
            ActiveCustomers: createdInPeriod.Select(x => x.CustomerId).Distinct().Count(),
            AverageLeadTimeHours: averageLeadTimeHours);

        var trend = BuildTrend(orders, period);

        var statusBreakdown = StatusOrder
            .Select(status =>
            {
                var items = orders.Where(x => x.Status == status).ToList();
                return new OrderStatusBreakdownResponse(
                    status,
                    StatusLabel(status),
                    items.Count,
                    items.Sum(x => x.EstimatedValue));
            })
            .ToList();

        var topCustomersRaw = currentCompleted
            .GroupBy(x => new { x.CustomerId, x.CustomerName })
            .Select(group => new
            {
                group.Key.CustomerId,
                group.Key.CustomerName,
                CompletedOrders = group.Count(),
                Revenue = group.Sum(x => x.EstimatedValue)
            })
            .OrderByDescending(x => x.Revenue)
            .ThenBy(x => x.CustomerName)
            .Take(6)
            .ToList();

        var topCustomers = topCustomersRaw
            .Select(x => new TopCustomerResponse(
                x.CustomerId,
                x.CustomerName,
                x.CompletedOrders,
                x.Revenue,
                revenue <= 0 ? 0 : Math.Round(x.Revenue / revenue * 100m, 1)))
            .ToList();

        var inventory = new InventoryAnalyticsResponse(
            ActiveProducts: products.Count,
            LowStockProducts: products.Count(x => x.CurrentStock > 0 && x.CurrentStock <= x.MinimumStock),
            OutOfStockProducts: products.Count(x => x.CurrentStock <= 0),
            CostValue: products.Sum(x => x.CostPrice * x.CurrentStock),
            SaleValue: products.Sum(x => x.SalePrice * x.CurrentStock),
            PotentialMargin: products.Sum(x => (x.SalePrice - x.CostPrice) * x.CurrentStock),
            MovementsInPeriod: movements.Count);

        var productStock = products.ToDictionary(x => x.Id, x => x.CurrentStock);
        var topMovedProducts = movements
            .GroupBy(x => new { x.ProductId, x.Sku, x.ProductName, x.Unit })
            .Select(group => new TopMovedProductResponse(
                group.Key.ProductId,
                group.Key.Sku,
                group.Key.ProductName,
                group.Key.Unit,
                group.Sum(x => Math.Abs(x.Quantity)),
                group.Count(),
                productStock.GetValueOrDefault(group.Key.ProductId)))
            .OrderByDescending(x => x.MovedQuantity)
            .ThenBy(x => x.ProductName)
            .Take(6)
            .ToList();

        var recentCompleted = currentCompleted
            .OrderByDescending(x => x.CompletedAtUtc)
            .Take(6)
            .Select(x => new RecentCompletedOrderResponse(
                x.Id,
                x.Number,
                x.Title,
                x.CustomerName,
                x.EstimatedValue,
                x.CompletedAtUtc!.Value))
            .ToList();

        return Ok(new ReportsOverviewResponse(
            new ReportPeriodResponse(period.Range, period.Label, period.StartUtc, period.EndUtc),
            kpis,
            trend,
            statusBreakdown,
            topCustomers,
            inventory,
            topMovedProducts,
            recentCompleted));
    }

    [HttpGet("export/orders.csv")]
    [Authorize(Policy = "ManagerOrAbove")]
    [Produces("text/csv")]
    public async Task<IActionResult> ExportOrdersCsv(
        [FromQuery] string range = "6m",
        CancellationToken cancellationToken = default)
    {
        var companyId = GetCompanyId();
        var period = ResolvePeriod(range);

        var orders = await db.Orders
            .AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.CreatedAtUtc >= period.StartUtc && x.CreatedAtUtc <= period.EndUtc)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new
            {
                x.Number,
                x.Title,
                CustomerName = x.Customer.Name,
                x.Status,
                x.Priority,
                x.EstimatedValue,
                x.CreatedAtUtc,
                x.CompletedAtUtc,
                AssignedUserName = x.AssignedUser != null ? x.AssignedUser.Name : null
            })
            .ToListAsync(cancellationToken);

        var csv = new StringBuilder();
        csv.AppendLine("Numero;Titulo;Cliente;Status;Prioridade;Valor;Criada em;Concluida em;Responsavel");

        foreach (var order in orders)
        {
            csv.AppendLine(string.Join(";",
                Csv(order.Number),
                Csv(order.Title),
                Csv(order.CustomerName),
                Csv(StatusLabel(order.Status)),
                Csv(PriorityLabel(order.Priority)),
                order.EstimatedValue.ToString("0.00", CultureInfo.InvariantCulture).Replace('.', ','),
                Csv(order.CreatedAtUtc.ToLocalTime().ToString("dd/MM/yyyy HH:mm")),
                Csv(order.CompletedAtUtc?.ToLocalTime().ToString("dd/MM/yyyy HH:mm") ?? string.Empty),
                Csv(order.AssignedUserName ?? string.Empty)));
        }

        var bytes = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetBytes(csv.ToString());
        var fileName = $"flowdesk-ordens-{period.Range}-{DateTime.UtcNow:yyyyMMdd-HHmm}.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    private static IReadOnlyList<RevenueTrendPointResponse> BuildTrend(IReadOnlyList<OrderRow> orders, Period period)
    {
        var buckets = BuildBuckets(period);
        var result = new List<RevenueTrendPointResponse>(buckets.Count);

        foreach (var bucket in buckets)
        {
            var completed = orders
                .Where(x => IsBetween(x.CompletedAtUtc, bucket.StartUtc, bucket.EndUtc))
                .ToList();

            var createdCount = orders.Count(x => x.CreatedAtUtc >= bucket.StartUtc && x.CreatedAtUtc < bucket.EndUtc);

            result.Add(new RevenueTrendPointResponse(
                bucket.Key,
                bucket.Label,
                bucket.StartUtc,
                bucket.EndUtc,
                completed.Sum(x => x.EstimatedValue),
                createdCount,
                completed.Count));
        }

        return result;
    }

    private static List<Bucket> BuildBuckets(Period period)
    {
        var buckets = new List<Bucket>();

        if (period.Range is "6m" or "12m")
        {
            var months = period.Range == "12m" ? 12 : 6;
            var cursor = new DateTime(period.EndUtc.Year, period.EndUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc)
                .AddMonths(-(months - 1));

            for (var index = 0; index < months; index++)
            {
                var start = cursor.AddMonths(index);
                var end = start.AddMonths(1);
                buckets.Add(new Bucket(
                    start.ToString("yyyy-MM"),
                    start.ToString("MMM", CultureInfo.GetCultureInfo("pt-BR")).TrimEnd('.'),
                    start,
                    end));
            }

            return buckets;
        }

        const int bucketCount = 6;
        var totalTicks = period.EndUtc.Ticks - period.StartUtc.Ticks;
        var bucketTicks = Math.Max(1, totalTicks / bucketCount);

        for (var index = 0; index < bucketCount; index++)
        {
            var start = new DateTime(period.StartUtc.Ticks + bucketTicks * index, DateTimeKind.Utc);
            var end = index == bucketCount - 1
                ? period.EndUtc.AddTicks(1)
                : new DateTime(period.StartUtc.Ticks + bucketTicks * (index + 1), DateTimeKind.Utc);
            buckets.Add(new Bucket($"{period.Range}-{index}", $"{start:dd/MM}", start, end));
        }

        return buckets;
    }

    private static Period ResolvePeriod(string? range)
    {
        var normalized = range?.Trim().ToLowerInvariant() switch
        {
            "30d" => "30d",
            "90d" => "90d",
            "12m" => "12m",
            _ => "6m"
        };

        var end = DateTime.UtcNow;
        return normalized switch
        {
            "30d" => new Period("30d", "Últimos 30 dias", end.AddDays(-30), end),
            "90d" => new Period("90d", "Últimos 90 dias", end.AddDays(-90), end),
            "12m" => new Period("12m", "Últimos 12 meses", end.AddMonths(-12), end),
            _ => new Period("6m", "Últimos 6 meses", end.AddMonths(-6), end)
        };
    }

    private Guid GetCompanyId()
    {
        var value = User.FindFirstValue("companyId");
        return Guid.TryParse(value, out var id)
            ? id
            : throw new UnauthorizedAccessException("Token sem empresa válida.");
    }

    private static bool IsBetween(DateTime? value, DateTime start, DateTime end)
        => value.HasValue && value.Value >= start && value.Value <= end;

    private static decimal CalculatePercentChange(decimal current, decimal previous)
    {
        if (previous == 0)
        {
            return current == 0 ? 0 : 100;
        }

        return Math.Round((current - previous) / previous * 100m, 1);
    }

    private static string Csv(string value)
        => "\"" + value.Replace("\"", "\"\"") + "\"";

    private static string StatusLabel(string status) => status switch
    {
        "IN_PROGRESS" => "Em andamento",
        "WAITING" => "Aguardando",
        "DONE" => "Finalizada",
        _ => "Nova"
    };

    private static string PriorityLabel(string priority) => priority switch
    {
        "LOW" => "Baixa",
        "HIGH" => "Alta",
        "URGENT" => "Urgente",
        _ => "Normal"
    };

    private sealed record Period(string Range, string Label, DateTime StartUtc, DateTime EndUtc);
    private sealed record Bucket(string Key, string Label, DateTime StartUtc, DateTime EndUtc);
    private sealed record OrderRow(
        Guid Id,
        Guid CustomerId,
        string CustomerName,
        string Number,
        string Title,
        string Status,
        decimal EstimatedValue,
        DateTime CreatedAtUtc,
        DateTime? CompletedAtUtc);
    private sealed record ProductRow(
        Guid Id,
        string Sku,
        string Name,
        string Unit,
        decimal CostPrice,
        decimal SalePrice,
        decimal CurrentStock,
        decimal MinimumStock);
    private sealed record MovementRow(
        Guid ProductId,
        string Sku,
        string ProductName,
        string Unit,
        decimal Quantity,
        DateTime CreatedAtUtc);
}
