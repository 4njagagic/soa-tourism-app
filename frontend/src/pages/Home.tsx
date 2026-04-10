import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../context/AuthContext";
import { userService } from "../services/api";
import { Blog, Comment, blogService } from "../services/blogApi";
import "../styles/home.css";
import "../styles/blog.css";

const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string>("");
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createImages, setCreateImages] = useState("");
  const [creating, setCreating] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState<string>("");
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

  const uniqueUsernames = useMemo(() => {
    const set = new Set<string>();
    blogs.forEach((b) => set.add(b.authorUsername));
    comments.forEach((c) => set.add(c.authorUsername));
    return Array.from(set);
  }, [blogs, comments]);

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
      if (!selectedBlogId) {
        setSelectedBlog(null);
        setComments([]);
        return;
      }
      setLoadingDetail(true);
      setError("");
      try {
        const [b, cs] = await Promise.all([
          blogService.getBlog(selectedBlogId),
          blogService.listComments(selectedBlogId),
        ]);
        if (!cancelled) {
          setSelectedBlog(b);
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
  }, [selectedBlogId]);

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

      if (!cancelled) {
        setProfiles((prev) => ({ ...prev, ...fetched }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uniqueUsernames, profiles]);

  const parseImages = (raw: string) => {
    return raw
      .split(/[,\n]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const reloadBlogs = async () => {
    const data = await blogService.listBlogs();
    setBlogs(data);
  };

  const reloadComments = async (blogId: string) => {
    const cs = await blogService.listComments(blogId);
    setComments(cs);
  };

  const handleCreateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const created = await blogService.createBlog({
        title: createTitle,
        description: createDescription,
        imageUrls: parseImages(createImages),
      });
      setCreateTitle("");
      setCreateDescription("");
      setCreateImages("");
      await reloadBlogs();
      setSelectedBlogId(created.id);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to create blog");
    } finally {
      setCreating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlogId) return;
    setError("");
    setCommentLoading(true);
    try {
      await blogService.addComment(selectedBlogId, commentText);
      setCommentText("");
      await reloadComments(selectedBlogId);
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
      if (selectedBlogId) await reloadComments(selectedBlogId);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to update comment");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1>SOA Tourism App</h1>
          <nav>
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn btn-primary">
                  Login
                </Link>
                <Link to="/register" className="btn btn-secondary">
                  Register
                </Link>
              </>
            ) : (
              <>
                <span className="welcome">Welcome, {user?.username}!</span>
                <Link to="/profile" className="btn btn-primary">
                  My Profile
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="home-main">
        <section className="hero">
          <h2>Discover Amazing Tours</h2>
          <p>Explore the world with our professional guides</p>
        </section>

        {isAuthenticated && (
          <section className="user-info">
            <h3>Your Account</h3>
            <p>Role: {user?.role}</p>
            <p>Email: {user?.email}</p>
          </section>
        )}

        <section className="blog-section">
          <div className="blog-card">
            <h3>Blogs</h3>
            {loadingBlogs ? (
              <p>Loading...</p>
            ) : (
              <div className="blog-list">
                {blogs.map((b) => (
                  <div
                    key={b.id}
                    className={`blog-item ${selectedBlogId === b.id ? "active" : ""}`}
                    onClick={() => setSelectedBlogId(b.id)}
                  >
                    <strong>{b.title}</strong>
                    <div className="blog-meta">
                      by {authorLabel(b.authorUsername)} •{" "}
                      {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
                {blogs.length === 0 && <p>No blogs yet.</p>}
              </div>
            )}
          </div>

          <div className="blog-card">
            <h3>Create Blog</h3>
            {error && <div className="error-message">{error}</div>}
            {!isAuthenticated ? (
              <p>
                Please <Link to="/login">login</Link> to create blogs and
                comments.
              </p>
            ) : (
              <form className="blog-form" onSubmit={handleCreateBlog}>
                <input
                  type="text"
                  placeholder="Title"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  required
                />
                <textarea
                  placeholder="Description (Markdown supported)"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  required
                />
                <textarea
                  placeholder="Image URLs (optional) — comma or newline separated"
                  value={createImages}
                  onChange={(e) => setCreateImages(e.target.value)}
                />
                <div className="blog-actions">
                  <button type="submit" disabled={creating}>
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="blog-card" style={{ gridColumn: "1 / -1" }}>
            <h3>Blog Details</h3>
            {loadingDetail && <p>Loading...</p>}
            {!selectedBlog && !loadingDetail && (
              <p>Select a blog to view details.</p>
            )}
            {selectedBlog && (
              <div>
                <div className="blog-detail-title">{selectedBlog.title}</div>
                <div className="blog-meta">
                  by {authorLabel(selectedBlog.authorUsername)} •{" "}
                  {new Date(selectedBlog.createdAt).toLocaleString()}
                </div>
                <div className="blog-markdown">
                  <ReactMarkdown>{selectedBlog.description}</ReactMarkdown>
                </div>

                {(selectedBlog.imageUrls || []).length > 0 && (
                  <div className="blog-images">
                    {selectedBlog.imageUrls?.map((u) => (
                      <img key={u} src={u} alt="blog" />
                    ))}
                  </div>
                )}

                <div className="comments">
                  <h3>Comments</h3>
                  {comments.map((c) => (
                    <div key={c.id} className="comment-item">
                      <div className="comment-header">
                        <span>{authorLabel(c.authorUsername)}</span>
                        <span>
                          {new Date(c.createdAt).toLocaleString()}
                          {c.updatedAt !== c.createdAt
                            ? ` (edited ${new Date(c.updatedAt).toLocaleString()})`
                            : ""}
                        </span>
                      </div>
                      {editingCommentId === c.id ? (
                        <form className="comment-form" onSubmit={saveEdit}>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                          />
                          <div className="blog-actions">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={savingEdit}
                            >
                              Cancel
                            </button>
                            <button type="submit" disabled={savingEdit}>
                              {savingEdit ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="comment-text">
                          {c.text}
                          {isAuthenticated &&
                            user?.username === c.authorUsername && (
                              <div
                                className="blog-actions"
                                style={{ marginTop: 8 }}
                              >
                                <button
                                  type="button"
                                  onClick={() => startEdit(c)}
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  ))}
                  {comments.length === 0 && <p>No comments yet.</p>}

                  {isAuthenticated && (
                    <form className="comment-form" onSubmit={handleAddComment}>
                      <textarea
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        required
                      />
                      <div className="blog-actions">
                        <button type="submit" disabled={commentLoading}>
                          {commentLoading ? "Posting..." : "Post comment"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
