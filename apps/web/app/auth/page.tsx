"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { Sparkles, Loader2, ArrowRight, Github } from "lucide-react";
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

  const handleSocialSignIn = async (provider: "google" | "github") => {
    setLoading(true);
    setError("");
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "/dashboard",
      });
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`);
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

        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
          <div style={{ flexGrow: 1, height: "1px", background: "var(--border-color)" }}></div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "600" }}>Or continue with</span>
          <div style={{ flexGrow: 1, height: "1px", background: "var(--border-color)" }}></div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            type="button" 
            onClick={() => handleSocialSignIn("github")} 
            disabled={loading}
            className="glow-btn-secondary"
            style={{ flexGrow: 1, padding: "10px 14px", justifyContent: "center", gap: "8px", fontSize: "0.85rem", borderRadius: "8px" }}
          >
            <Github size={16} /> GitHub
          </button>
          <button 
            type="button" 
            onClick={() => handleSocialSignIn("google")} 
            disabled={loading}
            className="glow-btn-secondary"
            style={{ flexGrow: 1, padding: "10px 14px", justifyContent: "center", gap: "8px", fontSize: "0.85rem", borderRadius: "8px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Google
          </button>
        </div>

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

