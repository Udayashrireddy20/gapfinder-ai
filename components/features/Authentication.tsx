
"use client";

import { useState } from "react";

type AuthenticationProps = {
  onAuthenticated?: (user: { name: string; email: string }) => void;
};

export default function Authentication({
  onAuthenticated,
}: AuthenticationProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (mode === "signup" && name.trim().length < 2) {
      setMessage("Please enter your name.");
      return;
    }

    if (!email.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      // Demo only: this does not verify credentials with a server.
      onAuthenticated?.({
        name: mode === "signup" ? name.trim() : email.split("@")[0],
        email: email.trim(),
      });

      setMessage(
        "Demo form submitted. Connect Supabase Authentication to verify accounts securely."
      );
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            G
          </div>

          <h2 className="text-2xl font-bold">GapFinder AI</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your personalized learning workspace
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setMessage("");
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "signin"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600"
            }`}
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "signup"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600"
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <label className="block space-y-2">
              <span className="text-sm font-medium">Full name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                required
                className="w-full rounded-lg border px-3 py-3 outline-none focus:border-blue-500"
              />
            </label>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-medium">Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-lg border px-3 py-3 outline-none focus:border-blue-500"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              minLength={6}
              required
              className="w-full rounded-lg border px-3 py-3 outline-none focus:border-blue-500"
            />
          </label>

          {message && (
            <p
              role="status"
              className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-gray-500">
          Prototype interface only. Do not enter a real password until secure
          authentication is connected.
        </p>
      </div>
    </section>
  );
}
