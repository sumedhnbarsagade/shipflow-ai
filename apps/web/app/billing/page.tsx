"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { trpc } from "../../lib/trpc";
import { 
  Sparkles, 
  CheckCircle, 
  Loader2, 
  ArrowLeft,
  CreditCard,
  Building
} from "lucide-react";
import Link from "next/link";

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success") === "true";
  const mockCheckoutParam = searchParams.get("mock_checkout") === "true";
  const orgIdParam = searchParams.get("orgId") || "";

  const { data: activeOrg } = authClient.useActiveOrganization();
  const activeOrgId = activeOrg?.id || orgIdParam;

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const { data: subscription, refetch: refetchSub } = trpc.workspace.getSubscription.useQuery(
    { organizationId: activeOrgId },
    { enabled: !!activeOrgId }
  );

  const createSubscriptionMutation = trpc.billing.createSubscription.useMutation();
  const verifyPaymentMutation = trpc.billing.verifyPayment.useMutation();

  // Handle successful redirects (real checkout callback or mock checkout query)
  useEffect(() => {
    async function handlePaymentVerification() {
      if (successParam && activeOrgId) {
        setLoading(true);
        setStatusMessage("Verifying Razorpay payment...");
        try {
          await verifyPaymentMutation.mutateAsync({
            organizationId: activeOrgId,
            isMock: false,
          });
          setStatusMessage("Payment verified successfully! Welcome to Premium.");
          refetchSub();
          setTimeout(() => router.push("/dashboard"), 2500);
        } catch (e) {
          setStatusMessage("Payment verification failed.");
        } finally {
          setLoading(false);
        }
      } else if (mockCheckoutParam && activeOrgId) {
        setLoading(true);
        setStatusMessage("Processing mock premium upgrade...");
        try {
          await verifyPaymentMutation.mutateAsync({
            organizationId: activeOrgId,
            isMock: true,
          });
          setStatusMessage("Mock checkout completed! Workspace upgraded to Premium.");
          refetchSub();
          setTimeout(() => router.push("/dashboard"), 2500);
        } catch (e) {
          setStatusMessage("Mock checkout failed.");
        } finally {
          setLoading(false);
        }
      }
    }
    handlePaymentVerification();
  }, [successParam, mockCheckoutParam, activeOrgId]);

  const handleUpgrade = async () => {
    if (!activeOrgId) return;
    setLoading(true);
    setStatusMessage("Initiating billing subscription...");
    try {
      const response = await createSubscriptionMutation.mutateAsync({
        organizationId: activeOrgId,
      });

      if (response.paymentLink) {
        // Redirect to Razorpay or Mock checkout page
        window.location.href = response.paymentLink;
      }
    } catch (e: any) {
      setStatusMessage(`Error starting subscription: ${e.message || "Unknown error"}`);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      {/* Navbar */}
      <header className="glass" style={{ borderBottom: "1px solid var(--border-color)", padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 0 }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
          <Sparkles size={16} style={{ color: "#6366f1" }} />
          <span className="text-gradient">ShipFlow AI Billing</span>
        </div>
      </header>

      <main style={{ flexGrow: 1, padding: "40px", maxWidth: "1200px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "32px", alignItems: "center", justifyContent: "center" }}>
        
        {loading || statusMessage ? (
          <div className="glass" style={{ padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", width: "100%", maxWidth: "500px" }}>
            {loading ? <Loader2 className="animate-spin text-indigo-500" size={36} /> : <CheckCircle className="text-emerald-500" size={36} style={{ color: "#10b981" }} />}
            <h3 style={{ fontSize: "1.25rem" }}>{statusMessage}</h3>
            {!loading && (
              <Link href="/dashboard" className="glow-btn" style={{ padding: "8px 16px" }}>
                Return to Dashboard
              </Link>
            )}
          </div>
        ) : !activeOrgId ? (
          <div className="glass" style={{ padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", maxWidth: "450px" }}>
            <Building size={48} style={{ color: "var(--text-muted)" }} />
            <h2 style={{ fontSize: "1.5rem" }}>No Workspace Selected</h2>
            <p style={{ color: "var(--text-secondary)" }}>Please select or create a workspace on the dashboard before managing your billing subscription.</p>
            <Link href="/dashboard" className="glow-btn">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: "2rem", marginBottom: "8px" }}>Workspace Plans & Billing</h1>
              <p style={{ color: "var(--text-secondary)" }}>
                Active Workspace: <strong style={{ color: "var(--text-primary)" }}>{activeOrg?.name}</strong>
              </p>
            </div>

            {/* Plan Display Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              
              {/* Free Plan */}
              <div className="glass" style={{ padding: "32px", border: subscription?.plan === "FREE" ? "1px solid var(--color-primary)" : "1px solid var(--border-color)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Free Starter</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>For small side projects</p>
                  </div>
                  {subscription?.plan === "FREE" && <span className="badge badge-premium">Active Plan</span>}
                </div>
                <div style={{ fontSize: "2.5rem", fontWeight: "800", marginBottom: "20px" }}>₹0 <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "400" }}>/ month</span></div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "32px", flexGrow: 1 }}>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={14} style={{ color: "#10b981" }} /> 1 connected repository</li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={14} style={{ color: "#10b981" }} /> 5 AI workflow credits / month</li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={14} style={{ color: "#10b981" }} /> Basic PRD & Task Generation</li>
                </ul>
                <button disabled className="glow-btn-secondary" style={{ width: "100%", justifyContent: "center", padding: "10px" }}>
                  {subscription?.plan === "FREE" ? "Current Plan" : "Downgrade"}
                </button>
              </div>

              {/* Premium Plan */}
              <div className="glass" style={{ padding: "32px", border: subscription?.plan === "PREMIUM" ? "1px solid var(--color-primary)" : "1px solid rgba(99,102,241,0.2)", display: "flex", flexDirection: "column", background: "rgba(99,102,241,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Premium Growth</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>For active development teams</p>
                  </div>
                  {subscription?.plan === "PREMIUM" && <span className="badge badge-premium">Active Plan</span>}
                </div>
                <div style={{ fontSize: "2.5rem", fontWeight: "800", marginBottom: "20px" }}>₹4,900 <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "400" }}>/ month</span></div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "32px", flexGrow: 1 }}>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={14} style={{ color: "#10b981" }} /> Unlimited connected repositories</li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={14} style={{ color: "#10b981" }} /> 1,000 AI workflow credits / month</li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={14} style={{ color: "#10b981" }} /> Advanced PRD & Tasks breakdown</li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={14} style={{ color: "#10b981" }} /> Deep AI QA (Security & Perf analysis)</li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={14} style={{ color: "#10b981" }} /> Premium PM release approval workflow</li>
                </ul>
                <button 
                  onClick={handleUpgrade} 
                  disabled={subscription?.plan === "PREMIUM"} 
                  className="glow-btn" 
                  style={{ width: "100%", justifyContent: "center", padding: "10px" }}
                >
                  {subscription?.plan === "PREMIUM" ? "Premium Active" : "Upgrade to Premium"}
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--color-primary)" }} size={32} />
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}

