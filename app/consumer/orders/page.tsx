"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import OrderTrackingMap from "@/components/OrderTrackingMap";

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    loadOrders();

    supabase
      .channel("live-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders()
      )
      .subscribe();
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase.from("orders").select("*");
    setOrders(data || []);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">

      {/* Orders List */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-3">My Orders</h2>

        {orders.map((order) => (
          <div
            key={order.id}
            onClick={() => setSelectedOrder(order)}
            className="border p-3 rounded mb-2 cursor-pointer hover:bg-gray-100"
          >
            <p><b>Status:</b> {order.status}</p>
            <p>{order.pickup_address} ➝ {order.delivery_address}</p>
          </div>
        ))}
      </div>

      {/* Live Map */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-3">Live Tracking</h2>

        {selectedOrder?.driver_lat ? (
          <OrderTrackingMap
            lat={selectedOrder.driver_lat}
            lng={selectedOrder.driver_lng}
          />
        ) : (
          <p>Select an order to track</p>
        )}
      </div>

    </div>
  );
}
