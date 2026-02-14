"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import {
  TrendingUp,
  DollarSign,
  Package,
  ArrowUpRight,
  Calendar,
  BarChart3,
  Loader2,
  ChevronDown
} from "lucide-react";

interface TopProduct {
  product_name: string;
  category: string;
  total_sold: number;
  revenue: number;
}

type DateRange = "Today" | "Yesterday" | "Last 7 Days" | "Last 30 Days" | "This Month" | "All Time";

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("All Time");
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Computed stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSold, setTotalSold] = useState(0);
  const [activeListings, setActiveListings] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]); // Refetch when date range changes

  const getDateFilter = () => {
    const now = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null; // Optional: usually just >= startDate

    switch (dateRange) {
      case "Today":
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        break;
      case "Yesterday":
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        startDate = new Date(yest.setHours(0, 0, 0, 0)).toISOString();
        const yestEnd = new Date(yest);
        endDate = new Date(yestEnd.setHours(23, 59, 59, 999)).toISOString();
        break;
      case "Last 7 Days":
        const last7 = new Date(now);
        last7.setDate(last7.getDate() - 7);
        startDate = last7.toISOString();
        break;
      case "Last 30 Days":
        const last30 = new Date(now);
        last30.setDate(last30.getDate() - 30);
        startDate = last30.toISOString();
        break;
      case "This Month":
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = firstDay.toISOString();
        break;
      case "All Time":
      default:
        startDate = null; // No filter
        break;
    }
    return { startDate, endDate };
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // 1. Fetch Active Listings (Always current snapshot, independent of date filter)
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("producer_id", user.id)
        .eq("status", "available");

      setActiveListings(count || 0);

      // 2. Fetch Orders filtered by Date
      const { startDate, endDate } = getDateFilter();

      let query = supabase
        .from("orders")
        .select(`
          quantity,
          total_price,
          status,
          created_at,
          products (
            name,
            category
          )
        `)
        .eq("producer_id", user.id)
        .in("status", ["Approved", "Completed"]);

      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      const { data: orders, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      if (orders) {
        // Calculate Totals based on filtered orders
        const revenue = orders.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
        const sold = orders.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

        setTotalRevenue(revenue);
        setTotalSold(sold);

        // Aggregate Top Products for this period
        const productMap = new Map<string, TopProduct>();

        orders.forEach((o: any) => {
          const name = o.products?.name || "Unknown";
          const cat = o.products?.category || "General";

          const existing = productMap.get(name);
          if (existing) {
            existing.total_sold += o.quantity;
            existing.revenue += o.total_price;
          } else {
            productMap.set(name, {
              product_name: name,
              category: cat,
              total_sold: o.quantity,
              revenue: o.total_price
            });
          }
        });

        // Top 5 products
        const sortedProducts = Array.from(productMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        setTopProducts(sortedProducts);
      }

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-black dark:text-gray-100 min-h-screen">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Analytics Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track your waste management performance and revenue.</p>
        </div>

        {/* Date Filter Dropdown */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="pl-10 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 font-medium shadow-sm appearance-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
          >
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="This Month">This Month</option>
            <option value="All Time">All Time</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-16 h-16 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue ({dateRange})</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              ₹{(totalRevenue).toLocaleString()}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 w-fit px-2 py-1 rounded-full">
            <TrendingUp size={12} /> {dateRange === "All Time" ? "Lifetime" : "Period Total"}
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="w-16 h-16 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sold ({dateRange})</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {totalSold} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">kg</span>
            </h3>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 w-fit px-2 py-1 rounded-full">
            <ArrowUpRight size={12} /> {dateRange === "All Time" ? "Lifetime" : "Period Total"}
          </div>
        </div>

        {/* Card 3: Active Listings */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart3 className="w-16 h-16 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Listings</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{activeListings}</h3>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
            Currently available
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">

        {/* TOP SELLING PRODUCTS */}
        <div className="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Top Products ({dateRange})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-center">Volume Sold</th>
                  <th className="px-6 py-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {topProducts.length > 0 ? (
                  topProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{p.product_name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">{p.total_sold} kg</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">₹{p.revenue.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No sales data available for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
