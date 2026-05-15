import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useAuth } from "../context/AuthContext";
import { getTourApiErrorMessage, tourService } from "../services/tourApi";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type Coordinates = {
  latitude: number;
  longitude: number;
};

const LocationPicker: React.FC<{
  value: Coordinates;
  onChange: (coords: Coordinates) => void;
}> = ({ value, onChange }) => {
  useMapEvents({
    click(e) {
      onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });

  return <Marker position={[value.latitude, value.longitude]} />;
};

const AddKeyPoint: React.FC = () => {
  const { tourId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuide = user?.role === "GUIDE";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<Coordinates>({
    latitude: 44.8125,
    longitude: 20.4612,
  });
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    !!tourId &&
    name.trim().length >= 2 &&
    description.trim().length >= 5 &&
    !!image;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourId || !image || !isGuide) return;

    setError("");
    setSubmitting(true);

    try {
      await tourService.addKeyPoint(tourId, {
        name,
        description,
        latitude: coords.latitude,
        longitude: coords.longitude,
        image,
      });
      navigate("/tours", { state: { openTourId: tourId } });
    } catch (err: unknown) {
      setError(getTourApiErrorMessage(err, "Failed to add key point"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isGuide) {
    return (
      <div className="rounded-xl border bg-surface p-5">
        <h1 className="text-xl font-semibold">Key points are for guides</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Only GUIDE users can manage tour key points.
        </p>
        <Link
          to="/blogs"
          className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Back to blogs
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Add key point</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Click on the map to choose latitude and longitude, then add details and
          an image.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-xl border bg-surface">
          <MapContainer
            center={[coords.latitude, coords.longitude]}
            zoom={13}
            className="h-[420px] w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationPicker value={coords} onChange={setCoords} />
          </MapContainer>
        </div>

        <form onSubmit={submit} className="rounded-xl border bg-surface p-5">
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-sm text-text-secondary">
              Selected: {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Museum entrance"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 min-h-[120px] w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Why this location matters..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary">
                Image
              </label>
              <div className="mt-1 rounded-lg border bg-surface px-3 py-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-md file:border file:bg-secondary-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-primary hover:file:bg-muted"
                  required
                />
                <div className="mt-2 text-xs text-text-muted">
                  {image ? image.name : "No image selected"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate("/tours", { state: { openTourId: tourId } })}
                className="rounded-lg border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-muted"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save key point"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddKeyPoint;
