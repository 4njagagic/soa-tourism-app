using Microsoft.Extensions.Options;
using MongoDB.Driver;
using TourService.Models;
using TourService.Services;

namespace TourService.Repositories;

public class MongoUserPositionRepository : IUserPositionRepository
{
    private readonly IMongoCollection<UserPosition> _positions;

    public MongoUserPositionRepository(IOptions<TourDatabaseSettings> settings)
    {
        var mongoClient = new MongoClient(settings.Value.ConnectionString);
        var mongoDatabase = mongoClient.GetDatabase(settings.Value.DatabaseName);
        _positions = mongoDatabase.GetCollection<UserPosition>("user_positions");
    }

    public async Task<UserPosition?> GetByUsernameAsync(string username, CancellationToken cancellationToken)
    {
        return await _positions.Find(p => p.Username == username).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task UpsertAsync(UserPosition position, CancellationToken cancellationToken)
    {
        var filter = Builders<UserPosition>.Filter.Eq(p => p.Username, position.Username);
        var update = Builders<UserPosition>.Update
            .Set(p => p.Username, position.Username)
            .Set(p => p.Latitude, position.Latitude)
            .Set(p => p.Longitude, position.Longitude)
            .Set(p => p.UpdatedAt, position.UpdatedAt);

        await _positions.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true }, cancellationToken);
    }
}