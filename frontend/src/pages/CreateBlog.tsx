import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { blogService } from "../services/blogApi";

const MarkdownPreview: React.FC<{ value: string }> = ({ value }) => {
  return (
    <ReactMarkdown
      components={{
        h1: (props) => <h1 className="mb-2 text-xl font-semibold" {...props} />,
        h2: (props) => <h2 className="mb-2 text-lg font-semibold" {...props} />,
        h3: (props) => (
          <h3 className="mb-2 text-base font-semibold" {...props} />
        ),
        p: (props) => (
          <p
            className="mb-2 whitespace-pre-wrap text-sm text-text-secondary"
            {...props}
          />
        ),
        li: (props) => (
          <li
            className="ml-5 list-disc text-sm text-text-secondary"
            {...props}
          />
        ),
        a: (props) => (
          <a
            className="text-primary hover:text-primary-hover"
            target="_blank"
            rel="noreferrer"
            {...props}
          />
        ),
        code: (props) => (
          <code className="rounded bg-muted px-1 py-0.5 text-xs" {...props} />
        ),
        blockquote: (props) => (
          <blockquote
            className="my-2 border-l-4 border-border pl-3 text-sm text-text-secondary"
            {...props}
          />
        ),
      }}
    >
      {value || ""}
    </ReactMarkdown>
  );
};

const CreateBlog: React.FC = () => {
  const navigate = useNavigate();

  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canPublish = title.trim() && description.trim();

  const imageLabel = useMemo(() => {
    if (!images || images.length === 0) return "No images selected";
    if (images.length === 1) return images[0].name;
    return `${images.length} images selected`;
  }, [images]);

  const withTextareaSelection = (
    apply: (
      value: string,
      start: number,
      end: number,
    ) => {
      nextValue: string;
      nextSelectionStart: number;
      nextSelectionEnd: number;
    },
  ) => {
    const el = descriptionRef.current;
    const start = el?.selectionStart ?? description.length;
    const end = el?.selectionEnd ?? description.length;
    const { nextValue, nextSelectionStart, nextSelectionEnd } = apply(
      description,
      start,
      end,
    );
    setDescription(nextValue);

    requestAnimationFrame(() => {
      const cur = descriptionRef.current;
      if (!cur) return;
      cur.focus();
      cur.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    });
  };

  const wrapSelection = (left: string, right: string, placeholder: string) => {
    withTextareaSelection((value, start, end) => {
      const selected = value.slice(start, end) || placeholder;
      const inserted = `${left}${selected}${right}`;
      const nextValue = value.slice(0, start) + inserted + value.slice(end);
      const selectionStart = start + left.length;
      const selectionEnd = selectionStart + selected.length;
      return {
        nextValue,
        nextSelectionStart: selectionStart,
        nextSelectionEnd: selectionEnd,
      };
    });
  };

  const prefixLine = (prefix: string) => {
    withTextareaSelection((value, start, end) => {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const nextValue =
        value.slice(0, lineStart) + prefix + value.slice(lineStart);
      const delta = prefix.length;
      return {
        nextValue,
        nextSelectionStart: start + delta,
        nextSelectionEnd: end + delta,
      };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const created = await blogService.createBlogWithFiles({
        title,
        description,
        images,
      });

      navigate("/blogs", { state: { openBlogId: created.id } });
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create blog");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Create blog</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Write in Markdown, attach images, and preview before publishing.
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
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="A clear, specific title"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-text-secondary">
                Description (Markdown)
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => prefixLine("# ")}
                  className="rounded-md border bg-secondary-soft px-2 py-1 text-xs font-medium text-text-primary hover:bg-muted"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => prefixLine("## ")}
                  className="rounded-md border bg-secondary-soft px-2 py-1 text-xs font-medium text-text-primary hover:bg-muted"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => wrapSelection("**", "**", "bold text")}
                  className="rounded-md border bg-secondary-soft px-2 py-1 text-xs font-medium text-text-primary hover:bg-muted"
                >
                  Bold
                </button>
                <button
                  type="button"
                  onClick={() => wrapSelection("_", "_", "italic text")}
                  className="rounded-md border bg-secondary-soft px-2 py-1 text-xs font-medium text-text-primary hover:bg-muted"
                >
                  Italic
                </button>
                <button
                  type="button"
                  onClick={() =>
                    wrapSelection("[", "](https://example.com)", "link text")
                  }
                  className="rounded-md border bg-secondary-soft px-2 py-1 text-xs font-medium text-text-primary hover:bg-muted"
                >
                  Link
                </button>
                <button
                  type="button"
                  onClick={() => prefixLine("- ")}
                  className="rounded-md border bg-secondary-soft px-2 py-1 text-xs font-medium text-text-primary hover:bg-muted"
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => prefixLine("> ")}
                  className="rounded-md border bg-secondary-soft px-2 py-1 text-xs font-medium text-text-primary hover:bg-muted"
                >
                  Quote
                </button>
                <button
                  type="button"
                  onClick={() => wrapSelection("`", "`", "code")}
                  className="rounded-md border bg-secondary-soft px-2 py-1 text-xs font-medium text-text-primary hover:bg-muted"
                >
                  Code
                </button>
                <button
                  type="button"
                  onClick={() =>
                    withTextareaSelection((value, start, end) => {
                      const selected = value.slice(start, end);
                      const block = `\n\n\`\`\`\n${selected || ""}\n\`\`\`\n`;
                      const nextValue =
                        value.slice(0, start) + block + value.slice(end);
                      const cursor = start + 3;
                      return {
                        nextValue,
                        nextSelectionStart: cursor,
                        nextSelectionEnd: cursor + (selected || "").length,
                      };
                    })
                  }
                  className="rounded-md border bg-secondary-soft px-2 py-1 text-xs font-medium text-text-primary hover:bg-muted"
                >
                  Code block
                </button>
              </div>
            </div>

            <textarea
              ref={descriptionRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 min-h-[220px] w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Write your post..."
              required
            />

            <div className="mt-3 rounded-lg border bg-secondary-soft p-4">
              <div className="text-xs font-medium text-text-secondary">
                Preview
              </div>
              <div className="mt-2">
                <MarkdownPreview value={description} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Images (optional)
            </label>
            <div className="mt-1 rounded-lg border bg-surface px-3 py-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setImages(Array.from(e.target.files || []))}
                className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-md file:border file:bg-secondary-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-primary hover:file:bg-muted"
              />
              <div className="mt-2 text-xs text-text-muted">{imageLabel}</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/blogs")}
              className="rounded-lg border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-muted"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !canPublish}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateBlog;
