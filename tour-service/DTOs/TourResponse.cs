using TourService.Models;

namespace TourService.DTOs;

public record KeyPointResponse(
    string Id,
    string Name,
    string Description,
    double Latitude,
    double Longitude,
    string ImageUrl,
    DateTime CreatedAt);

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
            tour.KeyPoints.Select(kp => new KeyPointResponse(
                kp.Id,
                kp.Name,
                kp.Description,
                kp.Latitude,
                kp.Longitude,
                kp.ImageUrl,
                kp.CreatedAt)).ToList(),
            tour.Reviews.Select(r => new ReviewResponse(
                r.Id, r.Rating, r.Comment, r.TouristUsername, r.VisitDate, r.CommentDate, r.Images)).ToList(),
            tour.CreatedAt,
            tour.UpdatedAt);
    }
}
