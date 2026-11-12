using Practice.Domain;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<QuoteCalculator>();

var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/health", () => Results.Ok(new
{
    status = "ready",
    contractVersion = "1.0",
    scenarioVersion = "checkout-v1"
}));

app.MapPost("/api/v1/quotes", (QuoteRequest request, QuoteCalculator calculator) =>
{
    try
    {
        var result = calculator.Calculate(
            request.Lines.Select(line => new BasketLine(line.Sku, line.Quantity, line.UnitPrice)).ToArray(),
            request.Shipping,
            request.PromotionCode);

        return Results.Ok(new QuoteResponse(
            result.Subtotal,
            result.Discount,
            result.Shipping,
            result.Total,
            result.AppliedRules));
    }
    catch (QuoteValidationException error)
    {
        return Results.BadRequest(new
        {
            type = "https://example.test/problems/invalid-quote",
            title = "Quote validation failed",
            status = 400,
            detail = error.Message,
            code = error.Code
        });
    }
});

app.MapGet("/api/trainer/scenario", () => Results.Ok(TrainerScenario.Create()));

app.MapPost("/api/trainer/checkpoints/{checkpointId}", (
    string checkpointId,
    QuoteCalculator calculator) =>
{
    var result = Checkpoints.Run(checkpointId, calculator);
    return result is null ? Results.NotFound() : Results.Ok(result);
});

app.MapFallbackToFile("index.html");
app.Run();

public partial class Program;

public sealed record QuoteLineRequest(string Sku, int Quantity, decimal UnitPrice);
public sealed record QuoteRequest(QuoteLineRequest[] Lines, decimal Shipping, string? PromotionCode);
public sealed record QuoteResponse(
    decimal Subtotal,
    decimal Discount,
    decimal Shipping,
    decimal Total,
    IReadOnlyList<string> AppliedRules);

public static class TrainerScenario
{
    public static object Create() => new
    {
        id = "checkout-v1",
        title = "Checkout Quote Service",
        subtitle = "Fix, extend, test, and explain an unfamiliar .NET codebase",
        contractVersion = "1.0",
        totalMinutes = 60,
        stages = new object[]
        {
            Stage("inspect", "Inspect", 8, "Map the request path and establish a clean baseline.",
                ["Run dotnet test", "Find the HTTP endpoint and domain owner", "Submit a baseline quote"],
                "health"),
            Stage("bug", "Bug fix", 15, "Ensure SAVE10 discounts merchandise only, never shipping.",
                ["Write a failing regression test", "Make the smallest domain change", "Run the focused test"],
                "save10"),
            Stage("feature", "Feature", 17, "Implement BULK5 for qualifying SKU lines with a $15 cap.",
                ["Threshold is per SKU", "Use decimal money", "Return the applied rule identifier"],
                "bulk5"),
            Stage("edges", "Edge cases", 10, "Harden validation and monetary boundaries.",
                ["Quantity must be 1–99", "Reject empty baskets", "Round away from zero to two decimals"],
                "validation"),
            Stage("review", "Review", 10, "Verify the full solution and prepare a concise technical walkthrough.",
                ["Run the full suite", "Inspect the diff", "Document assumptions and next steps"],
                "all")
        },
        rubric = new[]
        {
            "Requirement comprehension", "Task decomposition", "AI supervision",
            "C#/.NET implementation", "Testing strategy", "Communication", "Time management"
        }
    };

    private static object Stage(
        string id,
        string title,
        int minutes,
        string objective,
        string[] requirements,
        string checkpoint) => new { id, title, minutes, objective, requirements, checkpoint };
}

public static class Checkpoints
{
    public static object? Run(string checkpointId, QuoteCalculator calculator) => checkpointId switch
    {
        "health" => Result("health", true, ["solution_ready"]),
        "save10" => Save10(calculator),
        "bulk5" => Bulk5(calculator),
        "validation" => Validation(calculator),
        "all" => All(calculator),
        _ => null
    };

    private static object Save10(QuoteCalculator calculator)
    {
        var quote = calculator.Calculate([new BasketLine("BOOK", 2, 20m)], 10m, "SAVE10");
        return Result("save10", quote.Discount == 4m && quote.Total == 46m,
            ["save10_merchandise_only", "shipping_not_discounted"]);
    }

    private static object Bulk5(QuoteCalculator calculator)
    {
        var threshold = calculator.Calculate([new BasketLine("MUG", 3, 20m)], 0m, "BULK5");
        var capped = calculator.Calculate([new BasketLine("LAPTOP", 3, 200m)], 0m, "BULK5");
        return Result("bulk5", threshold.Discount == 3m && capped.Discount == 15m,
            ["bulk5_threshold", "bulk5_cap"]);
    }

    private static object Validation(QuoteCalculator calculator)
    {
        var invalidQuantityRejected = false;
        try
        {
            calculator.Calculate([new BasketLine("SKU", 0, 10m)], 0m, null);
        }
        catch (QuoteValidationException error)
        {
            invalidQuantityRejected = error.Code == "invalid_quantity";
        }

        var rounded = calculator.Calculate([new BasketLine("ODD", 3, 3.35m)], 0m, "BULK5");
        return Result("validation", invalidQuantityRejected && rounded.Discount == 0.50m,
            ["quantity_bounds", "money_rounding"]);
    }

    private static object All(QuoteCalculator calculator)
    {
        var checks = new[]
        {
            ReadPassed(Save10(calculator)), ReadPassed(Bulk5(calculator)), ReadPassed(Validation(calculator))
        };
        return Result("all", checks.All(value => value), ["full_domain_probe"]);
    }

    private static bool ReadPassed(object value) =>
        (bool)(value.GetType().GetProperty("passed")?.GetValue(value) ?? false);

    private static object Result(string checkpointId, bool passed, string[] evidence) => new
    {
        checkpointId,
        status = passed ? "pass" : "fail",
        passed,
        evidence
    };
}
