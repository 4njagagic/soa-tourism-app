using TourService.Models;

namespace TourService.Repositories;

public interface IUserPositionRepository
{
    Task<UserPosition?> GetByUsernameAsync(string username, CancellationToken cancellationToken);
    Task UpsertAsync(UserPosition position, CancellationToken cancellationToken);
}