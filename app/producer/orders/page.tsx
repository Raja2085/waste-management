"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("producer_id", user.id);

    setOrders(data || []);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow text-black">
      <h2 className="font-semibold mb-4">Orders</h2>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th>Product</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b">
              <td>{o.product_name}</td>
              <td>{o.quantity}</td>
              <td>₹{o.price}</td>
              <td>{o.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
