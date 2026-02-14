"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import {
  MapPin,
  Loader2,
  User,
  Building,
  Phone,
  Mail,
  Check,
  ShoppingBag,
  Calendar,
  Clock
} from "lucide-react";

const tabs = ["Account Info", "Address Details", "Recent Activity"];

type Profile = {
  company_name: string;
  phone: string;
  address: string;
  state: string;
  district: string;
  email: string;
  profile_image: string;
};

export default function ConsumerProfilePage() {
  const [activeTab, setActiveTab] = useState("Account Info");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [profile, setProfile] = useState<Profile>({
    company_name: "",
    phone: "",
    address: "",
    state: "",
    district: "",
    email: "",
    profile_image: "",
  });

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const init = async () => {
      await fetchProfile();
      await fetchOrders();
      setLoading(false);
    };
    init();
  }, []);

  const fetchProfile = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data } = await supabase
      .from("consumer_profiles")
      .select("*")
      .eq("id", auth.user.id)
      .single();

    // If profile does not exist → create it
    if (!data) {
      await supabase.from("consumer_profiles").insert({
        id: auth.user.id,
        email: auth.user.email,
      });

      setProfile({
        company_name: "",
        phone: "",
        address: "",
        state: "",
        district: "",
        email: auth.user.email || "",
        profile_image: "",
      });
    } else {
      // Ensure email is always synced
      if (!data.email) {
        await supabase
          .from("consumer_profiles")
          .update({ email: auth.user.email })
          .eq("id", auth.user.id);
      }

      setProfile({
        company_name: data.company_name || "",
        phone: data.phone || "",
        address: data.address || "",
        state: data.state || "",
        district: data.district || "",
        email: auth.user.email || "",
        profile_image: data.profile_image || "",
      });
    }
  };

  /* ================= FETCH ORDERS ================= */
  const fetchOrders = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data } = await supabase
      .from("orders")
      .select(`
        id, 
        status, 
        total_amount, 
        created_at,
        products (name)
      `)
      .eq("buyer_id", auth.user.id) // Corrected from user_id to buyer_id based on schema
      .order("created_at", { ascending: false });

    setOrders(data || []);
  };

  /* ================= IMAGE UPLOAD ================= */
  const uploadImage = async (file: File) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const path = `consumers/${auth.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

    await supabase.storage
      .from("profile-images")
      .upload(path, file, { upsert: true });

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(path);

    await supabase.from("consumer_profiles").upsert({
      id: auth.user.id,
      profile_image: data.publicUrl,
    });

    setProfile({ ...profile, profile_image: data.publicUrl });
  };

  /* ================= SAVE PROFILE ================= */
  const saveProfile = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    await supabase.from("consumer_profiles").upsert({
      id: auth.user.id,
      company_name: profile.company_name,
      phone: profile.phone,
      address: profile.address,
      state: profile.state,
      district: profile.district,
      email: profile.email,
    });

    setEditing(false);
    setSuccessMsg("Profile updated successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  /* ================= GET LOCATION ================= */
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

          setProfile((prev) => ({
            ...prev,
            address: data.display_name || "",
            state: data.address?.state || "",
            district: data.address?.state_district || data.address?.county || "",
          }));
        } catch (error) {
          console.error("Error fetching location:", error);
          alert("Failed to fetch address details.");
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error("Error getting user location:", error);
        setLocationLoading(false);
        alert("Unable to retrieve your location.");
      }
    );
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-black dark:text-gray-100 p-6 max-w-7xl mx-auto relative">

      {/* SUCCESS TOAST */}
      {successMsg && (
        <div className="fixed top-24 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right z-50">
          <Check size={20} />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* HEADER Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Your Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account settings and view order history.</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* HEADER INFO CARD */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <label className={`relative group ${editing ? "cursor-pointer" : ""}`}>
          <img
            src={profile.profile_image || "/placeholder.png"}
            className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg bg-gray-100 dark:bg-gray-700"
            alt="Profile"
          />
          {editing && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-medium">Change</span>
            </div>
          )}
          <input
            type="file"
            hidden
            accept="image/*"
            disabled={!editing}
            onChange={(e) =>
              e.target.files && uploadImage(e.target.files[0])
            }
          />
        </label>

        <div className="text-center md:text-left flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile.company_name || "Consumer Account"}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center md:justify-start gap-2">
            <Mail size={16} /> {profile.email}
          </p>
          <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
            <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium border border-green-100 dark:border-green-800">
              Consumer Account
            </span>
            {profile.state && (
              <span className="px-3 py-1 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm border border-gray-200 dark:border-gray-600 flex items-center gap-1">
                <MapPin size={12} /> {profile.district ? `${profile.district}, ` : ""}{profile.state}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-8">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === t
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
            >
              {t}
              {activeTab === t && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-8 shadow-sm min-h-[400px]">

        {/* ================= ACCOUNT INFO ================= */}
        {activeTab === "Account Info" && (
          <div className="space-y-8 max-w-3xl animate-in fade-in delay-75">
            <div className="grid grid-cols-1 gap-6">

              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b dark:border-gray-700 pb-2">Personal Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Name / Company</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    disabled={!editing}
                    value={profile.company_name}
                    onChange={(e) =>
                      setProfile({ ...profile, company_name: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100"
                    placeholder="Enter your name or company"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      disabled
                      value={profile.email}
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      disabled={!editing}
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>
            </div>

            {editing && (
              <div className="pt-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="px-6 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= ADDRESS DETAILS ================= */}
        {activeTab === "Address Details" && (
          <div className="space-y-6 max-w-3xl animate-in fade-in delay-75">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delivery Location</h3>
              {editing && (
                <button
                  onClick={handleUseLocation}
                  disabled={locationLoading}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium px-4 py-2 bg-blue-50 rounded-lg transition-colors border border-blue-100"
                >
                  {locationLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <MapPin size={16} />
                  )}
                  Use Current Location
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State</label>
                <input
                  disabled={!editing}
                  value={profile.state}
                  onChange={(e) =>
                    setProfile({ ...profile, state: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60 text-gray-900 dark:text-gray-100"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">District</label>
                <input
                  disabled={!editing}
                  value={profile.district}
                  onChange={(e) =>
                    setProfile({ ...profile, district: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60 text-gray-900 dark:text-gray-100"
                  placeholder="District"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Address</label>
              <textarea
                disabled={!editing}
                value={profile.address}
                onChange={(e) =>
                  setProfile({ ...profile, address: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60 min-h-[120px] resize-none text-gray-900 dark:text-gray-100"
                placeholder="Enter full street address for deliveries"
              />
            </div>

            {editing && (
              <div className="pt-6 border-t mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="px-6 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                >
                  Save Address
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= RECENT ACTIVITY ================= */}
        {activeTab === "Recent Activity" && (
          <div className="space-y-6 animate-in fade-in delay-75">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Order History</h3>
            </div>

            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400">
                  <ShoppingBag size={24} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No orders yet</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">
                  Once you purchase waste materials, your order history will appear here.
                </p>
                <a href="/consumer/products" className="mt-6 text-blue-600 font-medium hover:underline">
                  Browse Marketplace &rarr;
                </a>
              </div>
            ) : (
              <div className="overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Total Amount</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-gray-500">
                          #{o.id.slice(0, 8)}...
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                          {o.products?.name || "Unknown Product"}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            {new Date(o.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">
                          ₹{o.total_amount?.toLocaleString() || "0"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${o.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              o.status === 'Approved' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                o.status === 'Rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
