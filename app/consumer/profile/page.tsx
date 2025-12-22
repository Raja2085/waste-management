"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  state: string | null;
  district: string | null;
  users: {
    role: string;
    email: string;
  };
};

export default function ConsumerProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("consumer_profiles")
      .select(`
        id,
        first_name,
        last_name,
        state,
        district,
        users ( role, email )
      `)
      .eq("id", authData.user.id)
      .single();

    if (error) {
      console.error("Profile load error:", error);
      setLoading(false);
      return;
    }

    setProfile(data);
    setOriginalProfile(data);
    setLoading(false);
  };

  const updateProfile = async () => {
    if (!profile) return;

    setSaving(true);

    const { error } = await supabase
      .from("consumer_profiles")
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        state: profile.state,
        district: profile.district,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      alert(error.message);
    } else {
      setIsEditing(false);
      setOriginalProfile(profile);
      alert("Profile updated successfully");
    }

    setSaving(false);
  };

  const cancelEdit = () => {
    setProfile(originalProfile);
    setIsEditing(false);
  };

  if (loading) return <p className="text-black p-6">Loading profile...</p>;
  if (!profile) return <p className="text-black p-6">Profile not found</p>;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8 text-black">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            {profile.first_name} {profile.last_name}
          </h1>
          <p className="text-sm capitalize text-gray-600">
            {profile.users.role}
          </p>
          <p className="text-sm text-gray-500">
            {profile.users.email}
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="border border-blue-600 text-blue-600 px-5 py-2 rounded-lg hover:bg-blue-50"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-6">
        <Field
          label="First Name"
          value={profile.first_name}
          editable={isEditing}
          onChange={(v) => setProfile({ ...profile, first_name: v })}
        />

        <Field
          label="Last Name"
          value={profile.last_name}
          editable={isEditing}
          onChange={(v) => setProfile({ ...profile, last_name: v })}
        />

        <Field
          label="State"
          value={profile.state}
          editable={isEditing}
          onChange={(v) => setProfile({ ...profile, state: v })}
        />

        <Field
          label="District"
          value={profile.district}
          editable={isEditing}
          onChange={(v) => setProfile({ ...profile, district: v })}
        />
      </div>

      {/* Buttons */}
      {isEditing && (
        <div className="flex gap-4 mt-8">
          <button
            onClick={updateProfile}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <button
            onClick={cancelEdit}
            className="border border-gray-400 px-6 py-2 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/* Reusable Field */
function Field({
  label,
  value,
  editable,
  onChange,
}: {
  label: string;
  value: string | null;
  editable: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      {editable ? (
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full border rounded-lg px-4 py-2"
        />
      ) : (
        <p className="mt-1">{value || "Not provided"}</p>
      )}
    </div>
  );
}
