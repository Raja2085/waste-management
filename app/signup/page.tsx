"use client";

import { useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    if (!role) {
      setErrorMsg("Please select a role");
      return;
    }

    setLoading(true);

    // 1️⃣ Auth signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) {
      setErrorMsg(error?.message || "Signup failed");
      setLoading(false);
      return;
    }

    const user = data.user;

    // 2️⃣ Insert into users table
    const { error: userInsertError } = await supabase
      .from("users")
      .insert({
        id: user.id,
        email,
        role,
        first_name: firstName,
        last_name: lastName,
      });

    if (userInsertError) {
      setErrorMsg(userInsertError.message);
      setLoading(false);
      return;
    }

    // ✅ consumer_profiles is created automatically by trigger
    router.push("/signin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 text-black">
        <h2 className="text-3xl font-bold text-center mb-2">Sign Up</h2>
        <p className="text-center mb-6">
          Enter your details to create an account
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-1/2 border rounded-lg px-4 py-2"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-1/2 border rounded-lg px-4 py-2"
            />
          </div>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2"
          >
            <option value="">Select Role</option>
            <option value="producer">Producer</option>
            <option value="consumer">Consumer</option>
          </select>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2"
          />

          {errorMsg && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold"
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>

          <p className="text-center text-sm">
            Already have an account?{" "}
            <a href="/signin" className="underline text-blue-600">
              Sign In
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
