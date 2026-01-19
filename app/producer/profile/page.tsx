"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { MapPin, Loader2, User, Building, Phone, Mail, Check } from "lucide-react";

const tabs = ["Account Info", "Address Details", "Recent Activity"];

type ProducerProfile = {
  company_name: string;
  phone: string;
  address: string;
  state: string;
  district: string;
  email: string;
  profile_image: string;
};

export default function ProducerProfilePage() {
  const [activeTab, setActiveTab] = useState("Account Info");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Unified profile state
  const [profile, setProfile] = useState<ProducerProfile>({
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
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    // 1. Fetch base user data
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", auth.user.id)
      .single();

    // 2. Fetch producer profile data
    const { data: producerData } = await supabase
      .from("producer_profiles")
      .select("*")
      .eq("id", auth.user.id)
      .single();

    // Initialize state combining both sources
    setProfile({
      company_name: userData?.company_name || producerData?.company_name || "",
      phone: producerData?.phone || userData?.phone || "",
      address: producerData?.address || "", // Address usually in profile table
      state: userData?.state || "", // State/District often in users based on schema
      district: userData?.district || "",
      email: auth.user.email || "",
      profile_image: producerData?.profile_image || "",
    });

    setLoading(false);
  };

  /* ================= IMAGE UPLOAD ================= */
  const uploadImage = async (file: File) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const path = `producers/${auth.user.id}/${Date.now()}-${file.name}`;

    try {
      await supabase.storage
        .from("profile-images")
        .upload(path, file, { upsert: true });

      const { data } = supabase.storage
        .from("profile-images")
        .getPublicUrl(path);

      await supabase.from("producer_profiles").upsert({
        id: auth.user.id,
        profile_image: data.publicUrl,
      });

      setProfile({ ...profile, profile_image: data.publicUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    }
  };

  /* ================= SAVE PROFILE ================= */
  const saveProfile = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    try {
      // Update 'users' table (common fields)
      const { error: userError } = await supabase
        .from("users")
        .update({
          company_name: profile.company_name,
          first_name: profile.company_name.split(" ")[0] || "Producer", // Fallback logic
          state: profile.state,
          district: profile.district,
        })
        .eq("id", auth.user.id);

      if (userError) throw userError;

      // Update 'producer_profiles' table (specific fields)
      const { error: profileError } = await supabase
        .from("producer_profiles")
        .upsert({
          id: auth.user.id,
          company_name: profile.company_name,
          phone: profile.phone,
          address: profile.address,
        });

      if (profileError) throw profileError;

      setEditing(false);
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile.");
    }
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
    <div className="space-y-8 animate-in fade-in duration-500 text-black relative">

      {/* SUCCESS TOAST */}
      {successMsg && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right z-50">
          <Check size={20} />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* PAGE TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Producer Profile</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* HEADER INFO CARD */}
      <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <label className={`relative group ${editing ? "cursor-pointer" : ""}`}>
          <img
            src={profile.profile_image || "/placeholder.png"}
            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
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
          <h2 className="text-2xl font-bold text-gray-900">{profile.company_name || "Company Name"}</h2>
          <p className="text-gray-500 mt-1 flex items-center justify-center md:justify-start gap-2">
            <Mail size={16} /> {profile.email}
          </p>
          <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
              Producer Account
            </span>
            {profile.state && (
              <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-sm border border-gray-200">
                {profile.district}, {profile.state}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === t
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
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
      <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm min-h-[400px]">

        {/* ================= ACCOUNT INFO ================= */}
        {activeTab === "Account Info" && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Company Details</h3>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    disabled={!editing}
                    value={profile.company_name}
                    onChange={(e) =>
                      setProfile({ ...profile, company_name: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="Enter company name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    disabled
                    value={profile.email}
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    disabled={!editing}
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            {editing && (
              <div className="pt-6 border-t mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
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
          <div className="space-y-6 max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Location Information</h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  disabled={!editing}
                  value={profile.state}
                  onChange={(e) =>
                    setProfile({ ...profile, state: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                <input
                  disabled={!editing}
                  value={profile.district}
                  onChange={(e) =>
                    setProfile({ ...profile, district: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60"
                  placeholder="District"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Address</label>
              <textarea
                disabled={!editing}
                value={profile.address}
                onChange={(e) =>
                  setProfile({ ...profile, address: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60 min-h-[120px] resize-none"
                placeholder="Enter full street address"
              />
            </div>

            {editing && (
              <div className="pt-6 border-t mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
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
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Recent Activity</h3>
            <p className="text-gray-500 max-w-sm mt-2">
              Your recent orders, listings, and updates will appear here once you start using the platform.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
