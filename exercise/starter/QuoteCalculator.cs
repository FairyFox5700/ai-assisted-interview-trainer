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

// Deliberately incomplete interview starter. The project still builds and runs.
public sealed class QuoteCalculator
{
    public QuoteResult Calculate(
        IReadOnlyCollection<BasketLine> lines,
        decimal shipping,
        string? promotionCode)
    {
        if (lines.Count == 0)
        {
            throw new QuoteValidationException("empty_basket", "At least one basket line is required.");
        }

        var subtotal = decimal.Round(lines.Sum(line => line.Quantity * line.UnitPrice), 2);
        var discount = 0m;
        var rules = new List<string>();

        if (string.Equals(promotionCode, "SAVE10", StringComparison.OrdinalIgnoreCase))
        {
            // BUG: shipping must not be part of the discount base.
            discount = decimal.Round((subtotal + shipping) * 0.10m, 2);
            rules.Add("save10");
        }

        // TODO: implement BULK5 and its cap.
        return new QuoteResult(subtotal, discount, shipping, subtotal - discount + shipping, rules);
    }
}
