using TourService.Models;

namespace TourService.Repositories;

public interface ITourRepository
{
    Task CreateAsync(Tour tour, CancellationToken cancellationToken);

    Task<List<Tour>> GetAllAsync(CancellationToken cancellationToken);

    Task<List<Tour>> GetByAuthorAsync(string authorUsername, CancellationToken cancellationToken);

    Task<Tour?> GetByIdAsync(string id, CancellationToken cancellationToken);

    Task<Tour?> GetByIdAndAuthorAsync(string id, string authorUsername, CancellationToken cancellationToken);

    Task<Tour?> AddKeyPointAsync(string id, string authorUsername, KeyPoint keyPoint, CancellationToken cancellationToken);

    Task<Tour?> AddReviewAsync(string tourId, Review review, CancellationToken cancellationToken);
}
