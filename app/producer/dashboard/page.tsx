"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export default function ProducerDashboard() {
  const [stats, setStats] = useState({
    customers: 0,
    orders: 0,
    revenue: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: orders } = await supabase
      .from("orders")
      .select("price")
      .eq("producer_id", user.id);

    const revenue =
      orders?.reduce((sum, o) => sum + Number(o.price), 0) || 0;

    setStats({
      customers: 12, // dummy for now
      orders: orders?.length || 0,
      revenue,
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 text-black">
        <Card title="Customers" value={stats.customers} />
        <Card title="Orders" value={stats.orders} />
        <Card title="Revenue" value={`₹${stats.revenue}`} />
      </div>

      <div className="bg-white p-6 rounded-xl shadow text-black">
        <h2 className="font-semibold mb-4">Monthly Sales</h2>
        <div className="h-64 flex items-end gap-3">
          {[40,60,50,70,30,55,65].map((h, i) => (
            <div
              key={i}
              className="w-8 bg-blue-600 rounded"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-black-500 text-sm">{title}</p>
      <h3 className="text-2xl font-bold">{value}</h3>
    </div>
  );
}
