using Xunit;
using FlowDesk.Api.Domain.Services;

namespace FlowDesk.Api.Tests;

public sealed class OrderItemPricingTests
{
    [Fact]
    public void Calculate_ShouldReturnGrossDiscountAndTotal()
    {
        var result = OrderItemPricing.Calculate(2m, 289.90m, 10m);

        Assert.True(result.IsValid);
        Assert.Equal(579.80m, result.Gross);
        Assert.Equal(10m, result.Discount);
        Assert.Equal(569.80m, result.Total);
        Assert.Null(result.Error);
    }

    [Fact]
    public void Calculate_ShouldRoundMoneyAwayFromZero()
    {
        var result = OrderItemPricing.Calculate(3m, 10.005m, 0m);

        Assert.True(result.IsValid);
        Assert.Equal(30.02m, result.Gross);
        Assert.Equal(30.02m, result.Total);
    }

    [Fact]
    public void Calculate_ShouldRejectDiscountGreaterThanGross()
    {
        var result = OrderItemPricing.Calculate(1m, 100m, 100.01m);

        Assert.False(result.IsValid);
        Assert.Equal("O desconto não pode ser maior que o valor bruto do item.", result.Error);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Calculate_ShouldRejectNonPositiveQuantity(decimal quantity)
    {
        var result = OrderItemPricing.Calculate(quantity, 100m, 0m);

        Assert.False(result.IsValid);
        Assert.Equal("Informe uma quantidade maior que zero.", result.Error);
    }
}
