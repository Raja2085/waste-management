"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  MessageSquare,
  ArrowUpDown,
  Check,
  X
} from "lucide-react";

type Order = {
  id: string;
  created_at: string;
  quantity: number;
  total_price: number;
  status: "Pending" | "Completed" | "Approved" | "Rejected";
  buyer_name: string; // Stored on order or fetched from profile
  buyer_company: string;
  product_id: string; // Added product_id
  products: {
    name: string;
    category: string;
    description: string;
    producer_id: string;
  };
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"All" | "Pending" | "Completed">("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch orders where the logged-in user is the producer (via the product)
    // Note: This requires RLS policies allowing producers to see orders for their products
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        products!inner (
          name,
          category,
          description,
          producer_id
        )
      `)
      .eq("products.producer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (orderId: string, newStatus: "Pending" | "Completed" | "Approved" | "Rejected", productId?: string) => {
    try {
      // 1. Update Order Status
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      // 2. If Approved, mark Product as Sold
      if (newStatus === "Approved" && productId) {
        const { error: productError } = await supabase
          .from("products")
          .update({ status: "sold" })
          .eq("id", productId);

        if (productError) {
          console.error("Failed to update product status:", productError);
          alert("Order approved, but failed to mark product as sold.");
        }
      }

      // 3. Update Local State
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status");
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesTab = activeTab === "All" || o.status === activeTab;
    const matchesSearch =
      o.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer_company.toLowerCase().includes(search.toLowerCase()) ||
      o.products.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 text-black min-h-screen">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-500 text-sm">Track and manage incoming orders for your waste listings.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">

          {/* Tabs */}
          <div className="flex bg-gray-200/50 p-1 rounded-lg">
            {["All", "Pending", "Completed"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No orders found.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Order Details</th>
                  <th className="px-6 py-3">Buyer</th>
                  <th className="px-6 py-3 text-center">Amount</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{o.products.name}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{o.products.category} • {new Date(o.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{o.buyer_name}</div>
                      <div className="text-gray-500 text-xs">{o.buyer_company}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-semibold text-gray-900">₹{o.total_price}</div>
                      <div className="text-gray-500 text-xs">{o.quantity} kg</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${o.status === "Pending"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : o.status === "Approved"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : o.status === "Completed"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                      >
                        {o.status === "Pending" && <Clock size={12} />}
                        {o.status === "Approved" && <CheckCircle size={12} />}
                        {o.status === "Completed" && <CheckCircle size={12} />}
                        {o.status === "Rejected" && <XCircle size={12} />}
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {o.status === "Pending" ? (
                        <>
                          <button
                            onClick={() => updateStatus(o.id, "Approved", o.product_id)}
                            className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                            title="Approve"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => updateStatus(o.id, "Rejected")}
                            className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                            title="Reject"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : o.status === "Approved" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => updateStatus(o.id, "Completed")}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition"
                          >
                            Mark Completed
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2 text-gray-400">
                          <span className="text-xs">No actions</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
