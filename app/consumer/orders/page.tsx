"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { Search, Calendar, Package, MapPin, ArrowRight, Truck, Loader2 } from "lucide-react";
import Link from "next/link";

/* ---------- Types ---------- */
type Order = {
  id: string;
  created_at: string;
  total_price: number;
  quantity: number;
  status: "Pending" | "Completed" | "Approved" | "Rejected";
  products: {
    name: string;
    image_urls: string[] | null;
    category: string;
  };
};

export default function ConsumerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"all" | "requested" | "approved">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ---------- Fetch Orders ---------- */
  const fetchOrders = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        products (
          name,
          image_urls,
          category
        )
      `)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  /* ---------- Filter ---------- */
  const filteredOrders = orders.filter((o) => {
    const productName = o.products?.name || "Unknown Product";
    const matchesSearch = productName.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (tab === "all") return true;
    if (tab === "requested") return o.status === "Pending";
    if (tab === "approved") {
      return o.status === "Approved" || o.status === "Completed";
    }

    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
      case "Approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Rejected":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 min-h-screen py-8 px-4 text-black dark:text-gray-100">

      {/* HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">My Orders</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage your waste material orders.</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-black dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border text-black dark:text-gray-100 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "all"
            ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
            }`}
        >
          All Orders
        </button>
        <button
          onClick={() => setTab("requested")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "requested"
            ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
            }`}
        >
          Requested
        </button>
        <button
          onClick={() => setTab("approved")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "approved"
            ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
            }`}
        >
          Approved
        </button>
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6 h-32 animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((o) => (
            <div
              key={o.id}
              className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row gap-6 relative overflow-hidden"
            >
              {/* IMAGE / ICON */}
              <div className="md:w-32 md:h-32 w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0 overflow-hidden relative border border-gray-100 dark:border-gray-700">
                {o.products?.image_urls?.[0] ? (
                  <img
                    src={o.products.image_urls[0]}
                    alt={o.products.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-500">
                    <Package size={32} />
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/50 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide">
                  {o.products?.category || "General"}
                </div>
              </div>

              {/* INFO CONTENT */}
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{o.products?.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                      Order ID: #{o.id.slice(0, 8)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wide flex items-center gap-1 ${getStatusColor(o.status)} dark:bg-opacity-20`}>
                    {o.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">Quantity</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">{o.quantity} kg</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">Total Cost</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">₹{o.total_price.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> Ordered on {new Date(o.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* ACTION BUTTON (Mobile: Full width, Desktop: Right aligned) */}
              <div className="md:self-center">
                <Link
                  href={`/consumer/orders/${o.id}`}
                  className="w-full md:w-auto px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
                >
                  View Order Details <ArrowRight size={16} />
                </Link>
              </div>

            </div>
          ))
        ) : (
          /* EMPTY STATE */
          <div className="text-center py-20 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No orders found</h3>
            <p className="text-gray-500 mt-1 mb-6 max-w-sm mx-auto">
              You haven't placed any orders yet, or no orders match your search.
            </p>
            <Link href="/consumer/products" className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-shadow shadow-sm hover:shadow">
              Browse Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
