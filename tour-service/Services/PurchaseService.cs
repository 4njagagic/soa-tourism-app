using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace TourService.Services;

public interface IPurchaseService
{
    Task<bool> HasPurchasedAsync(string tourId, string bearerToken, CancellationToken cancellationToken);
}

public class PurchaseService : IPurchaseService
{
    private readonly IHttpClientFactory _httpClientFactory;

    public PurchaseService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<bool> HasPurchasedAsync(string tourId, string bearerToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(bearerToken))
        {
            return false;
        }

        var client = _httpClientFactory.CreateClient("purchase");
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"cart/purchases/{Uri.EscapeDataString(tourId)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        try
        {
            using var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return false;
            }

            var payload = await response.Content.ReadFromJsonAsync<PurchaseCheckResponse>(cancellationToken);
            return payload?.Purchased == true;
        }
        catch
        {
            return false;
        }
    }

    private sealed record PurchaseCheckResponse(bool Purchased);
}
