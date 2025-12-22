"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export default function AnalyticsPage() {
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data } = await supabase
        .from("producer_top_products")
        .select("*");

      setTopProducts(data || []);
    };

    fetchAnalytics();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-black">
        Analytics
      </h1>

      <div className="bg-white rounded-lg shadow p-4 text-black">
        <h2 className="text-lg font-semibold mb-4">
          Top Selling Products
        </h2>

        <table className="w-full border">
          <thead>
            <tr className="bg-black-100">
              <th className="p-2 text-black text-left">Product</th>
              <th className="p-2 text-black">Sold</th>
              <th className="p-2 text-black">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{p.product_name}</td>
                <td className="p-2 text-center">{p.total_sold}</td>
                <td className="p-2 text-center">
                  ₹{p.revenue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
