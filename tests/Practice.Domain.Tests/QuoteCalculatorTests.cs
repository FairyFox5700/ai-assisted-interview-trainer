using Practice.Domain;

namespace Practice.Domain.Tests;

public sealed class QuoteCalculatorTests
{
    private readonly QuoteCalculator _calculator = new();

    [Fact]
    public void Save10_discounts_merchandise_but_not_shipping()
    {
        var quote = _calculator.Calculate(
            [new BasketLine("BOOK", 2, 20m)], 10m, "SAVE10");

        Assert.Equal(40m, quote.Subtotal);
        Assert.Equal(4m, quote.Discount);
        Assert.Equal(10m, quote.Shipping);
        Assert.Equal(46m, quote.Total);
        Assert.Contains("save10", quote.AppliedRules);
    }

    [Theory]
    [InlineData(2, 0)]
    [InlineData(3, 3)]
    [InlineData(4, 4)]
    public void Bulk5_applies_only_when_a_single_sku_reaches_three(int quantity, decimal expectedDiscount)
    {
        var quote = _calculator.Calculate(
            [new BasketLine("MUG", quantity, 20m)], 0m, "BULK5");

        Assert.Equal(expectedDiscount, quote.Discount);
    }

    [Fact]
    public void Bulk5_discount_is_capped_at_fifteen()
    {
        var quote = _calculator.Calculate(
            [new BasketLine("LAPTOP", 3, 200m)], 0m, "BULK5");

        Assert.Equal(15m, quote.Discount);
        Assert.Equal(585m, quote.Total);
    }

    [Fact]
    public void Bulk5_threshold_is_per_sku_not_total_quantity()
    {
        var quote = _calculator.Calculate(
            [new BasketLine("A", 2, 10m), new BasketLine("B", 2, 10m)], 0m, "BULK5");

        Assert.Equal(0m, quote.Discount);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(100)]
    public void Quantity_outside_one_to_ninety_nine_is_rejected(int quantity)
    {
        var error = Assert.Throws<QuoteValidationException>(() =>
            _calculator.Calculate([new BasketLine("SKU", quantity, 10m)], 0m, null));

        Assert.Equal("invalid_quantity", error.Code);
    }

    [Fact]
    public void Empty_basket_is_rejected()
    {
        var error = Assert.Throws<QuoteValidationException>(() =>
            _calculator.Calculate([], 0m, null));

        Assert.Equal("empty_basket", error.Code);
    }

    [Fact]
    public void Money_is_rounded_to_two_decimals_away_from_zero()
    {
        var quote = _calculator.Calculate(
            [new BasketLine("ODD", 3, 3.35m)], 0m, "BULK5");

        Assert.Equal(0.50m, quote.Discount);
        Assert.Equal(9.55m, quote.Total);
    }
}
