using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TourService.Models;

public class UserPosition
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string Username { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}