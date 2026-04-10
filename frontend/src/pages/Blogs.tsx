import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../context/AuthContext";
import { userService } from "../services/api";
import {
  Blog,
  Comment,
  blogService,
  resolveBlogAssetUrl,
} from "../services/blogApi";

type LocationState = { openBlogId?: string };

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const Markdown: React.FC<{ value: string }> = ({ value }) => {
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
      }}
    >
      {value}
    </ReactMarkdown>
  );
};

const BlogDetailView: React.FC<{
  openBlog: Blog | null;
  loadingDetail: boolean;
  comments: Comment[];
  error: string;
  isAuthenticated: boolean;
  currentUsername?: string;
  authorLabel: (username: string) => string;
  onBack: () => void;
  commentText: string;
  setCommentText: (v: string) => void;
  commentLoading: boolean;
  addComment: (e: React.FormEvent) => void;
  editingCommentId: string;
  editingText: string;
  setEditingText: (v: string) => void;
  startEdit: (c: Comment) => void;
  cancelEdit: () => void;
  savingEdit: boolean;
  saveEdit: (e: React.FormEvent) => void;
}> = ({
  openBlog,
  loadingDetail,
  comments,
  error,
  isAuthenticated,
  currentUsername,
  authorLabel,
  onBack,
  commentText,
  setCommentText,
  commentLoading,
  addComment,
  editingCommentId,
  editingText,
  setEditingText,
  startEdit,
  cancelEdit,
  savingEdit,
  saveEdit,
}) => {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-muted"
        >
          Back to feed
        </button>

        <div className="text-sm text-text-muted">Post</div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <article className="rounded-xl border bg-surface p-5">
        {loadingDetail || !openBlog ? (
          <div className="text-sm text-text-secondary">Loading post…</div>
        ) : (
          <>
            <div className="text-xs text-text-muted">
              Posted by{" "}
              <span className="text-text-secondary">
                {authorLabel(openBlog.authorUsername)}
              </span>{" "}
              · {formatDate(openBlog.createdAt)}
            </div>

            <h1 className="mt-1 text-xl font-semibold leading-snug">
              {openBlog.title}
            </h1>

            <div className="mt-4 rounded-lg bg-muted p-4">
              <Markdown value={openBlog.description} />
            </div>

            {openBlog.imageUrls && openBlog.imageUrls.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {openBlog.imageUrls.map((url) => (
                  <a
                    key={url}
                    href={resolveBlogAssetUrl(url)}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border bg-surface"
                  >
                    <img
                      src={resolveBlogAssetUrl(url)}
                      alt="Blog"
                      className="h-44 w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}

            <section className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Comments</h2>
                <div className="text-xs text-text-muted">
                  {comments.length} total
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {comments.map((c) => {
                  const isMine = c.authorUsername === currentUsername;
                  const isEditing = editingCommentId === c.id;

                  return (
                    <div
                      key={c.id}
                      className="rounded-lg border bg-surface p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs text-text-muted">
                          {authorLabel(c.authorUsername)} ·{" "}
                          {formatDate(c.createdAt)}
                          {c.updatedAt && c.updatedAt !== c.createdAt
                            ? " (edited)"
                            : ""}
                        </div>

                        {isMine && !isEditing && (
                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            className="rounded-md border bg-surface px-2 py-1 text-xs font-medium hover:bg-muted"
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      {!isEditing ? (
                        <div className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                          {c.text}
                        </div>
                      ) : (
                        <form onSubmit={saveEdit} className="mt-3">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="min-h-[90px] w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-lg border bg-surface px-3 py-2 text-sm font-medium hover:bg-muted"
                              disabled={savingEdit}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
                              disabled={savingEdit}
                            >
                              {savingEdit ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-lg border bg-surface p-4">
                <form onSubmit={addComment} className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Add a comment
                  </label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[90px] w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder={
                      isAuthenticated
                        ? "Write your comment…"
                        : "Login to comment…"
                    }
                    disabled={!isAuthenticated || commentLoading}
                  />
                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary-hover disabled:opacity-60"
                      disabled={
                        !isAuthenticated ||
                        commentLoading ||
                        !commentText.trim()
                      }
                    >
                      {commentLoading ? "Posting…" : "Post"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </>
        )}
      </article>
    </div>
  );
};

const Blogs: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [error, setError] = useState("");

  const [openBlogId, setOpenBlogId] = useState<string>("");
  const [openBlog, setOpenBlog] = useState<Blog | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [profiles, setProfiles] = useState<
    Record<string, { firstName?: string; lastName?: string }>
  >({});

  const authorLabel = (username: string) => {
    const p = profiles[username];
    const full = `${p?.firstName || ""} ${p?.lastName || ""}`.trim();
    return full ? `${full} (@${username})` : `@${username}`;
  };

  useEffect(() => {
    const state = (location.state || {}) as LocationState;
    if (state.openBlogId) {
      setOpenBlogId(state.openBlogId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBlogs(true);
      setError("");
      try {
        const data = await blogService.listBlogs();
        if (!cancelled) setBlogs(data);
      } catch (e: any) {
        if (!cancelled)
          setError(e?.response?.data?.error || "Failed to load blogs");
      } finally {
        if (!cancelled) setLoadingBlogs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!openBlogId) {
        setOpenBlog(null);
        setComments([]);
        return;
      }

      setLoadingDetail(true);
      setError("");
      try {
        const [b, cs] = await Promise.all([
          blogService.getBlog(openBlogId),
          blogService.listComments(openBlogId),
        ]);
        if (!cancelled) {
          setOpenBlog(b);
          setComments(cs);
        }
      } catch (e: any) {
        if (!cancelled)
          setError(e?.response?.data?.error || "Failed to load blog");
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [openBlogId]);

  const uniqueUsernames = useMemo(() => {
    const set = new Set<string>();
    blogs.forEach((b) => set.add(b.authorUsername));
    comments.forEach((c) => set.add(c.authorUsername));
    return Array.from(set);
  }, [blogs, comments]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = uniqueUsernames.filter((u) => u && !profiles[u]);
      if (missing.length === 0) return;

      const fetched: Record<string, { firstName?: string; lastName?: string }> =
        {};
      for (const u of missing) {
        try {
          const p: any = await userService.getProfileByUsername(u);
          fetched[u] = { firstName: p.firstName, lastName: p.lastName };
        } catch {
          fetched[u] = {};
        }
      }

      if (!cancelled) setProfiles((prev) => ({ ...prev, ...fetched }));
    })();

    return () => {
      cancelled = true;
    };
  }, [profiles, uniqueUsernames]);

  const reloadBlogs = async () => {
    const data = await blogService.listBlogs();
    setBlogs(data);
  };

  const reloadComments = async (blogId: string) => {
    const cs = await blogService.listComments(blogId);
    setComments(cs);
  };

  const toggleOpen = (blogId: string) => {
    setError("");
    setEditingCommentId("");
    setEditingText("");
    setCommentText("");

    setOpenBlogId((prev) => (prev === blogId ? "" : blogId));
  };

  const closeBlog = () => {
    setOpenBlogId("");
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openBlogId) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setError("");
    setCommentLoading(true);
    try {
      await blogService.addComment(openBlogId, commentText);
      setCommentText("");
      await reloadComments(openBlogId);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const startEdit = (c: Comment) => {
    setEditingCommentId(c.id);
    setEditingText(c.text);
  };

  const cancelEdit = () => {
    setEditingCommentId("");
    setEditingText("");
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommentId) return;

    setSavingEdit(true);
    setError("");
    try {
      await blogService.updateComment(editingCommentId, editingText);
      cancelEdit();
      if (openBlogId) await reloadComments(openBlogId);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to update comment");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div>
      {openBlogId ? (
        <BlogDetailView
          openBlog={openBlog}
          loadingDetail={loadingDetail}
          comments={comments}
          error={error}
          isAuthenticated={isAuthenticated}
          currentUsername={user?.username}
          authorLabel={authorLabel}
          onBack={closeBlog}
          commentText={commentText}
          setCommentText={setCommentText}
          commentLoading={commentLoading}
          addComment={addComment}
          editingCommentId={editingCommentId}
          editingText={editingText}
          setEditingText={setEditingText}
          startEdit={startEdit}
          cancelEdit={cancelEdit}
          savingEdit={savingEdit}
          saveEdit={saveEdit}
        />
      ) : (
        <div>
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Blogs</h1>
              <p className="mt-1 text-sm text-text-secondary">
                User created blogs
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                setLoadingBlogs(true);
                try {
                  await reloadBlogs();
                } finally {
                  setLoadingBlogs(false);
                }
              }}
              className="rounded-lg border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-muted"
              disabled={loadingBlogs}
            >
              {loadingBlogs ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {loadingBlogs ? (
            <div className="rounded-xl border bg-surface p-5 text-sm text-text-secondary">
              Loading...
            </div>
          ) : blogs.length === 0 ? (
            <div className="rounded-xl border bg-surface p-5 text-sm text-text-secondary">
              No blogs yet.
            </div>
          ) : (
            <div className="space-y-4">
              {blogs.map((b) => {
                return (
                  <article
                    key={b.id}
                    className={[
                      "cursor-pointer rounded-xl border bg-surface p-5 transition-colors hover:bg-muted/40",
                    ].join(" ")}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleOpen(b.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleOpen(b.id);
                      }
                    }}
                    aria-label={`Open blog: ${b.title}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-text-muted">
                          Posted by{" "}
                          <span className="text-text-secondary">
                            {authorLabel(b.authorUsername)}
                          </span>{" "}
                          · {formatDate(b.createdAt)}
                        </div>
                        <h2 className="mt-1 text-lg font-semibold leading-snug">
                          {b.title}
                        </h2>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-text-secondary">
                      {b.description.length > 240
                        ? `${b.description.slice(0, 240)}…`
                        : b.description}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Blogs;
