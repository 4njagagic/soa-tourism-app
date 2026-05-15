import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

type ToursNavDropdownProps = {
  variant?: "desktop" | "mobile";
};

const ToursNavDropdown: React.FC<ToursNavDropdownProps> = ({
  variant = "desktop",
}) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isToursSection = location.pathname.startsWith("/tours");

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const triggerClass = [
    "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isToursSection
      ? "bg-primary-soft text-primary"
      : "text-text-secondary hover:bg-muted hover:text-text-primary",
    variant === "mobile" ? "w-full justify-between" : "",
  ].join(" ");

  return (
    <div ref={containerRef} className={variant === "mobile" ? "w-full" : "relative"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Tours
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          className={[
            "overflow-hidden rounded-lg border bg-surface shadow-md",
            variant === "mobile"
              ? "mt-1 w-full"
              : "absolute left-0 top-full z-20 mt-1 min-w-[11rem]",
          ].join(" ")}
        >
          <Link
            to="/tours"
            onClick={() => setOpen(false)}
            className={[
              "block px-3 py-2 text-sm transition-colors hover:bg-muted",
              location.pathname === "/tours"
                ? "bg-primary-soft font-medium text-primary"
                : "text-text-primary",
            ].join(" ")}
          >
            My tours
          </Link>
          <Link
            to="/tours/new"
            onClick={() => setOpen(false)}
            className={[
              "block px-3 py-2 text-sm transition-colors hover:bg-muted",
              location.pathname === "/tours/new"
                ? "bg-primary-soft font-medium text-primary"
                : "text-text-primary",
            ].join(" ")}
          >
            Create tour
          </Link>
        </div>
      )}
    </div>
  );
};

export default ToursNavDropdown;
