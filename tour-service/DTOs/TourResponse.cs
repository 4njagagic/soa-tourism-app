using TourService.Models;

namespace TourService.DTOs;

public record KeyPointResponse(
    string Id,
    string Name,
    string Description,
    double Latitude,
    double Longitude,
    int Order,
    decimal DistanceFromPreviousKm,
    string ImageUrl,
    DateTime CreatedAt);

public record TransportTimeResponse(
    string Id,
    TransportType Type,
    int DurationMinutes);

public record ReviewResponse(
    string Id,
    int Rating,
    string Comment,
    string TouristUsername,
    DateTime VisitDate,
    DateTime CommentDate,
    List<string> Images);
    
public record TourResponse(
    string Id,
    string Name,
    string Description,
    string Difficulty,
    List<string> Tags,
    TourStatus Status,
    decimal Price,
    string AuthorUsername,
    List<KeyPointResponse> KeyPoints,
    List<TransportTimeResponse> TransportTimes,
    decimal TotalDistanceKm,
    DateTime? PublishedAt,
    DateTime? ArchivedAt,
    List<ReviewResponse> Reviews,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static TourResponse FromTour(Tour tour)
    {
        return new TourResponse(
            tour.Id ?? string.Empty,
            tour.Name,
            tour.Description,
            tour.Difficulty,
            tour.Tags,
            tour.Status,
            tour.Price,
            tour.AuthorUsername,
            tour.KeyPoints.OrderBy(kp => kp.Order).Select(kp => new KeyPointResponse(
                kp.Id,
                kp.Name,
                kp.Description,
                kp.Latitude,
                kp.Longitude,
                kp.Order,
                kp.DistanceFromPreviousKm,
                kp.ImageUrl,
                kp.CreatedAt)).ToList(),
            tour.TransportTimes.Select(tt => new TransportTimeResponse(tt.Id, tt.Type, tt.DurationMinutes)).ToList(),
            tour.TotalDistanceKm,
            tour.PublishedAt,
            tour.ArchivedAt,
            tour.Reviews.Select(r => new ReviewResponse(
                r.Id, r.Rating, r.Comment, r.TouristUsername, r.VisitDate, r.CommentDate, r.Images)).ToList(),
            tour.CreatedAt,
            tour.UpdatedAt);
    }
}

public record TourTouristResponse(
    string Id,
    string Name,
    string Description,
    string Difficulty,
    List<string> Tags,
    TourStatus Status,
    decimal Price,
    string AuthorUsername,
    List<KeyPointResponse> KeyPoints,
    List<TransportTimeResponse> TransportTimes,
    decimal TotalDistanceKm,
    DateTime? PublishedAt,
    DateTime? ArchivedAt,
    List<ReviewResponse> Reviews,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static TourTouristResponse FromResponse(TourResponse tour)
    {
        var firstPoints = tour.KeyPoints.OrderBy(kp => kp.Order).Take(1).ToList();
        return new TourTouristResponse(
            tour.Id,
            tour.Name,
            tour.Description,
            tour.Difficulty,
            tour.Tags,
            tour.Status,
            tour.Price,
            tour.AuthorUsername,
            firstPoints,
            tour.TransportTimes,
            tour.TotalDistanceKm,
            tour.PublishedAt,
            tour.ArchivedAt,
            tour.Reviews,
            tour.CreatedAt,
            tour.UpdatedAt);
    }
}
