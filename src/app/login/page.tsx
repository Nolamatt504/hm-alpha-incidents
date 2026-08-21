"use client";

import { useState, FormEvent, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("reason") === "idle") {
      setMessage("You were signed out after 15 minutes of inactivity. Please sign in again.");
    }
  }, [searchParams]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/reset-password`
                : undefined,
          }
        );
        if (resetError) throw resetError;
        setMessage(
          "If an account exists for that email, we sent a password reset link. Check your inbox (and spam/junk), then follow the link to choose a new password."
        );
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/login`
                : undefined,
            data: {
              full_name: fullName,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          setMessage(
            "Account created. You can sign in now. After you sign in, a Property Admin or Corporate Admin will assign you to a hotel so you can submit reports."
          );
          setMode("signin");
          setPassword("");
          setFullName("");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const title =
    mode === "signup"
      ? "Create an account"
      : mode === "forgot"
      ? "Reset your password"
      : "Sign in to Incident Reports";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src="/hm-alpha-logo.png"
            alt="HM Alpha"
            className="h-12 w-auto object-contain"
          />
        </div>
        <h2 className="mt-4 text-center text-2xl font-semibold text-gray-900">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          HM Alpha Hotels & Resorts
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 leading-relaxed">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required={mode === "signup"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
                  placeholder="Jane Smith"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
                placeholder="you@hotel.com"
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs text-[#0b1f3a] hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
                  placeholder="••••••••"
                />
              </div>
            )}

            {mode === "forgot" && (
              <p className="text-sm text-gray-500">
                Enter your work email and we’ll send you a link to set a new
                password.
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg bg-[#0b1f3a] text-white text-sm font-medium hover:bg-[#08182e] disabled:opacity-60"
            >
              {isLoading
                ? "Please wait…"
                : mode === "signup"
                ? "Create Account"
                : mode === "forgot"
                ? "Send reset link"
                : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            {mode === "signup" && (
              <p className="text-gray-600">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="text-[#0b1f3a] hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === "signin" && (
              <p className="text-gray-600">
                Need an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="text-[#0b1f3a] hover:underline font-medium"
                >
                  Create one
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <p className="text-gray-600">
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="text-[#0b1f3a] hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 space-x-3">
          <Link href="/" className="hover:text-gray-600">
            ← Back to home
          </Link>
          <span>·</span>
          <Link href="/help" className="hover:text-gray-600">
            Help
          </Link>
        </p>
      </div>
    </div>
  );
}
