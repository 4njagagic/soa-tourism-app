import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTourApiErrorMessage, tourService } from "../services/tourApi";

const difficultyOptions = ["Easy", "Moderate", "Hard", "Expert"];

const CreateTour: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(difficultyOptions[0]);
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsedTags = useMemo(
    () =>
      tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tags],
  );

  const canSubmit = name.trim().length >= 2 && description.trim().length >= 10;
  const isGuide = user?.role === "GUIDE";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGuide) return;

    setError("");
    setSubmitting(true);

    try {
      const created = await tourService.createTour({
        name,
        description,
        difficulty,
        tags: parsedTags,
      });
      navigate("/tours", { state: { openTourId: created.id } });
    } catch (err: unknown) {
      setError(getTourApiErrorMessage(err, "Failed to create tour"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isGuide) {
    return (
      <div className="rounded-xl border bg-surface p-5">
        <h1 className="text-xl font-semibold">Tours are for guides</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Only users with the GUIDE role can create tours.
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
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Create tour</h1>
        <p className="mt-1 text-sm text-text-secondary">
          New tours start as drafts and have price set to 0.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="rounded-xl border bg-surface p-5">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Danube heritage walk"
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
              className="mt-1 min-h-[160px] w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Describe the route, experience, and highlights..."
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text-secondary">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {difficultyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary">
                Tags
              </label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="museum, park, history"
              />
              <div className="mt-1 text-xs text-text-muted">
                Separate tags with commas.
              </div>
            </div>
          </div>

          {parsedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {parsedTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/tours")}
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
              {submitting ? "Creating..." : "Create draft"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateTour;
