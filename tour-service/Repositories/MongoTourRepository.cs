using Microsoft.Extensions.Options;
using MongoDB.Driver;
using TourService.Models;
using TourService.Services;
using MongoDB.Bson;

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
    if (!ObjectId.TryParse(id, out var objectId)) return null;
    
    var filter = Builders<Tour>.Filter.Eq("_id", objectId);
    return await _tours.Find(filter).FirstOrDefaultAsync(cancellationToken);
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

public async Task<Tour?> UpdateKeyPointAsync(string id, string authorUsername, KeyPoint keyPoint, CancellationToken cancellationToken)
{
    
    var filter = Builders<Tour>.Filter.Where(t => t.Id == id && t.AuthorUsername == authorUsername);
    var update = Builders<Tour>.Update
        .Set("KeyPoints.$[elem].Name", keyPoint.Name)
        .Set("KeyPoints.$[elem].Description", keyPoint.Description)
        .Set("KeyPoints.$[elem].Latitude", keyPoint.Latitude)
        .Set("KeyPoints.$[elem].Longitude", keyPoint.Longitude)
        .Set("KeyPoints.$[elem].ImageUrl", keyPoint.ImageUrl)
        .Set(t => t.UpdatedAt, DateTime.UtcNow);

    var options = new FindOneAndUpdateOptions<Tour>
    {
        ReturnDocument = ReturnDocument.After,
        ArrayFilters = new[] { new BsonDocumentArrayFilterDefinition<BsonDocument>(new BsonDocument("elem._id", ObjectId.Parse(keyPoint.Id))) }
    };

    return await _tours.FindOneAndUpdateAsync(filter, update, options, cancellationToken);
}

public async Task<Tour?> DeleteKeyPointAsync(string id, string authorUsername, string pointId, CancellationToken cancellationToken)
{
    var filter = Builders<Tour>.Filter.Where(t => t.Id == id && t.AuthorUsername == authorUsername);
    var update = Builders<Tour>.Update
        .PullFilter(t => t.KeyPoints, kp => kp.Id == pointId)
        .Set(t => t.UpdatedAt, DateTime.UtcNow);

    return await _tours.FindOneAndUpdateAsync(filter, update, new FindOneAndUpdateOptions<Tour> { ReturnDocument = ReturnDocument.After }, cancellationToken);
}

    public async Task<Tour?> UpdateAsync(Tour tour, CancellationToken cancellationToken)
    {
        
    if (!ObjectId.TryParse(tour.Id, out var objectId)) return null;

    var filter = Builders<Tour>.Filter.Eq("_id", objectId);
    var result = await _tours.ReplaceOneAsync(
        filter,
        tour,
        new ReplaceOptions { IsUpsert = false },
        cancellationToken);

    return result.ModifiedCount > 0 || result.MatchedCount > 0 ? tour : null;
    }
}
