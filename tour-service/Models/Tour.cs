using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TourService.Models;

public class Tour
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Difficulty { get; set; } = string.Empty;

    public List<string> Tags { get; set; } = [];

    [BsonRepresentation(BsonType.String)]
    public TourStatus Status { get; set; } = TourStatus.Draft;

    [BsonRepresentation(BsonType.Decimal128)]
    public decimal Price { get; set; } = 0;

    public string AuthorUsername { get; set; } = string.Empty;

    public List<KeyPoint> KeyPoints { get; set; } = [];

    public List<TransportTime> TransportTimes { get; set; } = [];

    [BsonRepresentation(BsonType.Decimal128)]
    public decimal TotalDistanceKm { get; set; } = 0;

    public DateTime? PublishedAt { get; set; }

    public DateTime? ArchivedAt { get; set; }

    public List<Review> Reviews { get; set; } = []; 

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<string> PurchasedBy { get; set; } = [];
}
