"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignUpParam = searchParams.get("signup") === "true";

  const [isSignUp, setIsSignUp] = useState(isSignUpParam);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await authClient.signUp.email({
          email,
          password,
          name,
        });
        if (signUpError) {
          setError(signUpError.message || "Failed to sign up");
        } else {
          router.push("/dashboard");
        }
      } else {
        const { data, error: signInError } = await authClient.signIn.email({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message || "Failed to sign in");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div className="glass" style={{ width: "100%", maxWidth: "420px", padding: "40px 32px", display: "flex", flexDirection: "column" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", fontSize: "1.25rem", justifyContent: "center", marginBottom: "32px" }}>
          <Sparkles className="text-indigo-500" style={{ color: "#6366f1" }} />
          <span className="text-gradient">ShipFlow AI</span>
        </div>

        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "8px", textAlign: "center" }}>
          {isSignUp ? "Create your account" : "Sign in to your account"}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", marginBottom: "24px" }}>
          {isSignUp ? "Start coordinating feature delivery today" : "Welcome back, developer"}
        </p>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--color-danger)", padding: "12px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "20px", lineHeight: "1.4" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {isSignUp && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="name" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none", transition: "all 0.2s" }}
                onFocus={(e) => e.target.style.borderColor = "var(--color-primary)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border-color)"}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="email" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none", transition: "all 0.2s" }}
              onFocus={(e) => e.target.style.borderColor = "var(--color-primary)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border-color)"}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="password" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none", transition: "all 0.2s" }}
              onFocus={(e) => e.target.style.borderColor = "var(--color-primary)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border-color)"}
            />
          </div>

          <button type="submit" className="glow-btn" disabled={loading} style={{ justifyContent: "center", marginTop: "8px", padding: "12px" }}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : (isSignUp ? "Sign Up" : "Sign In")}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "0.85rem" }}>
          <span style={{ color: "var(--text-secondary)" }}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
          </span>
          <button 
            onClick={() => setIsSignUp(!isSignUp)} 
            style={{ background: "none", border: "none", color: "var(--color-primary)", fontWeight: "600", cursor: "pointer", padding: 0 }}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </div>

        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-muted)", justifyContent: "center", marginTop: "32px" }}>
          Back to home <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--color-primary)" }} size={32} />
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}

