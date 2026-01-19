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
import { useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
  };

  /* ✅ FETCH USER NAME */
  const { useEffect } = require("react");
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
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* SIDEBAR */}
      <aside
        className={`bg-white shadow transition-all duration-300 ease-in-out flex flex-col
          ${collapsed ? "w-16" : "w-64"}`}
      >
        {/* HEADER */}
        <div className="h-16 flex items-center justify-between px-4 border-b shrink-0">
          {!collapsed && (
            <span className="font-bold text-blue-600 text-lg truncate" title={userName}>
              {userName}
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-600 hover:text-blue-600"
          >
            <Menu size={22} />
          </button>
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
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
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
      <main className="flex-1 flex flex-col transition-all duration-300 overflow-hidden">
        {/* New Top Header for Consumer */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-end px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden md:block">
              <p className="font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">Consumer</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
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
