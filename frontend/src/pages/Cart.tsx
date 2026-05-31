import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Cart as CartData,
  CheckoutResult,
  getPurchaseApiErrorMessage,
  purchaseService,
} from "../services/purchaseApi";

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const Cart: React.FC = () => {
  const { user } = useAuth();
  const isTourist = user?.role === "TOURIST";

  const [cart, setCart] = useState<CartData | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await purchaseService.getCart();
      setCart(data);
    } catch (err: unknown) {
      setError(getPurchaseApiErrorMessage(err, "Failed to load cart"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTourist) {
      void loadCart();
    }
  }, [isTourist, loadCart]);

  const removeItem = async (tourId: string) => {
    setActionLoading(true);
    setError("");
    try {
      const updated = await purchaseService.removeFromCart(tourId);
      setCart(updated);
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err: unknown) {
      setError(getPurchaseApiErrorMessage(err, "Failed to remove item"));
    } finally {
      setActionLoading(false);
    }
  };

  const checkout = async () => {
    if (!cart || cart.items.length === 0) return;
    setActionLoading(true);
    setError("");
    try {
      const result = await purchaseService.checkout();
      setCheckoutResult(result);
      setCart({ ...cart, items: [], totalPrice: 0 });
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err: unknown) {
      setError(getPurchaseApiErrorMessage(err, "Checkout failed"));
    } finally {
      setActionLoading(false);
    }
  };

  if (!isTourist) {
    return (
      <div className="rounded-xl border bg-surface p-5">
        <h1 className="text-xl font-semibold">Shopping cart</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Only tourists can use the shopping cart.
        </p>
        <Link
          to="/tours"
          className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Browse tours
        </Link>
      </div>
    );
  }

  if (checkoutResult) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Purchase complete</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your tours are unlocked — all key points are now visible.
          </p>
        </div>

        <div className="rounded-xl border border-secondary/30 bg-secondary-soft/30 p-5">
          <p className="text-sm font-medium text-text-primary">
            Total paid: {checkoutResult.totalPaid.toFixed(2)}
          </p>
          <ul className="mt-4 space-y-3">
            {checkoutResult.tokens.map((item) => (
              <li
                key={item.token}
                className="rounded-lg border bg-surface p-4"
              >
                <div className="font-semibold text-text-primary">{item.tourName}</div>
                <div className="mt-1 text-xs text-text-muted">
                  Token: <span className="font-mono">{item.token}</span>
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  {formatDate(item.purchasedAt)}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex gap-2">
          <Link
            to="/tours"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            View my tours
          </Link>
          <button
            type="button"
            onClick={() => setCheckoutResult(null)}
            className="rounded-lg border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-muted"
          >
            Back to cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shopping cart</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review your selected tours before checkout.
          </p>
        </div>
        <Link
          to="/tours"
          className="rounded-lg border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-muted"
        >
          Browse tours
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-surface p-5 text-sm text-text-secondary">
          Loading cart...
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <div className="rounded-xl border bg-surface p-5">
          <p className="text-sm text-text-secondary">Your cart is empty.</p>
          <Link
            to="/tours"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Find tours
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {cart.items.map((item) => (
              <article
                key={item.tourId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-surface p-5"
              >
                <div>
                  <h2 className="text-lg font-semibold">{item.tourName}</h2>
                  <p className="mt-1 text-xs text-text-muted">Tour ID: {item.tourId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-secondary-soft px-3 py-1 text-sm font-medium text-secondary">
                    {item.price.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void removeItem(item.tourId)}
                    className="rounded-lg border px-3 py-1.5 text-sm text-error hover:bg-error/10 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-5">
            <div>
              <div className="text-sm text-text-secondary">Total</div>
              <div className="text-2xl font-semibold text-text-primary">
                {cart.totalPrice.toFixed(2)}
              </div>
            </div>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void checkout()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {actionLoading ? "Processing..." : "Checkout"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
