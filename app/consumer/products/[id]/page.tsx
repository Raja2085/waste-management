"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Tag, Package, Phone, CheckCircle, Loader2, Navigation, Sparkles, Activity } from "lucide-react";
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
  // AI fields
  material_type?: string | null;
  quality?: string | null;
  recyclability_score?: number | null;
  ai_keywords?: string[] | null;
  ai_confidence?: number | null;
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
          className="text-foreground hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-4 px-4 sm:px-6 lg:px-8 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto">

        {/* 🔙 Back Button */}
        <button
          onClick={() => router.back()}
          className="group inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Marketplace
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-12">

            {/* 🖼️ Left Column: Image Gallery */}
            <div className="p-4 lg:p-6 bg-gray-50 border-r border-gray-100 flex flex-col items-center">
              <div className="w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-200 mb-4">
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

              {/* View Directions Button below Image */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => {
                    if (product) {
                      const addressString = [product.address, product.district, product.state].filter(Boolean).join(", ") + ", India";
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressString)}`, '_blank');
                    }
                  }}
                  className="w-fit bg-blue-50 text-blue-600 border border-blue-200 rounded-lg py-2 px-4 font-medium text-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" /> View Direction
                </button>
              </div>
            </div>

            {/* 📝 Right Column: Product Info */}
            <div className="p-4 lg:p-6 flex flex-col">

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-foreground/5 text-foreground uppercase tracking-wide">
                    {product.category}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-2">
                  {product.name}
                </h1>

                <div className="flex items-center text-gray-500 text-sm gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {[product.address, product.district, product.state].filter(Boolean).join(", ")}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500">Price per kg</span>
                  <span className="text-2xl font-bold text-gray-900">₹ {product.price}</span>
                </div>
                <div className="w-full h-px bg-gray-200 my-3"></div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="w-4 h-4" /> Available Quantity
                  </span>
                  <span className="font-semibold text-gray-900">{product.quantity} kg</span>
                </div>
              </div>

              <div className="prose prose-sm text-gray-600 mb-4">
                <h3 className="text-gray-900 font-semibold mb-1 text-sm">Description</h3>
                <p className="text-sm">{product.description || "No specific description provided by the seller."}</p>
              </div>

              {/* AI Classification Section */}
              {product.material_type && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-2xl p-4 mb-4 border border-purple-100 dark:border-purple-900/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Classification</h3>
                    {product.ai_confidence && (
                      <span className="ml-auto text-xs font-medium text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                        {product.ai_confidence}% confident
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Material</p>
                      <p className="text-sm font-semibold text-gray-900 capitalize">{product.material_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Quality</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        product.quality === 'high' ? 'bg-green-100 text-green-700' :
                        product.quality === 'low' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {product.quality}
                      </span>
                    </div>
                  </div>

                  {/* Recyclability Bar */}
                  {product.recyclability_score != null && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-green-500" /> Recyclability
                        </span>
                        <span className="text-xs font-bold text-gray-900">{product.recyclability_score}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            product.recyclability_score >= 70 ? 'bg-green-500' :
                            product.recyclability_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${product.recyclability_score}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Keywords */}
                  {product.ai_keywords && product.ai_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {product.ai_keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col items-center gap-3">

                {purchaseSuccess ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center w-full max-w-sm">
                    <div className="flex items-center justify-center gap-2 text-green-700 font-bold text-lg mb-1">
                      <CheckCircle className="w-6 h-6" /> Request Sent!
                    </div>
                    <p className="text-sm text-green-600">The producer has been notified of your interest.</p>
                  </div>
                ) : (
                  <button
                    onClick={handleRequestPurchase}
                    disabled={buying}
                    className="w-full max-w-xs bg-gray-900 text-white rounded-xl py-3 font-medium text-base hover:bg-black transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {buying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      "Request Purchase"
                    )}
                  </button>
                )}

                <button
                  onClick={() => router.push(`/consumer/messages?sellerId=${product.producer_id}&productName=${encodeURIComponent(product.name)}`)}
                  className="w-full max-w-xs bg-white text-gray-900 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
