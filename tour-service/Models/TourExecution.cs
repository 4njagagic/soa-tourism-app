using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TourService.Models;

public enum TourExecutionStatus
{
    Active,
    Completed,
    Abandoned
}

public class TourExecution
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string TourId { get; set; } = string.Empty;

    public string TourName { get; set; } = string.Empty;

    public string TouristUsername { get; set; } = string.Empty;

    [BsonRepresentation(BsonType.String)]
    public TourExecutionStatus Status { get; set; } = TourExecutionStatus.Active;

    public double StartedLatitude { get; set; }

    public double StartedLongitude { get; set; }

    public double? FinishedLatitude { get; set; }

    public double? FinishedLongitude { get; set; }

    public int TotalKeyPoints { get; set; }

    public List<TourExecutionKeyPointProgress> CompletedKeyPoints { get; set; } = [];

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

    public DateTime? FinishedAt { get; set; }
}

public class TourExecutionKeyPointProgress
{
    public string KeyPointId { get; set; } = string.Empty;

    public string KeyPointName { get; set; } = string.Empty;

    public int Order { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    [BsonRepresentation(BsonType.Decimal128)]
    public decimal DistanceKm { get; set; }

    public DateTime CompletedAt { get; set; }
}