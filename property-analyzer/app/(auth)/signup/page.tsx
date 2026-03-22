"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordChecks = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "Contains a number", valid: /\d/.test(password) },
    { label: "Contains uppercase letter", valid: /[A-Z]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 1500));
    setError("Registration not configured yet. Please check back soon.");
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-money-500 to-money-700 flex items-center justify-center mb-4 glow-green">
            <DollarSign className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">Create account</h1>
          <p className="text-sm text-gray-500 mt-1">
            Start analyzing properties in minutes
          </p>
        </div>

        {/* Form card */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-money-600/50 focus:border-money-600 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-money-600/50 focus:border-money-600 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  disabled={loading}
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-10 pr-10 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-money-600/50 focus:border-money-600 transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Password strength */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordChecks.map((check) => (
                    <div
                      key={check.label}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Check
                        className={`h-3 w-3 ${
                          check.valid ? "text-money-400" : "text-gray-600"
                        }`}
                      />
                      <span
                        className={
                          check.valid ? "text-money-400" : "text-gray-500"
                        }
                      >
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-money-600 hover:bg-money-500 text-white font-semibold rounded-lg transition-all active:scale-[0.98] glow-green disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="text-xs text-gray-600 text-center">
              By creating an account, you agree to our{" "}
              <span className="text-gray-400">Terms of Service</span> and{" "}
              <span className="text-gray-400">Privacy Policy</span>
            </p>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-money-500 hover:text-money-400 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
