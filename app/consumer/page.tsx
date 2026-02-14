"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import Link from "next/link";
import { Package, ShoppingBag, User, ArrowRight, TrendingUp, Info } from "lucide-react";

/* ---------- Types ---------- */
type Order = {
  id: string;
  total_amount: number;
};

export default function ConsumerDashboard() {
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  /* ---------- Fetch Dashboard Stats ---------- */
  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch user details from 'users' table
    const { data: userData } = await supabase
      .from("users")
      .select("first_name")
      .eq("id", user.id)
      .single();

    setFirstName(userData?.first_name || "there");

    const { data } = await supabase
      .from("orders")
      .select("id, total_price, quantity")
      .eq("buyer_id", user.id);

    setTotalOrders(data?.length || 0);
    setTotalSpent(
      data?.reduce((sum, o) => sum + o.total_price, 0) || 0
    );
    setTotalQuantity(
      data?.reduce((sum, o) => sum + (o.quantity || 0), 0) || 0
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Overview of your waste management activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
            {firstName}
          </span>
        </div>
      </header>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Total Orders Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium text-sm">Total Orders</h3>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
              <Package size={20} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{totalOrders}</span>
            <span className="text-xs text-gray-400 mb-1">orders placed</span>
          </div>
        </div>

        {/* Total Spent Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium text-sm">Total Contribution</h3>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{totalSpent.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mb-1">spent on materials</span>
          </div>
        </div>

        {/* Impact Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl shadow-md text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white/80 font-medium text-sm">Environmental Impact</h3>
            <TrendingUp size={20} className="text-white/80" />
          </div>
          <p className="text-2xl font-bold mt-2">{totalQuantity} kg</p>
          <p className="text-xs text-indigo-100 mt-1 opacity-80">Waste diverted from landfills</p>
        </div>
      </div>

      {/* QUICK ACTIONS GRID */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <Link href="/consumer/products" className="group">
            <div className="bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 border border-gray-200 dark:border-gray-700 p-6 rounded-xl transition-all duration-200 h-full flex flex-col justify-between shadow-sm hover:shadow-md cursor-pointer">
              <div>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Package size={20} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">Browse Listings</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Explore available waste materials from producers near you.
                </p>
              </div>
              <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                Start browsing <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link href="/consumer/orders" className="group">
            <div className="bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 border border-gray-200 dark:border-gray-700 p-6 rounded-xl transition-all duration-200 h-full flex flex-col justify-between shadow-sm hover:shadow-md cursor-pointer">
              <div>
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ShoppingBag size={20} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">My Orders</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Track your active orders and view your purchase history.
                </p>
              </div>
              <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                View orders <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link href="/consumer/profile" className="group">
            <div className="bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 border border-gray-200 dark:border-gray-700 p-6 rounded-xl transition-all duration-200 h-full flex flex-col justify-between shadow-sm hover:shadow-md cursor-pointer">
              <div>
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <User size={20} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">Profile Settings</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Manage your account details and preferences.
                </p>
              </div>
              <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                Update profile <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

        </div>
      </div>

      {/* INFO CARD */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-6 flex flex-col md:flex-row gap-4 items-start">
        <div className="p-2 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full shrink-0">
          <Info size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">How it works</h3>
          <p className="text-blue-700/80 dark:text-blue-200/80 mt-1 max-w-3xl leading-relaxed">
            Our platform connects you directly with producers. Browse listings, filter by the materials you need, and place orders securely.
            We ensure transparency and efficiency in every transaction to help you manage your resources effectively.
          </p>
        </div>
      </div>

    </div>
  );
}
