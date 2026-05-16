import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  KeyPoint,
  Tour,
  getTourApiErrorMessage,
  resolveTourAssetUrl,
  tourService,
} from "../services/tourApi";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";

type LocationState = { openTourId?: string };

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const KeyPointModal: React.FC<{
  point: KeyPoint;
  onClose: () => void;
}> = ({ point, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keypoint-modal-title"
      >
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <h2 id="keypoint-modal-title" className="text-lg font-semibold">
            {point.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-2 py-1 text-sm text-text-secondary hover:bg-muted"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 p-5">
          <img
            src={resolveTourAssetUrl(point.imageUrl)}
            alt={point.name}
            className="h-52 w-full rounded-lg border object-cover"
          />
          <p className="whitespace-pre-wrap text-sm text-text-secondary">
            {point.description}
          </p>
          <div className="text-xs text-text-muted">
            {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
          </div>
          <div className="text-xs text-text-muted">
            Added {formatDate(point.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
};

const Tours: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isGuide = user?.role === "GUIDE";
  const isTourist = user?.role === "TOURIST";

  const [tours, setTours] = useState<Tour[]>([]);
  const [openTourId, setOpenTourId] = useState("");
  const [selectedKeyPoint, setSelectedKeyPoint] = useState<KeyPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userRating, setUserRating] = useState(5);
  const [showMap, setShowMap] = useState(false);

  const openTour = useMemo(
    () => tours.find((tour) => tour.id === openTourId) || null,
    [openTourId, tours],
  );

  const loadTours = async () => {
    setLoading(true);
    setError("");
    try {
      const data = isGuide
        ? await tourService.listMyTours()
        : await tourService.listTours();
      setTours(data);
    } catch (err: unknown) {
      setError(getTourApiErrorMessage(err, "Failed to load tours"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const state = (location.state || {}) as LocationState;
    if (state.openTourId) {
      setOpenTourId(state.openTourId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (isGuide || isTourist) {
      void loadTours();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuide, isTourist, location]);

  if (!isGuide && !isTourist) {
    return (
      <div className="rounded-xl border bg-surface p-5">
        <h1 className="text-xl font-semibold">Tours</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Login as a guide or tourist to browse tours.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Login
        </Link>
      </div>
    );
  }

  if (openTour) {
    return (
      <div>
        {selectedKeyPoint && (
          <KeyPointModal
            point={selectedKeyPoint}
            onClose={() => setSelectedKeyPoint(null)}
          />
        )}

        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpenTourId("")}
            className="rounded-lg border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-muted"
          >
            Back to tours
          </button>
          {isGuide && (
            <Link
              to={`/tours/${openTour.id}/key-points/new`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Add key point
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <article className="rounded-xl border bg-surface p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span className="rounded-full bg-secondary-soft px-2 py-1 font-medium text-secondary">
              {openTour.status}
            </span>
            <span>Price: {openTour.price}</span>
            <span>By @{openTour.authorUsername}</span>
            <span>Updated: {formatDate(openTour.updatedAt)}</span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold leading-snug">
            {openTour.name}
          </h1>
          <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
            {openTour.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-text-secondary">
              Difficulty: {openTour.difficulty}
            </span>
            {openTour.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>

          <section className="mt-6">
           <div className="flex items-center justify-between">
    <h2 className="text-base font-semibold">Key points</h2>
    <div className="flex gap-2">
      {openTour.keyPoints.length > 0 && (
        <button 
          onClick={() => setShowMap(!showMap)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {showMap ? "Hide Map" : "Show Route on Map"}
        </button>
      )}
      <div className="text-xs text-text-muted">{openTour.keyPoints.length} total</div>
    </div>
  </div>

  {/* MAPA SA LINIJAMA (POLYLINE) */}
  {showMap && openTour.keyPoints.length > 0 && (
    <div className="mt-4 h-[350px] w-full rounded-xl border overflow-hidden">
      <MapContainer 
        center={[openTour.keyPoints[0].latitude, openTour.keyPoints[0].longitude]} 
        zoom={13} 
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {/* Markeri za svaku tačku */}
        {openTour.keyPoints.map((kp) => (
          <Marker key={kp.id} position={[kp.latitude, kp.longitude]}>
            <Popup>{kp.name}</Popup>
          </Marker>
        ))}
        {/* LINIJA KOJA POVEZUJE TAČKE */}
        <Polyline 
          positions={openTour.keyPoints.map(kp => [kp.latitude, kp.longitude])} 
          color="blue" 
          weight={4}
          opacity={0.6}
        />
      </MapContainer>
    </div>
  )}

  {/* IZMENJENA LISTA TAČAKA SA EDIT/DELETE DUGMIĆIMA */}
  <div className="mt-3 space-y-2">
    {openTour.keyPoints.map((point) => (
      <div key={point.id} className="group relative rounded-lg border bg-surface p-4 transition-colors hover:border-primary">
        <div className="flex items-start justify-between">
          <button onClick={() => setSelectedKeyPoint(point)} className="text-left">
            <h3 className="font-semibold text-text-primary">{point.name}</h3>
            <p className="mt-1 line-clamp-1 text-sm text-text-secondary">{point.description}</p>
          </button>
          
          <div className="flex gap-2">
            {isGuide && (
              <>
                <button 
                  onClick={() => navigate(`/tours/${openTour.id}/key-points/${point.id}/edit`)}
                  className="text-xs text-primary hover:underline"
                >
                  Edit
                </button>
                <button 
                  onClick={async () => {
                    if (window.confirm("Delete this point?")) {
                      const updated = await tourService.deleteKeyPoint(openTour.id, point.id);
                      setTours(tours.map(t => t.id === updated.id ? updated : t));
                    }
                  }}
                  className="text-xs text-error hover:underline"
                >
                  Delete
                </button>
              </>
            )}
            <button onClick={() => setSelectedKeyPoint(point)} className="text-xs text-primary font-medium">
              View
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
          </section>

          <section className="mt-10 border-t pt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Tourist Reviews</h2>
              <div className="text-sm text-text-muted">
                {openTour.reviews.length} reviews
              </div>
            </div>

            {/* Forma za ostavljanje recenzije (samo za Turiste) */}
            {isTourist && (
              <div className="mt-6 rounded-xl border bg-muted/30 p-5">
                <h3 className="font-medium">Leave a review</h3>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const target = e.target as any;
                    const comment = target.comment.value;
                    const visitDate = target.visitDate.value;
                    const files = target.images.files ? Array.from(target.images.files) as File[] : [];

                    setError("");
                    try {
                      const updated = await tourService.addReview(openTour.id, {
                        rating: userRating, comment, visitDate, images: files
                      });
                      setTours(tours.map(t => t.id === updated.id ? updated : t));
                      target.reset(); 
                      setUserRating(5);
                    } catch (err) {
                      setError(getTourApiErrorMessage(err, "Failed to add review"));
                    }
                  }}
                  className="mt-4 space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium uppercase text-text-muted">Rating</label>
                    
                       <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setUserRating(num)}
                className="text-2xl transition-transform hover:scale-110"
              >
                <span className={num <= userRating ? "text-yellow-500" : "text-gray-300"}>
                  ★
                </span>
              </button>
            ))}
            <span className="ml-2 text-sm text-text-muted self-center">({userRating}/5)</span>
          </div>
        </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-text-muted">Visit Date</label>
                      <input type="date" name="visitDate" required className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase text-text-muted">Comment</label>
                    <textarea name="comment" required minLength={2} className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none min-h-[80px]" placeholder="How was your experience?" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase text-text-muted">Images</label>
                    <input type="file" name="images" multiple accept="image/*" className="mt-1 block w-full text-xs text-text-secondary file:mr-3 file:rounded-md file:border file:bg-surface file:px-3 file:py-1.5 file:font-medium" />
                  </div>
                  <button type="submit" className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary-hover">
                    Submit Review
                  </button>
                </form>
              </div>
            )}

            {/* Lista recenzija */}
            <div className="mt-8 space-y-6">
              {openTour.reviews.length === 0 ? (
                <p className="text-sm text-text-secondary italic">No reviews yet. Be the first to review this tour!</p>
              ) : (
                openTour.reviews.map((rev) => (
                  <div key={rev.id} className="border-b pb-6 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary">@{rev.touristUsername}</span>
                        <span className="flex text-yellow-500">
                          {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                        </span>
                      </div>
                      <span className="text-xs text-text-muted">{formatDate(rev.commentDate)}</span>
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">{rev.comment}</p>
                    <div className="mt-1 text-[11px] text-text-muted">Visited on: {new Date(rev.visitDate).toLocaleDateString()}</div>
                    
                    {rev.images && rev.images.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {rev.images.map((img, idx) => (
                          <a key={idx} href={resolveTourAssetUrl(img)} target="_blank" rel="noreferrer">
                            <img 
                              src={resolveTourAssetUrl(img)} 
                              alt="Review" 
                              className="h-20 w-20 rounded-md border object-cover hover:opacity-80 transition-opacity" 
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </article>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isGuide ? "My tours" : "Tours"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {isGuide
              ? "Draft tours created by you as an author."
              : "Browse available tours and their key points."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadTours}
            className="rounded-lg border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-muted"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          {isGuide && (
            <Link
              to="/tours/new"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Create tour
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-surface p-5 text-sm text-text-secondary">
          Loading...
        </div>
      ) : tours.length === 0 ? (
        <div className="rounded-xl border bg-surface p-5 text-sm text-text-secondary">
          No tours yet.
        </div>
      ) : (
        <div className="space-y-4">
          {tours.map((tour) => (
            <article
              key={tour.id}
              className="cursor-pointer rounded-xl border bg-surface p-5 transition-colors hover:bg-muted/40"
              role="button"
              tabIndex={0}
              onClick={() => setOpenTourId(tour.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenTourId(tour.id);
                }
              }}
              aria-label={`Open tour: ${tour.name}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-text-muted">
                    {tour.status} · {tour.difficulty} · {tour.keyPoints.length}{" "}
                    key points
                    {!isGuide && ` · @${tour.authorUsername}`}
                  </div>
                  <h2 className="mt-1 text-lg font-semibold leading-snug">
                    {tour.name}
                  </h2>
                </div>
                <span className="rounded-full bg-secondary-soft px-3 py-1 text-xs font-medium text-secondary">
                  Price {tour.price}
                </span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">
                {tour.description.length > 240
                  ? `${tour.description.slice(0, 240)}...`
                  : tour.description}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tours;
