"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import {
  Package,
  Upload,
  MapPin,
  X,
  Edit,
  Trash2,
  Plus,
  Loader2,
  Image as ImageIcon,
  DollarSign,
  Scale,
  Check,
  Brain,
  Sparkles,
  Users,
  Tag,
  Activity,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, slideUp } from "@/src/lib/animations";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  description: string | null;
  address: string | null;
  district: string | null;
  state: string | null;
  image_urls: string[] | null;
  created_at?: string;
  // AI fields
  material_type?: string | null;
  quality?: string | null;
  recyclability_score?: number | null;
  ai_keywords?: string[] | null;
  ai_confidence?: number | null;
  ai_processed_at?: string | null;
};

type AIResult = {
  material_type: string;
  quality: string;
  recyclability_score: number;
  keywords: string[];
  confidence: number;
};

type MatchedConsumer = {
  consumer_id: string;
  consumer_name: string;
  relevance_score: number;
  match_reasons: string[];
};

const categories = [
  "Plastic",
  "Metal",
  "Paper",
  "Organic",
  "Electronic",
  "Glass",
  "Textile",
  "General",
];

const tabs = ["Active Listings", "Sold History", "Upload Waste"];

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("Active Listings");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    category: "Plastic",
    price: "",
    quantity: "",
    description: "",
    address: "",
    district: "",
    state: "",
  });

  const [locationLoading, setLocationLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // AI State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiError, setAiError] = useState("");
  const [matchedConsumers, setMatchedConsumers] = useState<MatchedConsumer[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [showMatches, setShowMatches] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  /* ================= FETCH PRODUCTS ================= */
  const fetchProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("producer_id", user.id)
      .order("created_at", { ascending: false });

    setProducts(data || []);
    setLoading(false);
  };

  /* ================= HANDLE FORM CHANGE ================= */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /* ================= UPLOAD IMAGES ================= */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages((prev) => [...prev, ...files]);

      // Create preview URLs
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const processImageUploads = async (productId: string) => {
    const uploadedUrls: string[] = [];

    for (const file of images) {
      const path = `${productId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file);

      if (!error) {
        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }
    }
    return uploadedUrls;
  };

  /* ================= AI ANALYSIS ================= */
  const triggerAIAnalysis = async (productId: string, imageUrl: string, description: string, quantity: number) => {
    setAiAnalyzing(true);
    setAiError("");
    setAiResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          image_url: imageUrl,
          description: description,
          quantity: quantity,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "AI analysis failed");
      }

      const data = await response.json();
      setAiResult({
        material_type: data.material_type,
        quality: data.quality,
        recyclability_score: data.recyclability_score,
        keywords: data.keywords,
        confidence: data.confidence,
      });
    } catch (err: any) {
      console.error("AI analysis error:", err);
      setAiError(err.message || "Failed to analyze waste. Is the AI service running?");
    } finally {
      setAiAnalyzing(false);
    }
  };

  /* ================= MATCH CONSUMERS ================= */
  const fetchMatchedConsumers = async (productId: string) => {
    setMatchLoading(true);
    setMatchedConsumers([]);

    try {
      const response = await fetch("/api/match-consumers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });

      const data = await response.json();
      setMatchedConsumers(data.matches || []);
      setShowMatches(true);
    } catch (err) {
      console.error("Match error:", err);
    } finally {
      setMatchLoading(false);
    }
  };

  /* ================= SUBMIT FORM ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      let productId = editingId;
      let currentImageUrls: string[] = [];

      // If editing, get existing images
      if (editingId) {
        const product = products.find(p => p.id === editingId);
        currentImageUrls = product?.image_urls || [];

        const { error } = await supabase
          .from("products")
          .update({
            name: formData.name,
            category: formData.category,
            price: Number(formData.price),
            quantity: Number(formData.quantity),
            description: formData.description,
            address: formData.address,
            district: formData.district,
            state: formData.state,
          })
          .eq("id", editingId);

        if (error) throw error;
      } else {
        // Create new product
        const { data, error } = await supabase
          .from("products")
          .insert({
            producer_id: user.id,
            name: formData.name,
            category: formData.category,
            price: Number(formData.price),
            quantity: Number(formData.quantity),
            description: formData.description,
            address: formData.address,
            district: formData.district,
            state: formData.state,
          })
          .select()
          .single();

        if (error) throw error;
        productId = data.id;
      }

      // Upload new images if any
      let finalUrls = [...currentImageUrls];
      if (productId && images.length > 0) {
        const newUrls = await processImageUploads(productId);
        finalUrls = [...currentImageUrls, ...newUrls];

        await supabase
          .from("products")
          .update({ image_urls: finalUrls })
          .eq("id", productId);
      }

      setSuccessMsg(editingId ? "Product updated successfully!" : "Product listed successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);

      setUploading(false);

      // Trigger AI analysis automatically after upload
      if (productId) {
        const imageUrl = finalUrls.length > 0 ? finalUrls[0] : "";
        await triggerAIAnalysis(productId, imageUrl, formData.description, Number(formData.quantity));
      }

      fetchProducts();

    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product.");
      setUploading(false);
    }
  };

  /* ================= ACTIONS ================= */
  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      category: product.category,
      price: String(product.price),
      quantity: String(product.quantity),
      description: product.description || "",
      address: product.address || "",
      district: product.district || "",
      state: product.state || "",
    });
    setImages([]);
    setPreviewUrls(product.image_urls || []);
    setAiResult(null);
    setAiError("");
    setMatchedConsumers([]);
    setShowMatches(false);
    setActiveTab("Upload Waste");
  };

  const handleDelete = async (id: string, imageUrls: string[] | null) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    // Delete images
    if (imageUrls && imageUrls.length > 0) {
      const paths = imageUrls.map(url => {
        const match = url.match(/\/product-images\/(.*)/);
        return match ? match[1] : null;
      }).filter(Boolean) as string[];

      if (paths.length > 0) {
        await supabase.storage.from("product-images").remove(paths);
      }
    }

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== id));
      setSuccessMsg("Listing deleted.");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      category: "Plastic",
      price: "",
      quantity: "",
      description: "",
      address: "",
      district: "",
      state: "",
    });
    setImages([]);
    setPreviewUrls([]);
    setAiResult(null);
    setAiError("");
    setMatchedConsumers([]);
    setShowMatches(false);
  };

  /* ================= LOCATION ================= */
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          setFormData(prev => ({
            ...prev,
            address: data.display_name || "",
            district: data.address?.state_district || data.address?.county || "",
            state: data.address?.state || "",
          }));
        } catch (err) {
          console.error(err);
          alert("Failed to fetch location address.");
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        alert("Unable to retrieve location.");
        setLocationLoading(false);
      }
    );
  };

  /* ================= HELPER: Quality color ================= */
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "high": return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
      case "medium": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low": return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
      default: return "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6 text-black dark:text-gray-100 relative min-h-screen">

      {/* SUCCESS TOAST */}
      {successMsg && (
        <div className="fixed top-24 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right z-50">
          <Check size={20} />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* HEADER Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Waste Listings</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your waste products and listings.</p>
        </div>

        {/* TAB TOGGLES */}
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex gap-1 overflow-x-auto w-full md:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab === "Upload Waste") resetForm(); }}
              className={`whitespace-nowrap shrink-0 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                ? "bg-white dark:bg-gray-600 text-foreground dark:text-foreground/60 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ================= LISTINGS & HISTORY TABS ================= */}
      <AnimatePresence mode="wait">
        {(activeTab === "Active Listings" || activeTab === "Sold History") && (
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-foreground" size={40} />
            </div>
          ) : (() => {
            // Filter products based on active tab
            const displayedProducts = products.filter(p =>
              activeTab === "Active Listings"
                ? (p as any).status === "available" || !(p as any).status // Default to available if missing
                : (p as any).status === "sold"
            );

            if (displayedProducts.length === 0) {
              return (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                  <Package className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={64} />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                    {activeTab === "Active Listings" ? "No active listings found" : "No sold history found"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">
                    {activeTab === "Active Listings" ? "Start by uploading your waste materials." : "Your sold items will appear here."}
                  </p>
                  {activeTab === "Active Listings" && (
                    <button
                      onClick={() => setActiveTab("Upload Waste")}
                      className="bg-foreground text-background px-6 py-2 rounded-lg hover:bg-foreground/90 hover:text-background transition"
                    >
                      Create Listing
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 text-sm uppercase text-gray-500 dark:text-gray-400 font-medium">
                    <tr>
                      <th className="px-6 py-4 pointer-events-none">Image</th>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">AI Type</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Quantity</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <motion.tbody 
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="divide-y divide-gray-100"
                  >
                    {displayedProducts.map((product) => (
                      <motion.tr 
                        variants={slideUp}
                        key={product.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group border-b dark:border-gray-700 last:border-0"
                      >
                        <td className="px-6 py-4 w-20">
                          <img
                            src={product.image_urls?.[0] || "/placeholder.png"}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover border bg-gray-100"
                          />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                          {product.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-foreground/5 dark:bg-foreground/15 text-foreground dark:text-foreground/50">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {product.material_type ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                              <Sparkles size={10} />
                              {product.material_type}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                          ₹{product.price}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {product.quantity} kg
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-sm max-w-[200px] truncate">
                          {[product.district, product.state].filter(Boolean).join(", ") || "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {activeTab === "Active Listings" ? (
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(product)}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-foreground dark:hover:text-foreground/60 hover:bg-foreground/5 dark:hover:bg-foreground/10 rounded-lg transition"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id, product.image_urls)}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              Sold
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            );
          })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= UPLOAD FORM TAB ================= */}
      <AnimatePresence mode="wait">
        {activeTab === "Upload Waste" && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-4xl mx-auto space-y-6"
          >
          {/* Upload Form Card */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-8 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {editingId ? "Edit Listing" : "Create New Listing"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Fill in the details to list your waste for sale. AI will automatically analyze your upload.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT COL: IMAGES */}
            <div className="lg:col-span-1 space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Images</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="bg-foreground/5 dark:bg-foreground/15 text-foreground dark:text-foreground/60 p-3 rounded-full mb-3">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Click to upload</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">SVG, PNG, JPG (Max 3)</p>
              </div>

              {/* Previews */}
              <div className="grid grid-cols-3 gap-2">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border group">
                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COL: FIELDS */}
            <div className="lg:col-span-2 space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Name</label>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Mixed Plastic Scrap"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-foreground/50 focus:outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-foreground/50 focus:outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price (₹)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      required
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-foreground/50 focus:outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity (kg)</label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      required
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-foreground/50 focus:outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the condition and quality of the waste..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-foreground/50 focus:outline-none transition resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              {/* LOCATION SECTION */}
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-4 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <label className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <MapPin size={18} className="text-foreground dark:text-foreground/60" /> Location Details
                  </label>
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    disabled={locationLoading}
                    className="text-xs font-semibold text-foreground hover:text-foreground flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border shadow-sm transition"
                  >
                    {locationLoading ? <Loader2 size={12} className="animate-spin" /> : "📍"} Detect Location
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <input
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    placeholder="District"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Full Street Address"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("Active Listings")}
                  className="px-6 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || aiAnalyzing}
                  className="bg-foreground text-background px-8 py-2.5 rounded-lg font-medium hover:bg-foreground/90 hover:text-background transition shadow-lg shadow-foreground/20 disabled:opacity-70 flex items-center gap-2"
                >
                  {uploading && <Loader2 size={18} className="animate-spin" />}
                  {editingId ? "Update Listing" : "Publish Listing"}
                </button>
              </div>
            </div>

          </form>
          </div>

          {/* ================= AI ANALYSIS SECTION ================= */}
          <AnimatePresence>
            {/* AI Analyzing Spinner */}
            {aiAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-8 rounded-2xl shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                    <Brain className="absolute inset-0 m-auto" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">AI is Analyzing Your Waste...</h3>
                    <p className="text-white/80 text-sm mt-1">
                      Running image classification (CNN) and text analysis (NLP) to classify your waste material.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* AI Error */}
            {aiError && !aiAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-2xl"
              >
                <p className="text-red-700 dark:text-red-400 font-medium">⚠️ AI Analysis Failed</p>
                <p className="text-red-600 dark:text-red-500 text-sm mt-1">{aiError}</p>
                <p className="text-red-500 dark:text-red-600 text-xs mt-2">Make sure the Python AI service is running at localhost:8000</p>
              </motion.div>
            )}

            {/* AI Results Card */}
            {aiResult && !aiAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 border-b dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-xl">
                        <Sparkles size={22} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">AI Classification Results</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Powered by CNN Image Recognition & NLP</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{aiResult.confidence}%</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Confidence</p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                  {/* Material Type + Quality */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Material Type</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100 capitalize">{aiResult.material_type}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Quality</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold capitalize ${getQualityColor(aiResult.quality)}`}>
                        {aiResult.quality}
                      </span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">AI Confidence</p>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{aiResult.confidence}%</p>
                    </div>
                  </div>

                  {/* Recyclability Score Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Activity size={16} className="text-green-500" />
                        Recyclability Score
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{aiResult.recyclability_score}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${aiResult.recyclability_score}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${getScoreColor(aiResult.recyclability_score)}`}
                      />
                    </div>
                  </div>

                  {/* Keywords */}
                  {aiResult.keywords.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <Tag size={16} className="text-blue-500" />
                        Detected Keywords
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {aiResult.keywords.map((keyword, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Match Consumers Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        const latestProduct = products.find(p => p.material_type === aiResult.material_type);
                        const productId = editingId || latestProduct?.id;
                        if (productId) fetchMatchedConsumers(productId);
                      }}
                      disabled={matchLoading}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {matchLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Users size={18} />
                      )}
                      {matchLoading ? "Finding Matches..." : "Find Matched Consumers"}
                    </button>
                  </div>
                </div>

                {/* Matched Consumers Section */}
                <AnimatePresence>
                  {showMatches && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t dark:border-gray-700 overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Users size={18} className="text-purple-600 dark:text-purple-400" />
                            Matched Consumers ({matchedConsumers.length})
                          </h4>
                          <button
                            onClick={() => setShowMatches(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            <ChevronUp size={18} />
                          </button>
                        </div>

                        {matchedConsumers.length === 0 ? (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-6">
                            No matching consumers found. Consumers can set their requirements to be matched.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {matchedConsumers.map((consumer, i) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center font-bold text-sm">
                                    #{i + 1}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{consumer.consumer_name || "Unknown"}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {consumer.match_reasons.join(" • ")}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{consumer.relevance_score}%</span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">match</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
