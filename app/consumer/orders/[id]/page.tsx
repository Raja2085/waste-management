"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Package,
    MapPin,
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
    Truck,
    MessageSquare
} from "lucide-react";
import Link from "next/link";

type OrderDetails = {
    id: string;
    created_at: string;
    status: "Pending" | "Completed" | "Approved" | "Rejected";
    quantity: number;
    total_price: number;
    buyer_name: string;
    products: {
        id: string;
        name: string;
        description: string;
        price: number;
        image_urls: string[] | null;
        category: string;
        address: string;
        district: string;
        state: string;
    };
};

export default function OrderDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrderDetails();
    }, []);

    const fetchOrderDetails = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from("orders")
            .select(`
        *,
        products (
          id,
          name,
          description,
          price,
          image_urls,
          category,
          address,
          district,
          state
        )
      `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("Error fetching order:", error);
        } else {
            setOrder(data);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Order not found</h1>
                <button onClick={() => router.back()} className="text-blue-600 hover:underline">
                    Go Back
                </button>
            </div>
        );
    }

    // Status Progress Logic
    const steps = ["Pending", "Approved", "Completed"];
    const currentStepIndex = steps.indexOf(order.status) === -1 ? 0 : steps.indexOf(order.status);
    const isRejected = order.status === "Rejected";

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-800">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header Navigation */}
                <div className="flex items-center gap-4">
                    <Link href="/consumer/orders" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
                        <p className="text-gray-500 text-xs">ID: {order.id}</p>
                    </div>
                </div>

                {/* STATUS CARD */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Status</h2>

                    {isRejected ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                            <XCircle size={24} />
                            <div>
                                <p className="font-bold">Order Rejected</p>
                                <p className="text-sm">The producer has declined this request. Please contact support or try another listing.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="relative flex justify-between">
                            {/* Progress Bar Background */}
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 z-0" />

                            {/* Active Progress */}
                            <div
                                className="absolute top-1/2 left-0 h-1 bg-green-500 -translate-y-1/2 z-0 transition-all duration-500"
                                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                            />

                            {steps.map((step, idx) => {
                                const isCompleted = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;

                                return (
                                    <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${isCompleted ? "bg-green-500 text-white shadow-lg shadow-green-200" : "bg-white border-2 border-gray-200 text-gray-400"
                                            }`}>
                                            {isCompleted ? <CheckCircle size={14} /> : idx + 1}
                                        </div>
                                        <span className={`text-xs font-medium ${isCurrent ? "text-gray-900" : "text-gray-400"}`}>
                                            {step}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* PRODUCT INFO */}
                    <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900">Items Ordered</h3>
                        </div>
                        <div className="p-6 flex gap-4">
                            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                                <img
                                    src={order.products.image_urls?.[0] || "/placeholder.png"}
                                    alt={order.products.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">{order.products.name}</h4>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mt-1">
                                            {order.products.category}
                                        </span>
                                    </div>
                                    <p className="font-bold text-gray-900">₹{order.total_price.toLocaleString()}</p>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500 text-xs">Quantity</p>
                                        <p className="font-medium">{order.quantity} kg</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Price per kg</p>
                                        <p className="font-medium">₹{order.products.price}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Total Section */}
                        <div className="bg-gray-50 p-6 flex justify-between items-center border-t border-gray-100">
                            <span className="font-medium text-gray-600">Total Amount</span>
                            <span className="text-xl font-bold text-gray-900">₹{order.total_price.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* SIDEBAR INFO */}
                    <div className="space-y-6">
                        {/* Pickup Location */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <MapPin size={18} className="text-blue-600" /> Pickup Location
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                {(order.products.address || order.products.district) ? (
                                    [order.products.address, order.products.district, order.products.state].filter(Boolean).join(", ")
                                ) : "Location details not available"}
                            </p>
                        </div>

                        {/* Order Info */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <MessageSquare size={18} className="text-purple-600" /> Need Help?
                            </h3>
                            <p className="text-gray-500 text-xs mb-4">Have issues with this order? Contact the seller directly.</p>
                            <button className="w-full py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                                Contact Seller
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
