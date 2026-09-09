namespace FlowDesk.Api.Domain.Services;

public sealed record OrderItemPricingResult(
    bool IsValid,
    decimal Gross,
    decimal Discount,
    decimal Total,
    string? Error);

public static class OrderItemPricing
{
    public static OrderItemPricingResult Calculate(
        decimal quantity,
        decimal unitPrice,
        decimal discountAmount)
    {
        if (quantity <= 0)
        {
            return Invalid("Informe uma quantidade maior que zero.");
        }

        if (unitPrice < 0)
        {
            return Invalid("Informe um preço unitário válido.");
        }

        if (discountAmount < 0)
        {
            return Invalid("Informe um desconto válido.");
        }

        var gross = RoundMoney(quantity * unitPrice);

        if (discountAmount > gross)
        {
            return new OrderItemPricingResult(
                false,
                gross,
                discountAmount,
                0m,
                "O desconto não pode ser maior que o valor bruto do item.");
        }

        var total = RoundMoney(gross - discountAmount);

        return new OrderItemPricingResult(
            true,
            gross,
            discountAmount,
            total,
            null);
    }

    private static decimal RoundMoney(decimal value)
        => decimal.Round(value, 2, MidpointRounding.AwayFromZero);

    private static OrderItemPricingResult Invalid(string error)
        => new(false, 0m, 0m, 0m, error);
}
