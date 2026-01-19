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
  Check
} from "lucide-react";

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
      if (productId && images.length > 0) {
        const newUrls = await processImageUploads(productId);
        const finalUrls = [...currentImageUrls, ...newUrls]; // Append new to existing

        await supabase
          .from("products")
          .update({ image_urls: finalUrls })
          .eq("id", productId);
      }

      setSuccessMsg(editingId ? "Product updated successfully!" : "Product listed successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);

      resetForm();
      fetchProducts();
      setActiveTab("Active Listings");

    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product.");
    } finally {
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
    setPreviewUrls(product.image_urls || []); // Show existing images as preview (note: strictly proper logic would treat File vs URL differently but simple toggle for now)
    setActiveTab("Upload Waste");
  };

  const handleDelete = async (id: string, imageUrls: string[] | null) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    // Delete images
    if (imageUrls && imageUrls.length > 0) {
      const paths = imageUrls.map(url => {
        // Extract path after /product-images/ 
        // Example: .../product-images/123/file.jpg -> 123/file.jpg
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

  return (
    <div className="space-y-6 text-black relative min-h-screen">

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
          <h1 className="text-3xl font-bold text-gray-900">Waste Listings</h1>
          <p className="text-gray-500">Manage your waste products and listings.</p>
        </div>

        {/* TAB TOGGLES */}
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab === "Upload Waste") resetForm(); }}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ================= LISTINGS & HISTORY TABS ================= */}
      {(activeTab === "Active Listings" || activeTab === "Sold History") && (
        <div className="animate-in fade-in duration-300">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-600" size={40} />
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
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                  <Package className="mx-auto text-gray-300 mb-4" size={64} />
                  <h3 className="text-xl font-medium text-gray-900">
                    {activeTab === "Active Listings" ? "No active listings found" : "No sold history found"}
                  </h3>
                  <p className="text-gray-500 mt-2 mb-6">
                    {activeTab === "Active Listings" ? "Start by uploading your waste materials." : "Your sold items will appear here."}
                  </p>
                  {activeTab === "Active Listings" && (
                    <button
                      onClick={() => setActiveTab("Upload Waste")}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Create Listing
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b text-sm uppercase text-gray-500 font-medium">
                    <tr>
                      <th className="px-6 py-4 pointer-events-none">Image</th>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Quantity</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayedProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 w-20">
                          <img
                            src={product.image_urls?.[0] || "/placeholder.png"}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover border bg-gray-100"
                          />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {product.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-700">
                          ₹{product.price}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
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
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id, product.image_urls)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ================= UPLOAD FORM TAB ================= */}
      {activeTab === "Upload Waste" && (
        <div className="max-w-4xl mx-auto bg-white border rounded-2xl shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 border-b bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900">
              {editingId ? "Edit Listing" : "Create New Listing"}
            </h2>
            <p className="text-gray-500 text-sm mt-1">Fill in the details to list your waste for sale.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT COL: IMAGES */}
            <div className="lg:col-span-1 space-y-4">
              <label className="block text-sm font-medium text-gray-700">Product Images</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="bg-blue-50 text-blue-600 p-3 rounded-full mb-3">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-medium text-gray-900">Click to upload</p>
                <p className="text-xs text-gray-500 mt-1">SVG, PNG, JPG (Max 3)</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Mixed Plastic Scrap"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition bg-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      required
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (kg)</label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      required
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the condition and quality of the waste..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none"
                />
              </div>

              {/* LOCATION SECTION */}
              <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-200">
                <div className="flex justify-between items-center">
                  <label className="font-medium text-gray-900 flex items-center gap-2">
                    <MapPin size={18} className="text-blue-600" /> Location Details
                  </label>
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    disabled={locationLoading}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border shadow-sm transition"
                  >
                    {locationLoading ? <Loader2 size={12} className="animate-spin" /> : "📍"} Detect Location
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    placeholder="District"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Full Street Address"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("Active Listings")}
                  className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 disabled:opacity-70 flex items-center gap-2"
                >
                  {uploading && <Loader2 size={18} className="animate-spin" />}
                  {editingId ? "Update Listing" : "Publish Listing"}
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
