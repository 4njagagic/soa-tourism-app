using Grpc.Core;
using TourService.Services;
using TourService.DTOs;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using System;
using System.Linq;

namespace TourService.Grpc;

public class TourExecutionGrpcService : TourExecutionService.TourExecutionServiceBase
{
    private readonly ITourExecutionService _executionService;
    private readonly IConfiguration _configuration;

    public TourExecutionGrpcService(ITourExecutionService executionService, IConfiguration configuration)
    {
        _executionService = executionService;
        _configuration = configuration;
    }

    public override async Task<StartResponse> StartTourExecution(StartRequest request, ServerCallContext context)
    {
        var bearer = request.BearerToken ?? GetBearerFromMetadata(context);
        var touristUsername = request.TouristUsername;
        if (string.IsNullOrWhiteSpace(touristUsername))
        {
            touristUsername = ExtractUsernameFromToken(bearer);
        }

        var execution = await _executionService.StartTourExecutionAsync(
            request.TourId,
            touristUsername ?? string.Empty,
            request.Latitude,
            request.Longitude,
            bearer ?? string.Empty,
            context.CancellationToken);

        return new StartResponse { Execution = MapExecution(execution) };
    }

    public override async Task<CheckResponse> CheckNearbyKeyPoint(CheckRequest request, ServerCallContext context)
    {
        var touristUsername = request.TouristUsername;
        if (string.IsNullOrWhiteSpace(touristUsername))
        {
            var bearer = GetBearerFromMetadata(context);
            touristUsername = ExtractUsernameFromToken(bearer);
        }

        var result = await _executionService.CheckNearbyKeyPointAsync(
            request.ExecutionId,
            touristUsername ?? string.Empty,
            request.Latitude,
            request.Longitude,
            context.CancellationToken);

        var response = new CheckResponse { Execution = MapExecution(result?.Execution) };
        if (result is not null)
        {
            response.MatchedKeyPoint = result.MatchedKeyPoint;
            if (result.CompletedKeyPoint is not null)
            {
                response.CompletedKeyPoint = new TourExecutionKeyPointProgress
                {
                    KeyPointId = result.CompletedKeyPoint.KeyPointId,
                    KeyPointName = result.CompletedKeyPoint.KeyPointName,
                    Order = result.CompletedKeyPoint.Order,
                    Latitude = result.CompletedKeyPoint.Latitude,
                    Longitude = result.CompletedKeyPoint.Longitude,
                    DistanceKm = (double)result.CompletedKeyPoint.DistanceKm,
                    CompletedAt = result.CompletedKeyPoint.CompletedAt.ToString("o")
                };
            }
            if (result.DistanceKm.HasValue)
            {
                response.DistanceKm = result.DistanceKm.Value;
            }
        }

        return response;
    }

    private string? GetBearerFromMetadata(ServerCallContext context)
    {
        var authEntry = context.RequestHeaders.FirstOrDefault(e => e.Key == "authorization")?.Value;
        if (string.IsNullOrWhiteSpace(authEntry)) return null;
        const string prefix = "Bearer ";
        return authEntry.StartsWith(prefix) ? authEntry[prefix.Length..].Trim() : authEntry.Trim();
    }

    private string? ExtractUsernameFromToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        var secret = _configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(secret)) return null;

        var handler = new JwtSecurityTokenHandler();
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha512 },
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        try
        {
            var principal = handler.ValidateToken(token, validationParameters, out _);
            return principal.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        }
        catch
        {
            return null;
        }
    }

    private static TourExecution MapExecution(TourExecutionResponse? dto)
    {
        if (dto is null) return null;

        var proto = new TourExecution
        {
            Id = dto.Id,
            TourId = dto.TourId,
            TourName = dto.TourName,
            TouristUsername = dto.TouristUsername,
            Status = dto.Status.ToString(),
            StartedLatitude = dto.StartedLatitude,
            StartedLongitude = dto.StartedLongitude,
            FinishedLatitude = dto.FinishedLatitude ?? 0,
            FinishedLongitude = dto.FinishedLongitude ?? 0,
            TotalKeyPoints = dto.TotalKeyPoints,
            StartedAt = dto.StartedAt.ToString("o"),
            LastActivityAt = dto.LastActivityAt.ToString("o"),
            FinishedAt = dto.FinishedAt?.ToString("o") ?? string.Empty
        };

        foreach (var kp in dto.CompletedKeyPoints)
        {
            proto.CompletedKeyPoints.Add(new TourExecutionKeyPointProgress
            {
                KeyPointId = kp.KeyPointId,
                KeyPointName = kp.KeyPointName,
                Order = kp.Order,
                Latitude = kp.Latitude,
                Longitude = kp.Longitude,
                DistanceKm = (double)kp.DistanceKm,
                CompletedAt = kp.CompletedAt.ToString("o")
            });
        }

        return proto;
    }
}
