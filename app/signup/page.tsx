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

    // ❌ Password mismatch
    if (password !== confirmPassword) {
      setErrorMsg("Password and Confirm Password do not match");
      return;
    }

    // ❌ Role not selected
    if (!role) {
      setErrorMsg("Please select Producer or Consumer");
      return;
    }

    setLoading(true);

    // 🔐 Supabase Auth Signup
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

    // 🧾 Insert user profile
    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      email,
      role,
      first_name: firstName,
      last_name: lastName,
    });

    if (insertError) {
      setErrorMsg(insertError.message);
      setLoading(false);
      return;
    }

    // ✅ Redirect to Signin (NO success message)
    router.push("/signin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 text-black">
        
        <h2 className="text-3xl font-bold text-center mb-2">Sign Up</h2>
        <p className="text-center mb-6">
          Enter your details to create an account
        </p>

        <form
          className="space-y-4 flex flex-col items-center"
          onSubmit={handleSignup}
        >
          {/* First & Last Name */}
          <div className="flex gap-3 w-full justify-center">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-[170px] border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-[170px] border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Role */}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            className="w-[350px] border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Role</option>
            <option value="producer">Producer (Waste Generator)</option>
            <option value="consumer">Consumer (Waste Buyer)</option>
          </select>

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

          {/* Confirm Password */}
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-[350px] border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          />

          {/* ❌ INLINE ERROR MESSAGE */}
          {errorMsg && (
            <p className="w-[350px] text-left text-sm text-red-600">
              {errorMsg}
            </p>
          )}

          {/* Terms */}
          <div className="flex items-start gap-2 text-sm w-[350px]">
            <input type="checkbox" required className="mt-1 accent-blue-600" />
            <p>
              I agree to the{" "}
              <span className="underline cursor-pointer">Terms</span> and{" "}
              <span className="underline cursor-pointer">Privacy Policy</span>
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-[140px] bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>

          {/* Footer */}
          <p className="text-center text-sm mt-6">
            Already have an account?{" "}
            <a href="/signin" className="font-semibold underline text-blue-600">
              Sign In
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
