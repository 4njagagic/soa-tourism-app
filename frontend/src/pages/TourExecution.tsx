import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { Tour, TourExecution, getTourApiErrorMessage, tourService } from "../services/tourApi";

const formatDate = (iso: string | null | undefined) => {
    if (!iso) {
        return "-";
    }

    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
};

const MapClickHandler: React.FC<{ onMapClick: (latitude: number, longitude: number) => void }> = ({ onMapClick }) => {
    useMapEvents({
        click: (event) => {
            onMapClick(event.latlng.lat, event.latlng.lng);
        },
    });

    return null;
};

const TourExecutionPage: React.FC = () => {
    const { executionId } = useParams<{ executionId: string }>();
    const navigate = useNavigate();

    const [execution, setExecution] = useState<TourExecution | null>(null);
    const [tour, setTour] = useState<Tour | null>(null);
    const [loading, setLoading] = useState(true);
    const [polling, setPolling] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [moving, setMoving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [currentPosition, setCurrentPosition] = useState<{ latitude: number; longitude: number } | null>(null);
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

    const completedKeyPointIds = useMemo(
        () => new Set(execution?.completedKeyPoints.map((point) => point.keyPointId) ?? []),
        [execution],
    );

    const loadExecution = async () => {
        if (!executionId) {
            setError("Missing execution id.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");
        try {
            const currentExecution = await tourService.getTourExecution(executionId);
            setExecution(currentExecution);
            const currentTour = await tourService.getTour(currentExecution.tourId);
            setTour(currentTour);

            try {
                const position = await tourService.getMyPosition();
                setCurrentPosition({ latitude: position.latitude, longitude: position.longitude });
            } catch {
                setCurrentPosition({
                    latitude: currentExecution.startedLatitude,
                    longitude: currentExecution.startedLongitude,
                });
            }
        } catch (err: unknown) {
            setError(getTourApiErrorMessage(err, "Failed to load active tour"));
        } finally {
            setLoading(false);
        }
    };

    const applyCheckAtPosition = async (
        latitude: number,
        longitude: number,
        noMatchMessage = "No nearby key point detected on this check.",
    ) => {
        if (!executionId) {
            return;
        }

        try {
            const result = await tourService.checkNearbyKeyPoint(
                executionId,
                latitude,
                longitude,
            );
            setExecution(result.execution);
            if (result.matchedKeyPoint && result.completedKeyPoint) {
                setMessage(`Completed key point: ${result.completedKeyPoint.keyPointName}`);
            } else {
                setMessage(noMatchMessage);
            }
        } catch (err: unknown) {
            setMessage("");
            setError(getTourApiErrorMessage(err, "Failed to check nearby key point"));
        }
    };

    const refreshLocationAndCheck = async () => {
        if (!executionId) {
            return;
        }

        setPolling(true);
        try {
            const position = await tourService.getMyPosition();
            setCurrentPosition({ latitude: position.latitude, longitude: position.longitude });
            await applyCheckAtPosition(position.latitude, position.longitude);
        } finally {
            setPolling(false);
        }
    };

    const movePositionOnMap = async (latitude: number, longitude: number) => {
        if (!executionId || execution?.status !== "Active") {
            return;
        }

        setMoving(true);
        setError("");
        try {
            await tourService.updateMyPosition(latitude, longitude);
            setCurrentPosition({ latitude, longitude });
            await applyCheckAtPosition(
                latitude,
                longitude,
                `Moved to ${latitude.toFixed(5)}, ${longitude.toFixed(5)}. No nearby key point yet.`,
            );
        } catch (err: unknown) {
            setError(getTourApiErrorMessage(err, "Failed to move position on map"));
        } finally {
            setMoving(false);
        }
    };

    const fetchRoute = async () => {
        if (!tour || tour.keyPoints.length < 2) {
            setRouteCoords([]);
            return;
        }

        const ordered = [...tour.keyPoints].sort((a, b) => a.order - b.order);
        try {
            const query = ordered
                .map((point) => `${point.longitude},${point.latitude}`)
                .join(";");

            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${query}?overview=full&geometries=geojson`,
            );
            const data = await response.json();

            if (data.code === "Ok" && data.routes && data.routes.length > 0) {
                const coords = data.routes[0].geometry.coordinates.map(
                    (c: [number, number]) => [c[1], c[0]] as [number, number],
                );
                setRouteCoords(coords);
                return;
            }

            throw new Error("OSRM route not found");
        } catch {
            setRouteCoords(ordered.map((point) => [point.latitude, point.longitude] as [number, number]));
        }
    };

    useEffect(() => {
        void loadExecution();
    }, [executionId]);

    useEffect(() => {
        if (!execution || execution.status !== "Active") {
            return;
        }

        void refreshLocationAndCheck();
        const interval = window.setInterval(() => {
            void refreshLocationAndCheck();
        }, 10000);

        return () => window.clearInterval(interval);
    }, [executionId, execution?.status]);

    useEffect(() => {
        void fetchRoute();
    }, [tour]);

    const finishExecution = async (mode: "complete" | "abandon") => {
        if (!executionId) {
            return;
        }

        setActionLoading(true);
        setError("");
        try {
            const position = currentPosition ?? await tourService.getMyPosition();
            const updated = mode === "complete"
                ? await tourService.completeTourExecution(executionId, position.latitude, position.longitude, true)
                : await tourService.abandonTourExecution(executionId, position.latitude, position.longitude);
            setExecution(updated);
            setMessage(mode === "complete" ? "Tour completed." : "Tour abandoned.");

            // Navigate back to tour details after finishing/abandoning
            try {
                navigate("/tours", { state: { openTourId: updated.tourId } });
            } catch {
                // ignore navigation errors
            }
        } catch (err: unknown) {
            setError(getTourApiErrorMessage(err, `Failed to ${mode} tour`));
        } finally {
            setActionLoading(false);
        }
    };

    // If all key points become visited, navigate back to tour page
    useEffect(() => {
        if (!execution) return;
        if (execution.completedKeyPoints.length >= execution.totalKeyPoints && execution.status === "Active") {
            // mark as ready/completed on backend? We navigate back to show tour details as requested
            try {
                navigate("/tours", { state: { openTourId: execution.tourId } });
            } catch {
                // ignore
            }
        }
    }, [execution, navigate]);

    if (loading) {
        return <div className="rounded-xl border bg-surface p-5 text-sm text-text-secondary">Loading active tour...</div>;
    }

    if (!execution || !tour) {
        return (
            <div className="rounded-xl border bg-surface p-5">
                <h1 className="text-xl font-semibold">Active tour</h1>
                <p className="mt-2 text-sm text-text-secondary">The requested execution could not be loaded.</p>
                <button
                    type="button"
                    onClick={() => navigate("/tours")}
                    className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                >
                    Back to tours
                </button>
            </div>
        );
    }

    const keyPointPath = tour.keyPoints
        .sort((a, b) => a.order - b.order)
        .map((point) => [point.latitude, point.longitude] as [number, number]);

    const displayedPath = routeCoords.length >= 2 ? routeCoords : keyPointPath;

    const mapCenter = currentPosition
        ? ([currentPosition.latitude, currentPosition.longitude] as [number, number])
        : tour.keyPoints.length > 0
            ? ([tour.keyPoints[0].latitude, tour.keyPoints[0].longitude] as [number, number])
            : ([execution.startedLatitude, execution.startedLongitude] as [number, number]);

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Active tour</h1>
                    <p className="mt-1 text-sm text-text-secondary">
                        The page polls your simulator position every 10 seconds and checks nearby key points.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate("/tours", { state: { openTourId: tour.id } })}
                    className="rounded-lg border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-muted"
                >
                    Back to tour
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                    {error}
                </div>
            )}

            {message && (
                <div className="mb-4 rounded-lg border border-secondary/30 bg-secondary-soft/20 px-4 py-3 text-sm text-secondary">
                    {message}
                </div>
            )}

            <article className="rounded-xl border bg-surface p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    <span className="rounded-full bg-secondary-soft px-2 py-1 font-medium text-secondary">
                        {execution.status}
                    </span>
                    <span>Tour: {execution.tourName}</span>
                    <span>Started: {formatDate(execution.startedAt)}</span>
                    <span>Last activity: {formatDate(execution.lastActivityAt)}</span>
                    {execution.finishedAt && <span>Finished: {formatDate(execution.finishedAt)}</span>}
                    <span>Progress: {execution.completedKeyPoints.length}/{execution.totalKeyPoints}</span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border bg-muted/30 p-4">
                        <div className="text-xs uppercase tracking-wide text-text-muted">Start location</div>
                        <div className="mt-2 text-sm font-medium text-text-primary">
                            {execution.startedLatitude.toFixed(6)}, {execution.startedLongitude.toFixed(6)}
                        </div>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-4">
                        <div className="text-xs uppercase tracking-wide text-text-muted">Completion location</div>
                        <div className="mt-2 text-sm font-medium text-text-primary">
                            {execution.finishedLatitude != null && execution.finishedLongitude != null
                                ? `${execution.finishedLatitude.toFixed(6)}, ${execution.finishedLongitude.toFixed(6)}`
                                : "Not finished yet"}
                        </div>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-4">
                        <div className="text-xs uppercase tracking-wide text-text-muted">Completion state</div>
                        <div className="mt-2 text-sm font-medium text-text-primary">
                            {execution.status === "Completed"
                                ? "Completed"
                                : execution.status === "Abandoned"
                                    ? "Abandoned"
                                    : execution.completedKeyPoints.length >= execution.totalKeyPoints
                                        ? "Ready to complete"
                                        : "In progress"}
                        </div>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-4">
                        <div className="text-xs uppercase tracking-wide text-text-muted">Polling</div>
                        <div className="mt-2 text-sm font-medium text-text-primary">
                            {polling ? "Checking position..." : "Waiting for next check"}
                        </div>
                    </div>
                </div>

                <section className="mt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">Live position map</h2>
                        <div className="text-xs text-text-muted">
                            Click on map to move current position and trigger key point check.
                        </div>
                    </div>

                    <div className="mt-3 h-[430px] w-full overflow-hidden rounded-xl border">
                        <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <MapClickHandler onMapClick={(latitude, longitude) => void movePositionOnMap(latitude, longitude)} />

                            {displayedPath.length >= 2 && (
                                <Polyline positions={displayedPath} color="#2563eb" weight={4} opacity={0.7} />
                            )}

                            {tour.keyPoints.map((point) => {
                                const completed = completedKeyPointIds.has(point.id);
                                return (
                                    <React.Fragment key={point.id}>
                                        <Marker position={[point.latitude, point.longitude]}>
                                            <Popup>
                                                <div>
                                                    <div className="font-semibold">{point.name}</div>
                                                    <div>{completed ? "Completed" : "Pending"}</div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                        <Circle
                                            center={[point.latitude, point.longitude]}
                                            radius={50}
                                            pathOptions={{
                                                color: completed ? "#16a34a" : "#ef4444",
                                                fillColor: completed ? "#16a34a" : "#ef4444",
                                                fillOpacity: 0.12,
                                            }}
                                        />
                                    </React.Fragment>
                                );
                            })}

                            {currentPosition && (
                                <Marker position={[currentPosition.latitude, currentPosition.longitude]}>
                                    <Popup>
                                        <div>
                                            <div className="font-semibold">Your current position</div>
                                            <div>{currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}</div>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}
                        </MapContainer>
                    </div>

                    <div className="mt-3 text-sm text-text-secondary">
                        {moving
                            ? "Updating position and checking nearby key points..."
                            : currentPosition
                                ? `Current position: ${currentPosition.latitude.toFixed(6)}, ${currentPosition.longitude.toFixed(6)}`
                                : "Current position not set yet."}
                    </div>
                </section>

                <div className="mt-6 flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={actionLoading || moving || execution.status !== "Active"}
                        onClick={() => void finishExecution("complete")}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
                    >
                        {actionLoading ? "Processing..." : "Complete tour"}
                    </button>
                    <button
                        type="button"
                        disabled={actionLoading || moving || execution.status !== "Active"}
                        onClick={() => void finishExecution("abandon")}
                        className="rounded-lg border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-muted disabled:opacity-60"
                    >
                        Abandon tour
                    </button>
                </div>

                <section className="mt-8">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">Key points</h2>
                        <div className="text-sm text-text-secondary">
                            {completedKeyPointIds.size} completed of {tour.keyPoints.length}
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        {tour.keyPoints.map((point) => {
                            const completed = execution.completedKeyPoints.find((item) => item.keyPointId === point.id);
                            return (
                                <article key={point.id} className="rounded-xl border bg-surface p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-semibold text-text-primary">{point.name}</h3>
                                            <p className="mt-1 text-sm text-text-secondary">{point.description}</p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${completed ? "bg-secondary-soft text-secondary" : "bg-muted text-text-secondary"}`}>
                                            {completed ? `Completed at ${formatDate(completed.completedAt)}` : "Pending"}
                                        </span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </article>
        </div>
    );
};

export default TourExecutionPage;
