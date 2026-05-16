import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
//import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { tourService, getTourApiErrorMessage } from "../services/tourApi";

const LocationPicker: React.FC<{ value: { lat: number; lng: number }; onChange: (v: { lat: number; lng: number }) => void }> = ({ value, onChange }) => {
  useMapEvents({ click(e) { onChange({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  return <Marker position={[value.lat, value.lng]} />;
};

const EditKeyPoint: React.FC = () => {
  const { tourId, pointId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState({ lat: 44.8125, lng: 20.4612 });
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const tour = await tourService.getTour(tourId!);
        const point = tour.keyPoints.find(p => p.id === pointId);
        if (point) {
          setName(point.name);
          setDescription(point.description);
          setCoords({ lat: point.latitude, lng: point.longitude });
        }
      } catch (err) { setError("Failed to load point data"); }
      finally { setLoading(false); }
    })();
  }, [tourId, pointId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tourService.updateKeyPoint(tourId!, pointId!, {
        name, description, latitude: coords.lat, longitude: coords.lng, image: image || undefined
      });
      navigate("/tours", { state: { openTourId: tourId } });
    } catch (err) { setError(getTourApiErrorMessage(err, "Update failed")); }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-xl border bg-surface overflow-hidden h-[450px]">
        <MapContainer center={[coords.lat, coords.lng]} zoom={13} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationPicker value={coords} onChange={setCoords} />
        </MapContainer>
      </div>
      <form onSubmit={submit} className="rounded-xl border bg-surface p-5 space-y-4">
        <h2 className="text-xl font-bold">Edit Key Point</h2>
        <input value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded" placeholder="Name" required />
        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded h-32" placeholder="Description" required />
        <input type="file" onChange={e => setImage(e.target.files?.[0] || null)} className="text-sm" />
        <div className="flex gap-2">
          <button type="submit" className="bg-primary text-white px-4 py-2 rounded">Save Changes</button>
          <button type="button" onClick={() => navigate(-1)} className="border px-4 py-2 rounded">Cancel</button>
        </div>
        {error && <p className="text-error text-sm">{error}</p>}
      </form>
    </div>
  );
};

export default EditKeyPoint;