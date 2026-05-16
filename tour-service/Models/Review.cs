using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TourService.Models;

public class Review
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public int Rating { get; set; } // 1-5

    public string Comment { get; set; } = string.Empty;

    public string TouristUsername { get; set; } = string.Empty;

    public DateTime VisitDate { get; set; }

    public DateTime CommentDate { get; set; } = DateTime.UtcNow;

    public List<string> Images { get; set; } = [];
}