import React, { useEffect, useState } from "react";
//import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { tourService } from "../services/tourApi";

const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const Simulator: React.FC = () => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await tourService.getMyPosition();
        setPosition({ lat: data.latitude, lng: data.longitude });
        setLastUpdated(new Date(data.updatedAt).toLocaleString());
      } catch (err) {
        setPosition({ lat: 45.2396, lng: 19.8227 });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpdatePosition = async (lat: number, lng: number) => {
    setError("");
    try {
      const updated = await tourService.updateMyPosition(lat, lng);
      setPosition({ lat: updated.latitude, lng: updated.longitude });
      setLastUpdated(new Date(updated.updatedAt).toLocaleString());
    } catch (err) {
      setError("Failed to update position on backend.");
    }
  };

  if (loading) return <div className="p-5">Loading simulator...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Position Simulator</h1>
          <p className="text-sm text-text-secondary mt-1">
            Click anywhere on the map to set your current location as a tourist.
          </p>
        </div>
        <div className="rounded-lg border bg-surface px-4 py-2 text-xs text-text-muted shadow-sm">
          {position ? (
            <>
              <div>Current: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</div>
              {lastUpdated && <div>Last saved: {lastUpdated}</div>}
            </>
          ) : (
            "No location set."
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <div className="h-[500px] w-full overflow-hidden rounded-2xl border shadow-lg">
        <MapContainer
          center={position ? [position.lat, position.lng] : [45.2396, 19.8227]}
          zoom={13}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && <Marker position={[position.lat, position.lng]} />}
          <MapClickHandler onMapClick={handleUpdatePosition} />
        </MapContainer>
      </div>

      <div className="rounded-xl bg-primary-soft p-4 text-sm text-primary">
        <strong>Tip:</strong> This location will be used to track your progress during tour executions.
      </div>
    </div>
  );
};

export default Simulator;