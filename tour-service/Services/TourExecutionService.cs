using TourService.DTOs;
using TourService.Models;
using TourService.Repositories;

namespace TourService.Services;

public class TourExecutionService : ITourExecutionService
{
    private const decimal NearbyThresholdKm = 0.05m;

    private readonly ITourRepository _tourRepository;
    private readonly ITourExecutionRepository _executionRepository;
    private readonly IPurchaseService _purchaseService;

    public TourExecutionService(ITourRepository tourRepository, ITourExecutionRepository executionRepository, IPurchaseService purchaseService)
    {
        _tourRepository = tourRepository;
        _executionRepository = executionRepository;
        _purchaseService = purchaseService;
    }

    public async Task<TourExecutionResponse?> StartTourExecutionAsync(string tourId, string touristUsername, double latitude, double longitude, string bearerToken, CancellationToken cancellationToken)
    {
        var tour = await _tourRepository.GetByIdAsync(tourId, cancellationToken);
        if (tour is null)
        {
            return null;
        }

        if (tour.Status == TourStatus.Draft)
        {
            throw new InvalidOperationException("Draft tours cannot be started.");
        }

        if (tour.KeyPoints.Count == 0)
        {
            throw new InvalidOperationException("Tour must contain key points before it can be started.");
        }

        var isPurchased = await _purchaseService.HasPurchasedAsync(tourId, bearerToken, cancellationToken);
        if (!isPurchased)
        {
            throw new InvalidOperationException("Tour must be purchased before it can be started.");
        }

        var existingExecution = await _executionRepository.GetActiveByTourAndUserAsync(tourId, touristUsername, cancellationToken);
        if (existingExecution is not null)
        {
            return TourExecutionResponse.FromExecution(existingExecution);
        }

        var now = DateTime.UtcNow;
        var execution = new TourExecution
        {
            TourId = tour.Id ?? tourId,
            TourName = tour.Name,
            TouristUsername = touristUsername,
            Status = TourExecutionStatus.Active,
            StartedLatitude = latitude,
            StartedLongitude = longitude,
            TotalKeyPoints = tour.KeyPoints.Count,
            StartedAt = now,
            LastActivityAt = now
        };

        await _executionRepository.CreateAsync(execution, cancellationToken);
        return TourExecutionResponse.FromExecution(execution);
    }

    public async Task<TourExecutionResponse?> GetExecutionAsync(string executionId, string touristUsername, CancellationToken cancellationToken)
    {
        var execution = await _executionRepository.GetByIdAsync(executionId, cancellationToken);
        if (execution is null || !string.Equals(execution.TouristUsername, touristUsername, StringComparison.Ordinal))
        {
            return null;
        }

        return TourExecutionResponse.FromExecution(execution);
    }

    public async Task<TourExecutionCheckResponse?> CheckNearbyKeyPointAsync(string executionId, string touristUsername, double latitude, double longitude, CancellationToken cancellationToken)
    {
        var execution = await _executionRepository.GetByIdAsync(executionId, cancellationToken);
        if (execution is null || !string.Equals(execution.TouristUsername, touristUsername, StringComparison.Ordinal))
        {
            return null;
        }

        if (execution.Status != TourExecutionStatus.Active)
        {
            return new TourExecutionCheckResponse(TourExecutionResponse.FromExecution(execution), false, null, null);
        }

        var tour = await _tourRepository.GetByIdAsync(execution.TourId, cancellationToken);
        if (tour is null)
        {
            throw new InvalidOperationException("Tour not found.");
        }

        var completedIds = execution.CompletedKeyPoints.Select(point => point.KeyPointId).ToHashSet(StringComparer.Ordinal);
        var nearest = tour.KeyPoints
            .Where(point => !completedIds.Contains(point.Id))
            .Select(point => new
            {
                KeyPoint = point,
                DistanceKm = CalculateDistanceKm(latitude, longitude, point.Latitude, point.Longitude)
            })
            .OrderBy(candidate => candidate.DistanceKm)
            .FirstOrDefault();

        TourExecutionKeyPointProgressResponse? completedPoint = null;
        double? distanceKm = null;
        var now = DateTime.UtcNow;

        if (nearest is not null)
        {
            distanceKm = (double)nearest.DistanceKm;
            if (nearest.DistanceKm <= NearbyThresholdKm)
            {
                var progress = new TourExecutionKeyPointProgress
                {
                    KeyPointId = nearest.KeyPoint.Id,
                    KeyPointName = nearest.KeyPoint.Name,
                    Order = nearest.KeyPoint.Order,
                    Latitude = nearest.KeyPoint.Latitude,
                    Longitude = nearest.KeyPoint.Longitude,
                    DistanceKm = nearest.DistanceKm,
                    CompletedAt = now
                };

                execution.CompletedKeyPoints.Add(progress);
                completedPoint = new TourExecutionKeyPointProgressResponse(
                    progress.KeyPointId,
                    progress.KeyPointName,
                    progress.Order,
                    progress.Latitude,
                    progress.Longitude,
                    progress.DistanceKm,
                    progress.CompletedAt);
            }
        }

        execution.LastActivityAt = now;

        if (execution.CompletedKeyPoints.Count >= execution.TotalKeyPoints)
        {
            MarkFinished(execution, TourExecutionStatus.Completed, latitude, longitude, now);
        }

        var updated = await _executionRepository.UpdateAsync(execution, cancellationToken);
        if (updated is null)
        {
            return null;
        }

        return new TourExecutionCheckResponse(
            TourExecutionResponse.FromExecution(updated),
            completedPoint is not null,
            completedPoint,
            distanceKm);
    }

    public async Task<TourExecutionResponse?> CompleteTourExecutionAsync(string executionId, string touristUsername, double latitude, double longitude, bool force, CancellationToken cancellationToken)
    {
        var execution = await _executionRepository.GetByIdAsync(executionId, cancellationToken);
        if (execution is null || !string.Equals(execution.TouristUsername, touristUsername, StringComparison.Ordinal))
        {
            return null;
        }

        if (execution.Status != TourExecutionStatus.Active)
        {
            return TourExecutionResponse.FromExecution(execution);
        }

        if (!force && execution.CompletedKeyPoints.Count < execution.TotalKeyPoints)
        {
            throw new InvalidOperationException("All key points must be completed before finishing the tour.");
        }

        MarkFinished(execution, TourExecutionStatus.Completed, latitude, longitude, DateTime.UtcNow);
        var updated = await _executionRepository.UpdateAsync(execution, cancellationToken);
        return updated is null ? null : TourExecutionResponse.FromExecution(updated);
    }

    public async Task<TourExecutionResponse?> AbandonTourExecutionAsync(string executionId, string touristUsername, double latitude, double longitude, CancellationToken cancellationToken)
    {
        var execution = await _executionRepository.GetByIdAsync(executionId, cancellationToken);
        if (execution is null || !string.Equals(execution.TouristUsername, touristUsername, StringComparison.Ordinal))
        {
            return null;
        }

        if (execution.Status != TourExecutionStatus.Active)
        {
            return TourExecutionResponse.FromExecution(execution);
        }

        MarkFinished(execution, TourExecutionStatus.Abandoned, latitude, longitude, DateTime.UtcNow);
        var updated = await _executionRepository.UpdateAsync(execution, cancellationToken);
        return updated is null ? null : TourExecutionResponse.FromExecution(updated);
    }

    private static void MarkFinished(TourExecution execution, TourExecutionStatus status, double latitude, double longitude, DateTime finishedAt)
    {
        execution.Status = status;
        execution.FinishedLatitude = latitude;
        execution.FinishedLongitude = longitude;
        execution.FinishedAt = finishedAt;
        execution.LastActivityAt = finishedAt;
    }

    private static decimal CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double EarthRadiusKm = 6371.0;

        static double ToRadians(double degrees) => degrees * Math.PI / 180.0;

        var latRad1 = ToRadians(lat1);
        var lonRad1 = ToRadians(lon1);
        var latRad2 = ToRadians(lat2);
        var lonRad2 = ToRadians(lon2);
        var dLat = latRad2 - latRad1;
        var dLon = lonRad2 - lonRad1;

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(latRad1) * Math.Cos(latRad2)
              * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return (decimal)(EarthRadiusKm * c);
    }
}