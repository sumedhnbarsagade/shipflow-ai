import Link from "next/link";
import styles from "./page.module.css";
import { 
  Sparkles, 
  Layers, 
  Code, 
  FileText, 
  CheckCircle, 
  Users, 
  ArrowRight,
  ShieldCheck,
  GitPullRequest,
  CreditCard
} from "lucide-react";

export default function Home() {
  return (
    <div className={styles.container}>
      <header className="py-6 flex items-center justify-between border-b border-white/10" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '1.25rem' }}>
          <Sparkles className="text-indigo-500" style={{ color: '#6366f1' }} />
          <span className="text-gradient">ShipFlow AI</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/auth" className="glow-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            Sign In
          </Link>
          <Link href="/auth?signup=true" className="glow-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            Get Started
          </Link>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className="badge badge-premium" style={{ marginBottom: '16px', gap: '6px' }}>
            <Sparkles size={12} />
            <span>AI-Powered Feature to Production Platform</span>
          </div>
          <h1 className={`${styles.title} text-gradient`}>
            Feature to Production<br />
            with ShipFlow AI
          </h1>
          <p className={styles.subtitle}>
            Great software isn't shipped by code generation alone. ShipFlow coordinates your product delivery: requirement clarification, PRD generation, task breakdown, GitHub pull request review loops, and human release approvals.
          </p>
          <div className={styles.actions}>
            <Link href="/auth?signup=true" className="glow-btn">
              Start Free Trial <ArrowRight size={18} />
            </Link>
            <Link href="#pricing" className="glow-btn-secondary">
              View Pricing
            </Link>
          </div>
        </section>

        <section className="py-20" style={{ padding: '80px 0' }}>
          <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '16px' }}>The ShipFlow Delivery Loop</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '60px', maxWidth: '600px', margin: '0 auto 60px' }}>
            ShipFlow connects product thinking with engineering tasks, ensuring code satisfies requirements before it hits production.
          </p>

          <div className={styles.grid}>
            <div className={`${styles.card} glass-interactive`}>
              <div className={styles.cardIcon}>
                <Sparkles size={24} />
              </div>
              <h3 className={styles.cardTitle}>1. Discovery & Clarification</h3>
              <p className={styles.cardDesc}>
                Create feature requests from emails or tickets. The AI PO Agent clarifies missing context and double-checks duplicates before drafting a structured PRD.
              </p>
            </div>

            <div className={`${styles.card} glass-interactive`}>
              <div className={styles.cardIcon}>
                <FileText size={24} />
              </div>
              <h3 className={styles.cardTitle}>2. Automated Planning</h3>
              <p className={styles.cardDesc}>
                ShipFlow converts the approved PRD into engineering-focused tasks, organizing them on a Kanban board automatically.
              </p>
            </div>

            <div className={`${styles.card} glass-interactive`}>
              <div className={styles.cardIcon}>
                <Code size={24} />
              </div>
              <h3 className={styles.cardTitle}>3. Connected Dev Loop</h3>
              <p className={styles.cardDesc}>
                Link your GitHub repository. Coders implement features and open pull requests, immediately triggering the ShipFlow review.
              </p>
            </div>

            <div className={`${styles.card} glass-interactive`}>
              <div className={styles.cardIcon}>
                <ShieldCheck size={24} />
              </div>
              <h3 className={styles.cardTitle}>4. AI QA Review Loop</h3>
              <p className={styles.cardDesc}>
                AI analyzes diffs against the PRD, tasks, performance, and security rules, filing Blocking or Non-blocking issues back for developers to fix.
              </p>
            </div>

            <div className={`${styles.card} glass-interactive`}>
              <div className={styles.cardIcon}>
                <Users size={24} />
              </div>
              <h3 className={styles.cardTitle}>5. Human Approval</h3>
              <p className={styles.cardDesc}>
                PMs check the PRD, Kanban board, PR, and AI review history. Approve with a single click to trigger release and mark the feature as Shipped.
              </p>
            </div>
          </div>
        </section>

        <section id="pricing" className={styles.pricing}>
          <h2 className={styles.pricingTitle}>Simple, Multi-Tenant SaaS Pricing</h2>
          <p className={styles.pricingSubtitle}>Select a plan for your organization workspace</p>

          <div className={styles.pricingGrid}>
            <div className={`${styles.priceCard} glass`}>
              <div className={styles.planName}>Free Starter</div>
              <div className={styles.planPrice}>
                ₹0 <span>/ month</span>
              </div>
              <ul className={styles.planFeatures}>
                <li><CheckCircle className={styles.checkIcon} size={16} /> 1 Connected Repository</li>
                <li><CheckCircle className={styles.checkIcon} size={16} /> 5 AI Credits / month</li>
                <li><CheckCircle className={styles.checkIcon} size={16} /> Standard PRD & Tasks Gen</li>
                <li><CheckCircle className={styles.checkIcon} size={16} /> Basic PR Reviews</li>
              </ul>
              <Link href="/auth?signup=true" className="glow-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                Get Started
              </Link>
            </div>

            <div className={`${styles.priceCard} glass`} style={{ borderColor: 'rgba(99, 102, 241, 0.4)', boxShadow: '0 0 20px rgba(99, 102, 241, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className={styles.planName} style={{ marginBottom: 0 }}>Premium Growth</span>
                <span className="badge badge-premium">Popular</span>
              </div>
              <div className={styles.planPrice}>
                ₹4,900 <span>/ month</span>
              </div>
              <ul className={styles.planFeatures}>
                <li><CheckCircle className={styles.checkIcon} size={16} /> Unlimited Repositories</li>
                <li><CheckCircle className={styles.checkIcon} size={16} /> 1,000 AI Credits / month</li>
                <li><CheckCircle className={styles.checkIcon} size={16} /> Advanced PRD & Tasks Gen</li>
                <li><CheckCircle className={styles.checkIcon} size={16} /> In-depth QA Reviews (Performance & Security)</li>
                <li><CheckCircle className={styles.checkIcon} size={16} /> Premium Release workflows</li>
              </ul>
              <Link href="/auth?signup=true" className="glow-btn" style={{ width: '100%', justifyContent: 'center' }}>
                Upgrade Now
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-white/10" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '48px 0', marginTop: '80px', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
        <span>© 2026 ShipFlow AI. All rights reserved.</span>
        <span>Built with Next.js, tRPC, Inngest, BetterAuth & Razorpay</span>
      </footer>
    </div>
  );
}
