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
  MessageSquare, // New Icon
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

  /* ================= FETCH USER NAME ================= */
  const [userName, setUserName] = useState("Producer");
  const [initials, setInitials] = useState("P");

  {/* UseEffect to fetch profile */ }
  const { useEffect } = require("react");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (data) {
          const first = data.first_name || "";
          const last = data.last_name || "";
          const full = `${first} ${last}`.trim() || user.email?.split("@")[0] || "Producer";
          setUserName(full);
          setInitials((first[0] || "P").toUpperCase());
        }
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`relative h-full bg-white shadow-md transition-all duration-300 flex flex-col
        ${collapsed ? "w-16" : "w-64"}`}
      >
        {/* Logo / Identity */}
        <div className="h-16 flex items-center justify-center text-lg font-bold text-blue-600 shrink-0 border-b">
          {collapsed ? initials : <span className="truncate px-4">{userName}</span>}
        </div>

        {/* Menu */}
        <nav className="px-2 space-y-1 text-gray-900 flex-1 overflow-y-auto mt-2">
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
            title="Messages" // New Sidebar Item
            href="/producer/messages"
            icon={<MessageSquare size={20} />}
            collapsed={collapsed}
            active={pathname === "/producer/messages"}
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
        <div className="p-2 border-t shrink-0">
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
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg hover:bg-gray-200 text-black"
            >
              ☰
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Producer Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden md:block">
              <p className="font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">Producer</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div >
    </div >
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
      ${active
          ? "bg-blue-100 text-blue-700"
          : "hover:bg-gray-100 text-gray-900"
        }`}
    >
      <span className="text-blue-600">{icon}</span>
      {!collapsed && <span className="font-medium">{title}</span>}
    </Link>
  );
}
