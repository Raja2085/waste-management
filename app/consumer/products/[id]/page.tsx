"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Tag, Package, Phone, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  description: string | null;
  address: string | null;
  district: string | null;
  state: string | null;
  image_urls: string[] | null;
  producer_id: string;
};

export default function ProductDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>("");

  // Purchase State
  const [buying, setBuying] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setProduct(data);
      setActiveImage(data.image_urls?.[0] || "/placeholder.png");
    }
    setLoading(false);
  };

  const handleRequestPurchase = async () => {
    if (!product) return;

    setBuying(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to purchase.");
      setBuying(false);
      // router.push("/login"); // Optional: Redirect to login
      return;
    }

    // Optional: Fetch buyer profile details if you have a profiles table
    // const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    const { error } = await supabase.from("orders").insert({
      product_id: product.id,
      producer_id: product.producer_id,
      buyer_id: user.id,
      quantity: product.quantity,
      total_price: product.price * product.quantity, // Simple calculation
      buyer_name: user.email || "Unknown Buyer", // Fallback to email if no profile
      buyer_company: "N/A", // Placeholder
      status: "Pending",
    });

    if (error) {
      console.error("Purchase error:", error);
      alert("Failed to submit purchase request.");
    } else {
      setPurchaseSuccess(true);
    }
    setBuying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-gray-500">Product not found</p>
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto">

        {/* 🔙 Back Button */}
        <button
          onClick={() => router.back()}
          className="group inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Marketplace
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-12">

            {/* 🖼️ Left Column: Image Gallery */}
            <div className="p-6 lg:p-10 bg-gray-50 border-r border-gray-100">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-200 mb-4">
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Thumbnails */}
              {product.image_urls && product.image_urls.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {product.image_urls.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(img)}
                      className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${activeImage === img
                        ? "border-gray-900 ring-2 ring-gray-900/10"
                        : "border-gray-200 hover:border-gray-400"
                        }`}
                    >
                      <img src={img} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 📝 Right Column: Product Info */}
            <div className="p-6 lg:p-10 flex flex-col">

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 uppercase tracking-wide">
                    {product.category}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                  {product.name}
                </h1>

                <div className="flex items-center text-gray-500 text-sm gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {[product.address, product.district, product.state].filter(Boolean).join(", ")}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">Price per kg</span>
                  <span className="text-3xl font-bold text-gray-900">₹ {product.price}</span>
                </div>
                <div className="w-full h-px bg-gray-200 my-4"></div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="w-4 h-4" /> Available Quantity
                  </span>
                  <span className="font-semibold text-gray-900">{product.quantity} kg</span>
                </div>
              </div>

              <div className="prose prose-sm text-gray-600 mb-8">
                <h3 className="text-gray-900 font-semibold mb-2">Description</h3>
                <p>{product.description || "No specific description provided by the seller."}</p>
              </div>

              <div className="mt-auto pt-6 border-t border-gray-100 space-y-3">

                {purchaseSuccess ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-green-700 font-bold text-lg mb-1">
                      <CheckCircle className="w-6 h-6" /> Request Sent!
                    </div>
                    <p className="text-sm text-green-600">The producer has been notified of your interest.</p>
                  </div>
                ) : (
                  <button
                    onClick={handleRequestPurchase}
                    disabled={buying}
                    className="w-full bg-gray-900 text-white rounded-xl py-4 font-semibold text-lg hover:bg-black transition-colors shadow-lg shadow-gray-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {buying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                      </>
                    ) : (
                      "Request Purchase"
                    )}
                  </button>
                )}

                <button
                  onClick={() => router.push(`/consumer/messages?sellerId=${product.producer_id}&productName=${encodeURIComponent(product.name)}`)}
                  className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl py-3 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" /> Contact Seller
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
