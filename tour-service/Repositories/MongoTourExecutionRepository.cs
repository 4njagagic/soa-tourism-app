using Microsoft.Extensions.Options;
using MongoDB.Driver;
using TourService.Models;
using TourService.Services;

namespace TourService.Repositories;

public class MongoTourExecutionRepository : ITourExecutionRepository
{
    private readonly IMongoCollection<TourExecution> _executions;

    public MongoTourExecutionRepository(IOptions<TourDatabaseSettings> settings)
    {
        var mongoClient = new MongoClient(settings.Value.ConnectionString);
        var mongoDatabase = mongoClient.GetDatabase(settings.Value.DatabaseName);
        _executions = mongoDatabase.GetCollection<TourExecution>("tour_executions");
    }

    public async Task CreateAsync(TourExecution execution, CancellationToken cancellationToken)
    {
        await _executions.InsertOneAsync(execution, cancellationToken: cancellationToken);
    }

    public async Task<TourExecution?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        return await _executions.Find(execution => execution.Id == id).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<TourExecution?> GetActiveByTourAndUserAsync(string tourId, string touristUsername, CancellationToken cancellationToken)
    {
        return await _executions
            .Find(execution =>
                execution.TourId == tourId &&
                execution.TouristUsername == touristUsername &&
                execution.Status == TourExecutionStatus.Active)
            .SortByDescending(execution => execution.StartedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<TourExecution?> UpdateAsync(TourExecution execution, CancellationToken cancellationToken)
    {
        var result = await _executions.ReplaceOneAsync(
            current => current.Id == execution.Id,
            execution,
            new ReplaceOptions { IsUpsert = false },
            cancellationToken);

        return result.IsAcknowledged ? execution : null;
    }
}