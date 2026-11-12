using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Practice.Api.Tests;

public sealed class PracticeApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public PracticeApiTests(WebApplicationFactory<Program> factory) =>
        _client = factory.CreateClient();

    [Fact]
    public async Task Health_reports_ready_and_contract_version()
    {
        var response = await _client.GetAsync("/health");
        var body = await response.Content.ReadFromJsonAsync<HealthResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ready", body?.Status);
        Assert.Equal("1.0", body?.ContractVersion);
    }

    [Fact]
    public async Task Quote_endpoint_uses_real_domain_rules()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/quotes", new
        {
            lines = new[] { new { sku = "BOOK", quantity = 2, unitPrice = 20m } },
            shipping = 10m,
            promotionCode = "SAVE10"
        });
        var body = await response.Content.ReadFromJsonAsync<QuoteResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(46m, body?.Total);
        Assert.Equal(4m, body?.Discount);
    }

    [Fact]
    public async Task Invalid_quote_returns_problem_details_with_stable_code()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/quotes", new
        {
            lines = Array.Empty<object>(),
            shipping = 0m
        });
        var body = await response.Content.ReadFromJsonAsync<ProblemResponse>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("empty_basket", body?.Code);
    }

    [Fact]
    public async Task Scenario_has_five_stages_totaling_sixty_minutes()
    {
        var scenario = await _client.GetFromJsonAsync<ScenarioResponse>("/api/trainer/scenario");

        Assert.Equal(5, scenario?.Stages.Length);
        Assert.Equal(60, scenario?.Stages.Sum(stage => stage.Minutes));
    }

    [Fact]
    public async Task Known_checkpoint_returns_deterministic_evidence()
    {
        var first = await _client.PostAsync("/api/trainer/checkpoints/save10", null);
        var second = await _client.PostAsync("/api/trainer/checkpoints/save10", null);

        var firstBody = await first.Content.ReadAsStringAsync();
        var secondBody = await second.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(firstBody, secondBody);
        Assert.Contains("save10_merchandise_only", firstBody);
    }

    private sealed record HealthResponse(string Status, string ContractVersion);
    private sealed record QuoteResponse(decimal Discount, decimal Total);
    private sealed record ProblemResponse(string Code);
    private sealed record ScenarioStage(int Minutes);
    private sealed record ScenarioResponse(ScenarioStage[] Stages);
}
