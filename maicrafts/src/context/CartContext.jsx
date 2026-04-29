// maicrafts/src/context/CartContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
};

const GUEST_CART_KEY = "mc_guest_cart";

// CartProvider
export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [isCartLoading, setIsCartLoading] = useState(false);

  // Load cart when auth state is known
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadUserCart(user.id);
    } else {
      loadGuestCart();
    }
  }, [isAuthenticated, user?.id]);

  // When user logs in: merge guest cart into user DB cart
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      mergeGuestCartOnLogin(user.id);
    }
  }, [isAuthenticated]);

  // Guest cart: localStorage
  const loadGuestCart = () => {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    }
  };

  const saveGuestCart = (newItems) => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(newItems));
    window.dispatchEvent(new Event("cart-updated"));
  };

  // User cart: fetch from DB
  const loadUserCart = async (userId) => {
    setIsCartLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/cart/${userId}`);

      if (res.status === 404) {
        loadGuestCart();
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setItems(data.cart || []);
        window.dispatchEvent(new Event("cart-updated"));
      }
    } catch (err) {
      console.error("Failed to load user cart:", err);
      loadGuestCart();
    } finally {
      setIsCartLoading(false);
    }
  };

  // Merge: when user logs in, push any guest items to their DB cart
  const mergeGuestCartOnLogin = async (userId) => {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      const guestItems = raw ? JSON.parse(raw) : [];
      if (guestItems.length === 0) return;

      await fetch(`http://localhost:5000/api/cart/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, guestItems }),
      });

      localStorage.removeItem(GUEST_CART_KEY);
      await loadUserCart(userId);
    } catch (err) {
      console.error("Cart merge failed:", err);
    }
  };

  // Cart Actions
  const addItem = useCallback(async (product, quantity = 1, note = "") => {
    if (!isAuthenticated) {
      setItems((prev) => {
        const existing = prev.find((i) => i.product_id === product.product_id);
        const updated = existing
          ? prev.map((i) => i.product_id === product.product_id
              ? { ...i, quantity: i.quantity + quantity }
              : i)
          : [...prev, { ...product, quantity, note }];
        saveGuestCart(updated);
        return updated;
      });
      return;
    }

    try {
      await fetch("http://localhost:5000/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          product_id: product.product_id,
          quantity,
          note,
        }),
      });
      await loadUserCart(user.id);
    } catch (err) {
      console.error("addItem failed:", err);
    }
  }, [isAuthenticated, user?.id]);

  const removeItem = useCallback(async (productId) => {
    if (!isAuthenticated) {
      setItems((prev) => {
        const updated = prev.filter((i) => i.product_id !== productId);
        saveGuestCart(updated);
        return updated;
      });
      return;
    }
    try {
      await fetch(`http://localhost:5000/api/cart/${user.id}/${productId}`, {
        method: "DELETE",
      });
      await loadUserCart(user.id);
    } catch (err) {
      console.error("removeItem failed:", err);
    }
  }, [isAuthenticated, user?.id]);

  const updateQuantity = useCallback(async (productId, quantity) => {
    if (quantity < 1) { removeItem(productId); return; }

    if (!isAuthenticated) {
      setItems((prev) => {
        const updated = prev.map((i) =>
          i.product_id === productId ? { ...i, quantity } : i
        );
        saveGuestCart(updated);
        return updated;
      });
      return;
    }
    try {
      await fetch(`http://localhost:5000/api/cart/${user.id}/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      await loadUserCart(user.id);
    } catch (err) {
      console.error("updateQuantity failed:", err);
    }
  }, [isAuthenticated, user?.id]);

  const clearCart = useCallback(async () => {
    if (!isAuthenticated) {
      localStorage.removeItem(GUEST_CART_KEY);
      setItems([]);
      window.dispatchEvent(new Event("cart-updated"));
      return;
    }
    try {
      await fetch(`http://localhost:5000/api/cart/${user.id}`, { method: "DELETE" });
      setItems([]);
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      console.error("clearCart failed:", err);
    }
  }, [isAuthenticated, user?.id]);

  const totalCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  return (
    <CartContext.Provider value={{
      items,
      totalCount,
      totalAmount,
      isCartLoading,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

// ✅ NO default export at the bottom!