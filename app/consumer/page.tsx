"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function ConsumerDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, quantity")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 text-black">

      {/* Page Title */}
      <h1 className="text-2xl font-bold">Consumer Dashboard</h1>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-4 py-2 rounded w-full md:w-1/2"
        />
      </div>

      {/* Products */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Recommended Products
        </h2>

        {loading ? (
          <p>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-gray-500">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Product Card ---------- */

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-lg shadow p-5 hover:shadow-lg transition">
      <h3 className="font-semibold text-lg mb-2">
        {product.name}
      </h3>

      <p className="text-sm text-gray-600 mb-1">
        Available Quantity: {product.quantity}
      </p>

      <p className="font-bold text-blue-600 mb-4">
        ₹ {product.price}
      </p>

      <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
        Request Order
      </button>
    </div>
  );
}
