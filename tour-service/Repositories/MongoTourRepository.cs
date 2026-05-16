using Microsoft.Extensions.Options;
using MongoDB.Driver;
using TourService.Models;
using TourService.Services;

namespace TourService.Repositories;

public class MongoTourRepository : ITourRepository
{
    private readonly IMongoCollection<Tour> _tours;

    public MongoTourRepository(IOptions<TourDatabaseSettings> settings)
    {
        var mongoClient = new MongoClient(settings.Value.ConnectionString);
        var mongoDatabase = mongoClient.GetDatabase(settings.Value.DatabaseName);
        _tours = mongoDatabase.GetCollection<Tour>(settings.Value.ToursCollectionName);
    }

    public async Task CreateAsync(Tour tour, CancellationToken cancellationToken)
    {
        await _tours.InsertOneAsync(tour, cancellationToken: cancellationToken);
    }

    public async Task<List<Tour>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _tours
            .Find(_ => true)
            .SortByDescending(t => t.UpdatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<Tour>> GetByAuthorAsync(string authorUsername, CancellationToken cancellationToken)
    {
        return await _tours
            .Find(t => t.AuthorUsername == authorUsername)
            .SortByDescending(t => t.UpdatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Tour?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        return await _tours
            .Find(t => t.Id == id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<Tour?> GetByIdAndAuthorAsync(string id, string authorUsername, CancellationToken cancellationToken)
    {
        return await _tours
            .Find(t => t.Id == id && t.AuthorUsername == authorUsername)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<Tour?> AddKeyPointAsync(string id, string authorUsername, KeyPoint keyPoint, CancellationToken cancellationToken)
    {
        var filter = Builders<Tour>.Filter.Where(t => t.Id == id && t.AuthorUsername == authorUsername);
        var update = Builders<Tour>.Update
            .Push(t => t.KeyPoints, keyPoint)
            .Set(t => t.UpdatedAt, DateTime.UtcNow);

        return await _tours.FindOneAndUpdateAsync(
            filter,
            update,
            new FindOneAndUpdateOptions<Tour>
            {
                ReturnDocument = ReturnDocument.After
            },
            cancellationToken);
    }
    public async Task<Tour?> AddReviewAsync(string tourId, Review review, CancellationToken cancellationToken)
{
    var filter = Builders<Tour>.Filter.Eq(t => t.Id, tourId);
    var update = Builders<Tour>.Update
        .Push(t => t.Reviews, review)
        .Set(t => t.UpdatedAt, DateTime.UtcNow);

    return await _tours.FindOneAndUpdateAsync(
        filter,
        update,
        new FindOneAndUpdateOptions<Tour> { ReturnDocument = ReturnDocument.After },
        cancellationToken);
}
}
