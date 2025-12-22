"use client";

import { useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function PlaceOrder() {
  const router = useRouter();

  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [weight, setWeight] = useState("");
  const [amount, setAmount] = useState("");

  const submitOrder = async () => {
    const { error } = await supabase.from("orders").insert({
      consumer_id: (await supabase.auth.getUser()).data.user?.id,
      pickup_address: pickup,
      delivery_address: delivery,
      weight: Number(weight),
      status: "Pending",
      total_amount: Number(amount),
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Order placed successfully 🚚");
      router.push("/consumer/orders");
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow max-w-md">
      <h2 className="text-xl font-bold mb-4">Place New Order</h2>

      <input
        className="input"
        placeholder="Pickup Location"
        value={pickup}
        onChange={(e) => setPickup(e.target.value)}
      />

      <input
        className="input mt-2"
        placeholder="Delivery Location"
        value={delivery}
        onChange={(e) => setDelivery(e.target.value)}
      />

      <input
        className="input mt-2"
        type="number"
        placeholder="Weight (kg)"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
      />

      <input
        className="input mt-2"
        type="number"
        placeholder="Total Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button
        onClick={submitOrder}
        className="btn-primary mt-4 w-full"
      >
        Submit Order
      </button>
    </div>
  );
}
