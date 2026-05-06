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
        // Flatten the nested product data into top-level fields
        const flatCart = (data.cart || []).map(item => {
          // Try to extract unit_price from note (includes variation pricing)
          let unitPrice = Number(item.product?.price) || 0;
          if (item.note) {
            try {
              const parsed = typeof item.note === 'string' ? JSON.parse(item.note) : item.note;
              if (parsed.unit_price !== undefined) {
                unitPrice = Number(parsed.unit_price) || 0;
              }
            } catch {
              // If note can't be parsed, fall back to product price
            }
          }
          
          return {
            cart_id: item.cart_id,
            user_id: item.user_id,
            product_id: item.product_id,
            quantity: item.quantity,
            note: item.note,
            created_at: item.created_at,
            // Flattened product fields (matching guest cart structure)
            name: item.product?.name,
            price: unitPrice,  // Use unit_price from note if available
            image_url: item.product?.image || item.product?.mainImage || null,
            // Keep original product data if needed elsewhere
            product: item.product,
          };
        });
        setItems(flatCart);
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
    // Prefer note embedded in the product object (set by ProductDetail) over the parameter default
    const itemNote = product.note !== undefined ? product.note : note;
    
    // Store the unit price in the note for accurate pricing with variations
    let noteToPersist = itemNote;
    if (typeof itemNote === 'string') {
      try {
        const parsed = JSON.parse(itemNote);
        parsed.unit_price = product.price;  // Store the calculated price
        noteToPersist = JSON.stringify(parsed);
      } catch {
        noteToPersist = itemNote;
      }
    } else if (typeof itemNote === 'object') {
      itemNote.unit_price = product.price;
      noteToPersist = JSON.stringify(itemNote);
    }
    
    // Composite key: same product with different variations = different cart slots
    const itemKey = (p) => `${p.product_id}::${p.note || ""}`;
    const newKey = `${product.product_id}::${noteToPersist}`;

    if (!isAuthenticated) {
      setItems((prev) => {
        const existing = prev.find((i) => itemKey(i) === newKey);
        const updated = existing
          ? prev.map((i) => itemKey(i) === newKey
              ? { ...i, quantity: i.quantity + quantity }
              : i)
          : [...prev, { ...product, quantity, note: noteToPersist, price: product.price }];
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
          note: noteToPersist,  // Note now includes unit_price
        }),
      });
      // Reload cart to get the updated item with correct price
      await loadUserCart(user.id);
    } catch (err) {
      console.error("addItem failed:", err);
    }
  }, [isAuthenticated, user?.id]);

  const removeItem = useCallback(async (productId, note = undefined) => {
  if (!isAuthenticated) {
    setItems((prev) => {
      const updated = note !== undefined
        ? prev.filter((i) => !(i.product_id === productId && i.note === note))
        : prev.filter((i) => i.product_id !== productId);
        saveGuestCart(updated);
        return updated;
      });
      return;
    }
    try {
      let url = `http://localhost:5000/api/cart/${user.id}/${productId}`;
      if (note !== undefined) {
        url += `?note=${encodeURIComponent(note)}`;
      }
      await fetch(url, { method: "DELETE" });
      await loadUserCart(user.id);
    } catch (err) {
      console.error("removeItem failed:", err);
    }
  }, [isAuthenticated, user?.id]);

  const updateQuantity = useCallback(async (productId, quantity, note = undefined) => {
    if (quantity < 1) { removeItem(productId, note); return; }
    if (!isAuthenticated) {
      setItems((prev) => {
        const updated = prev.map((i) =>
          i.product_id === productId && (note === undefined || i.note === note)
            ? { ...i, quantity }
            : i
        );
        saveGuestCart(updated);
        return updated;
      });
      return;
    }
    try {
      const payload = { quantity };
      if (note !== undefined) {
        payload.note = note;
      }
      await fetch(`http://localhost:5000/api/cart/${user.id}/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadUserCart(user.id);
    } catch (err) {
      console.error("updateQuantity failed:", err);
    }
  }, [isAuthenticated, user?.id, removeItem]);

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