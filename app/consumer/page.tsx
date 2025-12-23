"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { ShoppingCart, X } from "lucide-react";

/* ---------- Types ---------- */
type Product = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
};

type CartItem = {
  id: string;
  quantity: number;
  products: Product;
};

export default function ConsumerDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    fetchProducts();
    fetchCart();
  }, []);

  /* ---------- Fetch Products ---------- */
  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, price, quantity, category")
      .order("created_at", { ascending: false });

    setProducts(data || []);
    setLoading(false);
  };

  /* ---------- Fetch Cart ---------- */
  const fetchCart = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data } = await supabase
      .from("cart_items")
      .select("id, quantity, products(*)")
      .eq("user_id", user.user.id);

    setCartItems(data || []);
    setCartCount(data?.length || 0);
  };

  /* ---------- Add To Cart ---------- */
  const addToCart = async (productId: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return alert("Login first");

    await supabase
      .from("cart_items")
      .upsert(
        {
          user_id: user.user.id,
          product_id: productId,
          quantity: 1,
        },
        { onConflict: "user_id,product_id" }
      );

    fetchCart();
  };

  const handleSearch = () => setSearch(searchInput);

  const filteredProducts = products.filter((p) => {
    const s = p.name.toLowerCase().includes(search.toLowerCase());
    const c = category === "all" || p.category === category;
    return s && c;
  });

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.products.price * item.quantity,
    0
  );

  return (
    <div className="relative text-black">
      <h1 className="text-2xl font-bold mb-6">Consumer Dashboard</h1>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">

        <input
          type="text"
          placeholder="Search products..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="border px-4 py-2 rounded w-1/3"
        />

        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Search
        </button>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border px-4 py-2 rounded"
        >
          <option value="all">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="grocery">Grocery</option>
          <option value="fashion">Fashion</option>
          <option value="general">General</option>
        </select>

        {/* Cart pushed RIGHT */}
        <div className="ml-auto">
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 rounded-full hover:bg-gray-100"
          >
            <ShoppingCart className="w-7 h-7 text-blue-600" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Products */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {filteredProducts.map((p) => (
          <div key={p.id} className="bg-white p-5 rounded shadow">
            <h3 className="font-semibold">{p.name}</h3>
            <p className="text-sm">Category: {p.category}</p>
            <p>Qty: {p.quantity}</p>
            <p className="text-blue-600 font-bold">₹ {p.price}</p>

            <button
              onClick={() => addToCart(p.id)}
              className="mt-3 w-full bg-green-600 text-white py-2 rounded"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      {/* Overlay */}
      {cartOpen && (
        <div
          onClick={() => setCartOpen(false)}
          className="fixed inset-0 bg-black/40 z-40"
        />
      )}

      {/* Cart Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white z-50 transform transition-transform duration-300 ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 flex justify-between items-center border-b">
          <h2 className="text-xl font-bold">Your Cart</h2>
          <button onClick={() => setCartOpen(false)}>
            <X />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto h-[70%]">
          {cartItems.length === 0 ? (
            <p className="text-gray-500">Cart is empty</p>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between border-b pb-2"
              >
                <div>
                  <p className="font-medium">{item.products.name}</p>
                  <p className="text-sm">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold">
                  ₹ {item.products.price * item.quantity}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex justify-between font-bold mb-4">
            <span>Total</span>
            <span>₹ {totalAmount}</span>
          </div>
          <button className="w-full bg-blue-600 text-white py-3 rounded">
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}
