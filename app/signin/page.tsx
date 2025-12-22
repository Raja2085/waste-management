"use client";

import { useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SigninPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // ❌ Role not selected
    if (!selectedRole) {
      setErrorMsg("Please select Producer or Consumer");
      return;
    }

    setLoading(true);

    // 🔐 Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setErrorMsg("Invalid email or password");
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    // 🔍 Fetch role from users table
    const { data: userData, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (roleError || !userData) {
      setErrorMsg("Unable to verify user role");
      setLoading(false);
      return;
    }

    // ❌ Role mismatch
    if (userData.role !== selectedRole) {
      setErrorMsg("Selected role does not match registered role");
      setLoading(false);
      return;
    }

    // ✅ Correct role-based redirect
    if (userData.role === "consumer") {
      router.push("/consumer");
    } else if (userData.role === "producer") {
      router.push("/producer/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 text-black">

        <h2 className="text-3xl font-bold text-center mb-2">Sign In</h2>
        <p className="text-center mb-6">
          Enter your credentials to sign in
        </p>

        <form
          className="space-y-3 flex flex-col items-center"
          onSubmit={handleSignin}
        >
          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-[350px] border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-[350px] border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          />

          {/* Role Dropdown */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            required
            className="w-[350px] border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Role</option>
            <option value="producer">Producer</option>
            <option value="consumer">Consumer</option>
          </select>

          {/* ❌ Error Message */}
          {errorMsg && (
            <p className="w-[350px] text-left text-sm text-red-600">
              {errorMsg}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-[150px] bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm mt-6">
          Don’t have an account?{" "}
          <a href="/signup" className="underline text-blue-600">
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}
