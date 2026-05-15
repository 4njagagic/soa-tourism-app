using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace TourService.Auth;

public class AuthService : IAuthService
{
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public AuthService(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<AuthenticatedAuthor?> RequireGuideAsync(HttpRequest request, CancellationToken cancellationToken)
    {
        var token = ExtractBearerToken(request);
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var username = ValidateTokenAndGetUsername(token);
        if (string.IsNullOrWhiteSpace(username))
        {
            return null;
        }

        var profile = await GetStakeholderProfileAsync(username, token, cancellationToken);
        if (profile is null || !profile.Enabled || !string.Equals(profile.Role, "GUIDE", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return new AuthenticatedAuthor(username);
    }

    public async Task<AuthenticatedAuthor?> RequireAuthenticatedAsync(HttpRequest request, CancellationToken cancellationToken)
    {
        var token = ExtractBearerToken(request);
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var username = ValidateTokenAndGetUsername(token);
        if (string.IsNullOrWhiteSpace(username))
        {
            return null;
        }

        var profile = await GetStakeholderProfileAsync(username, token, cancellationToken);
        if (profile is null || !profile.Enabled)
        {
            return null;
        }

        return new AuthenticatedAuthor(username);
    }

    private static string? ExtractBearerToken(HttpRequest request)
    {
        var authorization = request.Headers.Authorization.ToString();
        const string prefix = "Bearer ";
        if (string.IsNullOrWhiteSpace(authorization) || !authorization.StartsWith(prefix, StringComparison.Ordinal))
        {
            return null;
        }

        return authorization[prefix.Length..].Trim();
    }

    private string? ValidateTokenAndGetUsername(string token)
    {
        var secret = _configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            return null;
        }

        var handler = new JwtSecurityTokenHandler();
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ValidAlgorithms = [SecurityAlgorithms.HmacSha512],
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        try
        {
            var principal = handler.ValidateToken(token, validationParameters, out _);
            return principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        }
        catch
        {
            return null;
        }
    }

    private async Task<StakeholderProfile?> GetStakeholderProfileAsync(string username, string token, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("stakeholders");
        using var request = new HttpRequestMessage(HttpMethod.Get, $"users/profile/{Uri.EscapeDataString(username)}");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        using var response = await client.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        return await response.Content.ReadFromJsonAsync<StakeholderProfile>(cancellationToken);
    }
}
