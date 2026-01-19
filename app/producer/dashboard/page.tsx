"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import {
  Package,
  CheckCircle,
  ClipboardCheck,
  Recycle,
  Loader2,
  TrendingUp,
  BarChart3
} from "lucide-react";
import Link from "next/link";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ProducerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeListings: 0,
    completedOrders: 0,
    totalSold: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);

  // Chart State
  type ChartFilter = "Last 7 Days" | "This Month" | "Year";
  const [chartFilter, setChartFilter] = useState<ChartFilter>("Last 7 Days");
  const [chartData, setChartData] = useState<{ label: string; revenue: number }[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [chartFilter]);

  const fetchInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // 1. Stats
      const { data: analytics } = await supabase
        .from("producer_analytics")
        .select("*")
        .eq("producer_id", user.id)
        .single();

      const { count: completedCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("producer_id", user.id)
        .eq("status", "Completed");

      if (analytics) {
        setStats({
          totalRevenue: analytics.total_revenue || 0,
          activeListings: analytics.active_listings || 0,
          completedOrders: completedCount || 0,
          totalSold: analytics.total_sold || 0,
        });
      }

      // 2. Recent Orders
      const { data: orders } = await supabase
        .from("orders")
        .select(`id, created_at, quantity, status, products (name)`)
        .eq("producer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentOrders(orders || []);

      // 3. Recent Products
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("producer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentProducts(products || []);

    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      let startDate = new Date();
      // Set to beginning of the day to ensure we get all data for the calculated range
      startDate.setHours(0, 0, 0, 0);

      let labels: string[] = [];

      if (chartFilter === "Last 7 Days") {
        // Last 7 days including today: Today-6 to Today
        startDate.setDate(startDate.getDate() - 6);

        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          labels.push(days[d.getDay()]);
        }
      } else if (chartFilter === "This Month") {
        startDate.setDate(1); // 1st of month
        // Generate buckets for days in month so far
        const today = new Date().getDate();
        labels = Array.from({ length: today }, (_, i) => (i + 1).toString());
      } else if (chartFilter === "Year") {
        startDate.setMonth(0, 1); // Jan 1st of current year
        labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      }

      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, total_amount")
        .eq("producer_id", user.id)
        .gte("created_at", startDate.toISOString())
        .neq("status", "Rejected")
        .order("created_at", { ascending: true });

      // Aggregation
      const revenueMap: Record<string, number> = {};

      orders?.forEach(o => {
        const d = new Date(o.created_at);
        let key = "";

        if (chartFilter === "Last 7 Days") {
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          key = days[d.getDay()];
        } else if (chartFilter === "This Month") {
          key = d.getDate().toString();
        } else if (chartFilter === "Year") {
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          key = months[d.getMonth()];
        }

        revenueMap[key] = (revenueMap[key] || 0) + (o.total_amount || 0);
      });

      // Map to Labels
      const processed = labels.map(label => {
        return { label, revenue: revenueMap[label] || 0 };
      });

      setChartData(processed);

    } catch (e) {
      console.error("Error fetching chart data", e);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-black pb-10">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Producer Dashboard</h1>
          <p className="text-gray-500">Overview of your waste management activity.</p>
        </div>
        <Link href="/producer/products" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
          + Add New Listing
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          icon={<TrendingUp className="text-green-600" />}
          bg="bg-green-50"
        />
        <StatCard
          title="Active Listings"
          value={stats.activeListings}
          icon={<CheckCircle className="text-blue-600" />}
          bg="bg-blue-50"
        />
        <StatCard
          title="Completed Orders"
          value={stats.completedOrders}
          icon={<ClipboardCheck className="text-purple-600" />}
          bg="bg-purple-50"
        />
      </div>

      {/* Main Content Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Chart + Activity */}
        <div className="lg:col-span-2 space-y-8">

          {/* Sales Chart */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-600" />
                Sales Overview
              </h2>
              {/* Date Filter Pills */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(["Last 7 Days", "This Month", "Year"] as ChartFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setChartFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${chartFilter === filter
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                      }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    dy={10}
                  />
                  <YAxis
                    hide={true}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="font-bold text-lg text-gray-900 mb-6">Recent Activity</h2>

            {recentOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No recent activity found.</div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors">
                    <div className={`p-2 rounded-full ${order.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {order.status === 'Completed' ? <ClipboardCheck size={20} /> : <Package size={20} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">
                        Order for <span className="font-bold">{order.products?.name}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.quantity} kg • {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tips / Actions */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg">
            <h3 className="font-bold text-lg mb-2">Grow your Impact</h3>
            <p className="text-blue-100 text-sm mb-4">You have recycled {stats.totalSold} kg of waste so far! Keep listing to increase your contribution.</p>
            <Link href="/producer/analytics" className="text-sm font-semibold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg inline-block transition">
              View Full Analytics
            </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Quick Tips</h2>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 shrink-0" /> Use clear photos for listings</li>
              <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 shrink-0" /> Accurately category your waste</li>
              <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 shrink-0" /> Respond to orders quickly</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Listings Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-lg text-gray-900">Recent Listings</h2>
          <Link href="/producer/products" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentProducts.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No listings yet.</td></tr>
              ) : (
                recentProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 text-gray-600">{p.category}</td>
                    <td className="px-6 py-4 text-gray-600">{p.quantity} kg</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">₹{p.price}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${p.status === 'sold' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {p.status === 'sold' ? 'Sold' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bg }: { title: string; value: any; icon: React.ReactNode; bg: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`p-4 rounded-full ${bg} shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{value}</h3>
      </div>
    </div>
  );
}
