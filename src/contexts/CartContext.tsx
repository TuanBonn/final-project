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
  quantity: number; // Mới
  maxQuantity: number; // Mới (để giới hạn không mua quá kho)
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, newQuantity: number) => void; // Mới
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
        console.error("Lỗi parse cart", e);
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
        // Nếu đã có -> Cộng dồn số lượng (nhưng không vượt quá max)
        const newQty = Math.min(
          existingItem.quantity + newItem.quantity,
          existingItem.maxQuantity
        );
        if (newQty === existingItem.maxQuantity && newItem.quantity > 0) {
          alert(
            `Đã đạt giới hạn tồn kho (${existingItem.maxQuantity}) cho sản phẩm này.`
          );
        } else {
          alert("Đã cập nhật số lượng trong giỏ!");
        }
        return prev.map((item) =>
          item.id === newItem.id ? { ...item, quantity: newQty } : item
        );
      }
      alert("Đã thêm vào giỏ hàng!");
      return [...prev, newItem];
    });
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // Validate max quantity
          const validQty = Math.max(1, Math.min(newQuantity, item.maxQuantity));
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

  // Tổng số lượng item (không phải số dòng)
  const cartCount = items.reduce((total, item) => total + item.quantity, 0);

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
