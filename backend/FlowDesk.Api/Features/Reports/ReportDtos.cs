namespace FlowDesk.Api.Features.Reports;

public sealed record ReportPeriodResponse(string Range, string Label, DateTime StartUtc, DateTime EndUtc);

public sealed record ReportKpisResponse(
    decimal Revenue,
    decimal RevenueChangePercent,
    int OrdersCreated,
    int CompletedOrders,
    decimal CompletionRate,
    decimal AverageTicket,
    int OpenOrders,
    decimal OpenPipeline,
    int ActiveCustomers,
    decimal AverageLeadTimeHours);

public sealed record RevenueTrendPointResponse(
    string Key,
    string Label,
    DateTime StartUtc,
    DateTime EndUtc,
    decimal Revenue,
    int OrdersCreated,
    int CompletedOrders);

public sealed record OrderStatusBreakdownResponse(string Status, string Label, int Count, decimal Value);

public sealed record TopCustomerResponse(
    Guid CustomerId,
    string CustomerName,
    int CompletedOrders,
    decimal Revenue,
    decimal SharePercent);

public sealed record InventoryAnalyticsResponse(
    int ActiveProducts,
    int LowStockProducts,
    int OutOfStockProducts,
    decimal CostValue,
    decimal SaleValue,
    decimal PotentialMargin,
    int MovementsInPeriod);

public sealed record TopMovedProductResponse(
    Guid ProductId,
    string Sku,
    string ProductName,
    string Unit,
    decimal MovedQuantity,
    int Movements,
    decimal CurrentStock);

public sealed record RecentCompletedOrderResponse(
    Guid Id,
    string Number,
    string Title,
    string CustomerName,
    decimal Value,
    DateTime CompletedAtUtc);

public sealed record ReportsOverviewResponse(
    ReportPeriodResponse Period,
    ReportKpisResponse Kpis,
    IReadOnlyList<RevenueTrendPointResponse> RevenueTrend,
    IReadOnlyList<OrderStatusBreakdownResponse> OrdersByStatus,
    IReadOnlyList<TopCustomerResponse> TopCustomers,
    InventoryAnalyticsResponse Inventory,
    IReadOnlyList<TopMovedProductResponse> TopMovedProducts,
    IReadOnlyList<RecentCompletedOrderResponse> RecentCompletedOrders);
