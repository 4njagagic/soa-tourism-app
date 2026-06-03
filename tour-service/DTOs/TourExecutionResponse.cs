using TourService.Models;

namespace TourService.DTOs;

public record TourExecutionKeyPointProgressResponse(
    string KeyPointId,
    string KeyPointName,
    int Order,
    double Latitude,
    double Longitude,
    decimal DistanceKm,
    DateTime CompletedAt);

public record TourExecutionResponse(
    string Id,
    string TourId,
    string TourName,
    string TouristUsername,
    TourExecutionStatus Status,
    double StartedLatitude,
    double StartedLongitude,
    double? FinishedLatitude,
    double? FinishedLongitude,
    int TotalKeyPoints,
    List<TourExecutionKeyPointProgressResponse> CompletedKeyPoints,
    DateTime StartedAt,
    DateTime LastActivityAt,
    DateTime? FinishedAt)
{
    public int CompletedKeyPointsCount => CompletedKeyPoints.Count;

    public bool IsFinished => Status is TourExecutionStatus.Completed or TourExecutionStatus.Abandoned;

    public bool IsCompleted => CompletedKeyPointsCount >= TotalKeyPoints && TotalKeyPoints > 0;

    public static TourExecutionResponse FromExecution(TourExecution execution)
    {
        return new TourExecutionResponse(
            execution.Id ?? string.Empty,
            execution.TourId,
            execution.TourName,
            execution.TouristUsername,
            execution.Status,
            execution.StartedLatitude,
            execution.StartedLongitude,
            execution.FinishedLatitude,
            execution.FinishedLongitude,
            execution.TotalKeyPoints,
            execution.CompletedKeyPoints
                .OrderBy(point => point.Order)
                .Select(point => new TourExecutionKeyPointProgressResponse(
                    point.KeyPointId,
                    point.KeyPointName,
                    point.Order,
                    point.Latitude,
                    point.Longitude,
                    point.DistanceKm,
                    point.CompletedAt))
                .ToList(),
            execution.StartedAt,
            execution.LastActivityAt,
            execution.FinishedAt);
    }
}

public record TourExecutionCheckResponse(
    TourExecutionResponse Execution,
    bool MatchedKeyPoint,
    TourExecutionKeyPointProgressResponse? CompletedKeyPoint,
    double? DistanceKm);