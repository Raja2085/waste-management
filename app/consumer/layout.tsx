"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingBag,
  Truck,
  User,
  LogOut,
  LayoutDashboard,
  Menu,
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

  const menu = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/consumer" },
    { name: "Place Order", icon: ShoppingBag, path: "/consumer/place-order" },
    { name: "My Orders", icon: Truck, path: "/consumer/orders" },
    { name: "Profile", icon: User, path: "/consumer/profile" },
    
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      
      {/* Sidebar */}
      <aside
        className={`bg-white shadow transition-all duration-300 ease-in-out
          ${collapsed ? "w-16" : "w-64"}`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {!collapsed && (
            <span className="font-bold text-blue-600 text-lg">
              Consumer Panel
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-600 hover:text-blue-600"
          >
            <Menu size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1">
          {menu.map((item) => {
            const active = pathname === item.path;

            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition
                  ${
                    active
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

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 w-full"
          >
            <LogOut size={20} />
            {!collapsed && <span>Logout</span>}
          </button>
        </nav>
      </aside>

      {/* Main Content (NO margin-left ❌) */}
      <main className="flex-1 p-6 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
