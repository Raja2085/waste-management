"use client";

import { useState, useEffect } from "react";
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
import { ThemeToggle } from "@/components/theme-toggle";

export default function ProducerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setCollapsed(false);
    }
  }, []);
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
    <div className="h-screen bg-gray-100 dark:bg-gray-950 flex overflow-hidden">

      {/* Mobile Overlay */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setCollapsed(true)} 
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:relative h-full bg-white dark:bg-gray-900 shadow-md transition-all duration-300 flex flex-col md:translate-x-0
        ${collapsed ? "-translate-x-full md:w-16" : "translate-x-0 w-64"}`}
      >
        {/* Logo / Identity */}
        <div className="h-16 flex items-center justify-center text-lg font-bold text-foreground shrink-0 border-b">
          {collapsed ? initials : <span className="truncate px-4">{userName}</span>}
        </div>

        {/* Menu */}
        <nav className="px-2 space-y-1 text-gray-900 dark:text-gray-200 flex-1 overflow-y-auto mt-2">
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
            className="flex items-center gap-3 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 w-full"
          >
            <LogOut size={20} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-gray-900 shadow-sm flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-black dark:text-white"
            >
              ☰
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Producer Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-sm text-right hidden md:block">
              <p className="font-medium text-gray-900 dark:text-gray-100">{userName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Producer</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center font-semibold">
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
          ? "bg-foreground/10 dark:bg-foreground/20 text-foreground dark:text-foreground/60"
          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-200"
        }`}
    >
      <span className="text-foreground dark:text-background0">{icon}</span>
      {!collapsed && <span className="font-medium">{title}</span>}
    </Link>
  );
}
