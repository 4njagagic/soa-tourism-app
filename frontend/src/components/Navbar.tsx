import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ToursNavDropdown from "./ToursNavDropdown";
import { purchaseService } from "../services/purchaseApi";

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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const isTourist = user?.role === "TOURIST";

  useEffect(() => {
    if (!isAuthenticated || !isTourist) {
      setCartCount(0);
      return;
    }

    const loadCartCount = async () => {
      try {
        const cart = await purchaseService.getCart();
        setCartCount(cart.items.length);
      } catch {
        setCartCount(0);
      }
    };

    void loadCartCount();

    const onCartUpdated = () => {
      void loadCartCount();
    };
    window.addEventListener("cart-updated", onCartUpdated);
    return () => window.removeEventListener("cart-updated", onCartUpdated);
  }, [isAuthenticated, isTourist, location.pathname]);

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

  const homePath =
    user?.role === "ADMIN"
      ? "/admin-users"
      : user?.role === "GUIDE"
        ? "/tours"
        : "/blogs";

  const showToursLink =
    isAuthenticated && (user?.role === "GUIDE" || user?.role === "TOURIST");

  return (
    <header className="sticky top-0 z-10 border-b bg-surface/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to={homePath} className="text-base font-semibold tracking-tight">
            SOA Tourism
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {user?.role !== "ADMIN" && (
              <>
                <NavLink to="/blogs" className={navLinkClass}>
                  Blogs
                </NavLink>
                <NavLink
                  to={isAuthenticated ? "/blogs/new" : "/login"}
                  className={navLinkClass}
                >
                  Create blog
                </NavLink>
                {showToursLink &&
                  (user?.role === "GUIDE" ? (
                    <ToursNavDropdown variant="desktop" />
                  ) : (

                    <>

                    <NavLink to="/tours" className={navLinkClass}>
                      Tours
                    </NavLink>
                    <NavLink to="/cart" className={navLinkClass}>
                      Cart{cartCount > 0 ? ` (${cartCount})` : ""}
                    </NavLink>
                     <NavLink to="/simulator" className={navLinkClass}>
        Simulator
      </NavLink>
      </>
                  ))}
              </>
            )}

            {user?.role === "ADMIN" && (
              <NavLink to="/admin-users" className={navLinkClass}>
                Users
              </NavLink>
            )}
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
        <div className="flex flex-wrap gap-2">
          {user?.role !== "ADMIN" && (
            <>
              <NavLink to="/blogs" className={navLinkClass}>
                Blogs
              </NavLink>
              <NavLink
                to={isAuthenticated ? "/blogs/new" : "/login"}
                className={navLinkClass}
              >
                Create blog
              </NavLink>
              {showToursLink &&
                (user?.role === "GUIDE" ? (
                  <ToursNavDropdown variant="mobile" />
                ) : (
                  <>
                  <NavLink to="/tours" className={navLinkClass}>
                    Tours
                  </NavLink>
                  <NavLink to="/cart" className={navLinkClass}>
                    Cart{cartCount > 0 ? ` (${cartCount})` : ""}
                  </NavLink>
                  <NavLink to="/simulator" className={navLinkClass}>
                     Simulator
                  </NavLink>
                  </>
                ))}
            </>
          )}
          {user?.role === "ADMIN" && (
            <NavLink to="/admin-users" className={navLinkClass}>
              Users
            </NavLink>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
