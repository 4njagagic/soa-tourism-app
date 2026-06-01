using TourService.Models;

namespace TourService.Repositories;

public interface ITourExecutionRepository
{
    Task CreateAsync(TourExecution execution, CancellationToken cancellationToken);

    Task<TourExecution?> GetByIdAsync(string id, CancellationToken cancellationToken);

    Task<TourExecution?> GetActiveByTourAndUserAsync(string tourId, string touristUsername, CancellationToken cancellationToken);

    Task<TourExecution?> UpdateAsync(TourExecution execution, CancellationToken cancellationToken);
}