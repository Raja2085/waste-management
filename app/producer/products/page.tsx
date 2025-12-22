"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  // 🔹 Fetch products
  const fetchProducts = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("producer_id", user.id)
      .order("created_at", { ascending: false });

    setProducts(data || []);
  };

  // 🔹 Add product
  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("products").insert({
      producer_id: user.id,
      name,
      price: Number(price),
      quantity: Number(quantity),
    });

    if (!error) {
      setName("");
      setPrice("");
      setQuantity("");
      setShowModal(false);
      fetchProducts();
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black">
          Products
        </h1>

        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Add Product
        </button>
      </div>

      {/* PRODUCT LIST */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold text-black mb-4">
          Your Products
        </h2>

        {products.length === 0 ? (
          <p className="text-black">
            No products added yet.
          </p>
        ) : (
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left text-black">Name</th>
                <th className="p-2 text-black">Price</th>
                <th className="p-2 text-black">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2 text-black">{p.name}</td>
                  <td className="p-2 text-center text-black">₹{p.price}</td>
                  <td className="p-2 text-center text-black">{p.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-lg">

            <h2 className="text-xl font-semibold text-black mb-4">
              Add Product
            </h2>

            <form onSubmit={addProduct} className="space-y-3">

              <input
                type="text"
                placeholder="Product Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border rounded-lg px-4 py-2 text-black"
              />

              <input
                type="number"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full border rounded-lg px-4 py-2 text-black"
              />

              <input
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full border rounded-lg px-4 py-2 text-black"
              />

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border text-black"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  {loading ? "Adding..." : "Add"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
