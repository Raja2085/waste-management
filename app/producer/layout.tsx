"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  Package,
  User,
  LogOut,
} from "lucide-react";
import { supabase } from "@/src/lib/supabaseClient";

export default function ProducerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`relative h-screen bg-white shadow-md transition-all duration-300
        ${collapsed ? "w-16" : "w-64"}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center text-xl font-bold text-blue-600">
          {collapsed ? "P" : "Producer"}
        </div>

        {/* Menu */}
        <nav className="px-2 space-y-1 text-gray-900">
          <SidebarItem
            title="Dashboard"
            href="/producer/dashboard"
            icon={<LayoutDashboard size={20} />}
            collapsed={collapsed}
            active={pathname === "/producer/dashboard"}
          />

          <SidebarItem
            title="Orders"
            href="/producer/orders"
            icon={<ShoppingCart size={20} />}
            collapsed={collapsed}
            active={pathname === "/producer/orders"}
          />

          <SidebarItem
            title="Analytics"
            href="/producer/analytics"
            icon={<BarChart3 size={20} />}
            collapsed={collapsed}
            active={pathname === "/producer/analytics"}
          />

          <SidebarItem
            title="Products"
            href="/producer/products"
            icon={<Package size={20} />}
            collapsed={collapsed}
            active={pathname === "/producer/products"}
          />

          <SidebarItem
            title="Profile"
            href="/producer/profile"
            icon={<User size={20} />}
            collapsed={collapsed}
            active={pathname === "/producer/profile"}
          />
        </nav>

        {/* 🔴 LOGOUT — FIXED */}
        <div className="absolute bottom-4 w-full px-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg
            text-red-600 hover:bg-red-100 transition"
          >
            <LogOut size={20} />
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <div className="flex-1 flex flex-col">

        {/* Topbar */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg hover:bg-gray-200 text-black"
            >
              ☰
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Dashboard
            </h1>
          </div>

          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
            P
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ================= SIDEBAR ITEM ================= */
function SidebarItem({
  title,
  href,
  icon,
  collapsed,
  active,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition
      ${
        active
          ? "bg-blue-100 text-blue-700"
          : "hover:bg-gray-100 text-gray-900"
      }`}
    >
      <span className="text-blue-600">{icon}</span>
      {!collapsed && <span className="font-medium">{title}</span>}
    </Link>
  );
}
