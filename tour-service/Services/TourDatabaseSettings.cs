namespace TourService.Services;

public class TourDatabaseSettings
{
    public string ConnectionString { get; set; } = string.Empty;

    public string DatabaseName { get; set; } = string.Empty;

    public string ToursCollectionName { get; set; } = "tours";
}
