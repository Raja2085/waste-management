"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow max-w-md text-black">
      <h2 className="font-semibold mb-4">Profile</h2>

      <p><b>Email:</b> {profile.email}</p>
      <p><b>Role:</b> {profile.role}</p>
      <p><b>Company:</b> {profile.company_name || "N/A"}</p>
      <p><b>Location:</b> {profile.location || "N/A"}</p>
    </div>
  );
}
