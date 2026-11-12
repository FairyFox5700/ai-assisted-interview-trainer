namespace Practice.Domain;

public sealed record BasketLine(string Sku, int Quantity, decimal UnitPrice);

public sealed record QuoteResult(
    decimal Subtotal,
    decimal Discount,
    decimal Shipping,
    decimal Total,
    IReadOnlyList<string> AppliedRules);

public sealed class QuoteValidationException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

public sealed class QuoteCalculator
{
    public QuoteResult Calculate(
        IReadOnlyCollection<BasketLine> lines,
        decimal shipping,
        string? promotionCode)
    {
        Validate(lines, shipping);

        var subtotal = Money(lines.Sum(line => line.Quantity * line.UnitPrice));
        var normalizedCode = promotionCode?.Trim().ToUpperInvariant();
        var discount = 0m;
        var appliedRules = new List<string>();

        switch (normalizedCode)
        {
            case "SAVE10":
                discount = Money(subtotal * 0.10m);
                appliedRules.Add("save10");
                break;
            case "BULK5":
                var eligibleSubtotal = lines
                    .Where(line => line.Quantity >= 3)
                    .Sum(line => line.Quantity * line.UnitPrice);
                discount = Math.Min(15m, Money(eligibleSubtotal * 0.05m));
                if (discount > 0)
                {
                    appliedRules.Add("bulk5");
                }
                break;
            case null or "":
                break;
            default:
                throw new QuoteValidationException(
                    "unknown_promotion", $"Promotion code '{promotionCode}' is not supported.");
        }

        return new QuoteResult(
            subtotal,
            discount,
            Money(shipping),
            Money(subtotal - discount + shipping),
            appliedRules);
    }

    private static void Validate(IReadOnlyCollection<BasketLine> lines, decimal shipping)
    {
        if (lines.Count == 0)
        {
            throw new QuoteValidationException("empty_basket", "At least one basket line is required.");
        }

        if (shipping < 0)
        {
            throw new QuoteValidationException("invalid_shipping", "Shipping cannot be negative.");
        }

        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line.Sku))
            {
                throw new QuoteValidationException("invalid_sku", "Every basket line requires a SKU.");
            }

            if (line.Quantity is < 1 or > 99)
            {
                throw new QuoteValidationException("invalid_quantity", "Quantity must be between 1 and 99.");
            }

            if (line.UnitPrice < 0)
            {
                throw new QuoteValidationException("invalid_price", "Unit price cannot be negative.");
            }
        }
    }

    private static decimal Money(decimal value) =>
        decimal.Round(value, 2, MidpointRounding.AwayFromZero);
}
