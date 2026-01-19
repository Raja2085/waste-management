"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { Search, MapPin, Filter } from "lucide-react";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  address: string | null;
  district: string | null;
  state: string | null;
  image_urls: string[] | null;
};

const categories = [
  "all",
  "plastic",
  "metal",
  "paper",
  "organic",
  "electronic",
  "general",
];

export default function ConsumerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [minQty, setMinQty] = useState("");
  const [distance, setDistance] = useState("25");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, address, district, state") // Explicitly select address fields
      .eq("status", "available") // Only show available products
      .order("created_at", { ascending: false });

    setProducts(data || []);
    setFiltered(data || []);
  };

  const applyFilters = () => {
    let result = [...products];

    if (search.trim()) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category !== "all") {
      result = result.filter((p) => p.category === category);
    }

    if (minQty) {
      result = result.filter((p) => p.quantity >= Number(minQty));
    }

    setFiltered(result);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* 🏷️ Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Marketplace</h1>
            <p className="text-gray-500 mt-1">Discover and purchase sustainable waste materials.</p>
          </div>
        </div>

        {/* 🔍 Search & Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

            {/* Search */}
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                placeholder="Search by name, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="md:col-span-2">
              <select
                className="w-full h-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-600 appearance-none cursor-pointer"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <input
                type="number"
                placeholder="Min Qty (kg)"
                className="w-full h-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-400"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <select
                className="w-full h-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-600 cursor-pointer"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              >
                <option value="10">{"< 10 km"}</option>
                <option value="25">{"< 25 km"}</option>
                <option value="50">{"< 50 km"}</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <button
                onClick={applyFilters}
                className="w-full h-full flex items-center justify-center bg-gray-900 text-white rounded-xl hover:bg-black transition-colors shadow-lg shadow-gray-200"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 📊 Listing Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>Showing <span className="font-semibold text-gray-900">{filtered.length}</span> results</p>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-lg">No products found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={p.image_urls?.[0] || "/placeholder.png"}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-gray-800 shadow-sm">
                      {p.category}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-lg font-bold text-gray-900 line-clamp-1 mb-1">{p.name}</h2>

                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="truncate">
                        {[p.district, p.state].filter(Boolean).join(", ") || "Unknown Location"}
                      </span>
                    </div>

                    <div className="mt-auto space-y-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900">{p.quantity}</span>
                        <span className="text-sm text-gray-500 font-medium">kg available</span>
                      </div>

                      <Link
                        href={`/consumer/products/${p.id}`}
                        className="block w-full text-center bg-gray-50 text-gray-900 font-semibold py-2.5 rounded-lg border border-gray-200 hover:bg-gray-900 hover:text-white hover:border-transparent transition-all duration-200"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
