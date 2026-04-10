import React, { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary-soft text-primary"
      : "text-text-secondary hover:bg-muted hover:text-text-primary",
  ].join(" ");

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = useMemo(() => {
    const full = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    return full || user?.username || "";
  }, [user?.firstName, user?.lastName, user?.username]);

  const avatarText = useMemo(() => {
    const base = (user?.username || displayName || "U").trim();
    return base ? base[0].toUpperCase() : "U";
  }, [displayName, user?.username]);

  const onLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-surface/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/blogs" className="text-base font-semibold tracking-tight">
            SOA Tourism
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink to="/blogs" className={navLinkClass}>
              Blogs
            </NavLink>
            <NavLink
              to={isAuthenticated ? "/blogs/new" : "/login"}
              className={navLinkClass}
            >
              Create
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-md border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-muted"
              >
                Register
              </Link>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted"
              >
                <span className="hidden text-sm text-text-secondary sm:inline">
                  {displayName}
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-highlight text-sm font-semibold text-text-primary">
                  {avatarText}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-md border bg-surface shadow-sm">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-text-primary hover:bg-muted"
                  >
                    My profile
                  </Link>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="block w-full px-3 py-2 text-left text-sm text-error hover:bg-muted"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="mx-auto block w-full max-w-5xl px-4 pb-3 sm:hidden">
        <div className="flex gap-2">
          <NavLink to="/blogs" className={navLinkClass}>
            Blogs
          </NavLink>
          <NavLink
            to={isAuthenticated ? "/blogs/new" : "/login"}
            className={navLinkClass}
          >
            Create
          </NavLink>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
