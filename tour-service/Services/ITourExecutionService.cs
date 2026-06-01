using TourService.DTOs;

namespace TourService.Services;

public interface ITourExecutionService
{
    Task<TourExecutionResponse?> StartTourExecutionAsync(string tourId, string touristUsername, double latitude, double longitude, string bearerToken, CancellationToken cancellationToken);

    Task<TourExecutionResponse?> GetExecutionAsync(string executionId, string touristUsername, CancellationToken cancellationToken);

    Task<TourExecutionCheckResponse?> CheckNearbyKeyPointAsync(string executionId, string touristUsername, double latitude, double longitude, CancellationToken cancellationToken);

    Task<TourExecutionResponse?> CompleteTourExecutionAsync(string executionId, string touristUsername, double latitude, double longitude, bool force, CancellationToken cancellationToken);

    Task<TourExecutionResponse?> AbandonTourExecutionAsync(string executionId, string touristUsername, double latitude, double longitude, CancellationToken cancellationToken);
}