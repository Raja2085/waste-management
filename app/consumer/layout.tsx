"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Truck,
  User,
  LogOut,
  LayoutDashboard,
  Menu,
  Package, // ✅ NEW ICON
  MessageSquare, // New Icon
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setCollapsed(false);
    }
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
  };

  /* ✅ FETCH USER NAME */
  const [userName, setUserName] = useState("Consumer Panel");
  const [initials, setInitials] = useState("C");

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
          const full = `${first} ${last}`.trim() || user.email?.split("@")[0] || "Consumer";
          setUserName(full);
          setInitials((first[0] || "C").toUpperCase());
        }
      }
    };
    fetchUser();
  }, []);

  /* ✅ SIDEBAR MENU */
  const menu = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/consumer" },
    { name: "Products", icon: Package, path: "/consumer/products" }, // ✅ ADDED
    { name: "Messages", icon: MessageSquare, path: "/consumer/messages" }, // ✅ ADDED
    { name: "My Orders", icon: Truck, path: "/consumer/orders" },
    { name: "Profile", icon: User, path: "/consumer/profile" },
  ];

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-950 flex overflow-hidden">

      {/* Mobile Overlay */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setCollapsed(true)} 
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:relative h-full bg-white dark:bg-gray-900 shadow transition-all duration-300 ease-in-out flex flex-col md:translate-x-0
          ${collapsed ? "-translate-x-full md:w-16" : "translate-x-0 w-64"}`}
      >
        <div className="h-16 flex items-center justify-center text-lg font-bold text-foreground shrink-0 border-b">
          {collapsed ? initials : <span className="truncate px-4">{userName}</span>}
        </div>

        {/* NAVIGATION */}
        <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
          {menu.map((item) => {
            const active = pathname === item.path;

            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition
                  ${active
                    ? "bg-foreground/10 dark:bg-foreground/20 text-foreground dark:text-foreground/60"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }
                `}
              >
                <item.icon size={20} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="p-2 border-t shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 w-full"
          >
            <LogOut size={20} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* New Top Header for Consumer */}
        <header className="h-16 bg-white dark:bg-gray-900 shadow-sm flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-black dark:text-white"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white hidden md:block">
              Consumer Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-sm text-right hidden md:block">
              <p className="font-medium text-gray-900 dark:text-gray-100">{userName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Consumer</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center font-semibold">
              {initials}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
