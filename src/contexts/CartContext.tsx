// src/contexts/CartContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  sellerName: string;
  quantity: number;
  maxQuantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, newQuantity: number) => void;
  clearCart: () => void;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
  }, []);

  // Save cart
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addItem = (newItem: CartItem) => {
    setItems((prev) => {
      const existingItem = prev.find((item) => item.id === newItem.id);
      if (existingItem) {
        // Safe fallback if maxQuantity is undefined
        const safeMax = existingItem.maxQuantity ?? 999;

        const newQty = Math.min(
          existingItem.quantity + newItem.quantity,
          safeMax
        );

        if (newQty === safeMax && newItem.quantity > 0) {
          alert(`Stock limit reached (${safeMax}) for this product.`);
        } else {
          alert("Cart quantity updated!");
        }
        return prev.map((item) =>
          item.id === newItem.id ? { ...item, quantity: newQty } : item
        );
      }
      alert("Added to cart!");
      return [...prev, newItem];
    });
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // Safe fallback
          const safeMax = item.maxQuantity ?? 999;
          const validQty = Math.max(1, Math.min(newQuantity, safeMax));
          return { ...item, quantity: validQty };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartCount = items.reduce(
    (total, item) => total + (item.quantity || 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
