"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";

const DEMO_ACCOUNTS = [
  {
    email: "employee@acmefs.com",
    password: "EmployeePass123!",
    label: "Continue as Employee",
    note: "Sees 22 of 25 documents. Admin-only files stay hidden from search and chat.",
  },
  {
    email: "admin@acmefs.com",
    password: "AdminPass123!",
    label: "Continue as Admin",
    note: "Sees all 25 documents. Can upload documents and run evaluations.",
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("employee@acmefs.com");
  const [password, setPassword] = useState("EmployeePass123!");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function signIn(e: string, p: string) {
    setError(null);
    setSubmitting(true);
    try {
      await login(e, p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn(email, password);
  }

  return (
    <div className="flex min-h-[calc(100vh-2.75rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
            A
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Acme Knowledge</h1>
          <p className="mt-1 text-sm text-gray-500">Enterprise Knowledge Intelligence Platform</p>
        </div>

        <div className="card space-y-3 p-6">
          <p className="text-sm font-medium text-gray-900">Pick a sample role</p>
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              className="w-full rounded-md border border-gray-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50"
              disabled={submitting}
              onClick={() => signIn(a.email, a.password)}
            >
              <span className="block text-sm font-medium text-brand-700">{a.label}</span>
              <span className="mt-0.5 block text-xs text-gray-500">{a.note}</span>
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="card mt-4 space-y-4 p-6">
          <p className="text-xs text-gray-500">
            Or sign in with any email. Emails that start with &quot;admin&quot; get the admin role. Any password works in this demo.
          </p>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
