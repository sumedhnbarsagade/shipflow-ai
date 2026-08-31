"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./page.module.css";
import { ThemeToggle } from "./ThemeToggle";
import { 
  Sparkles, 
  Layers, 
  Code, 
  CheckCircle, 
  ArrowRight,
  GitPullRequest,
  ExternalLink,
  Lock,
  Check,
  Zap,
  Terminal as TerminalIcon
} from "lucide-react";

type TabId = "functions" | "auth" | "webhooks";

interface CodeLineData {
  num: number;
  text: string;
  type: "add" | "del" | "normal";
}

interface MockReviewComment {
  title: string;
  badge: string;
  text: string;
  line: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("functions");

  // Mock code data for the interactive terminal tabs
  const codeData: Record<TabId, { file: string; lines: CodeLineData[]; comment: MockReviewComment }> = {
    functions: {
      file: "packages/inngest/src/functions.ts",
      lines: [
        { num: 4, text: "export const generateTasks = inngest.createFunction(", type: "normal" },
        { num: 5, text: "  { id: 'generate-tasks' },", type: "normal" },
        { num: 6, text: "  async ({ event, step }) => {", type: "normal" },
        { num: 7, text: "    const tasks = await step.run('generate-tasks', async () => {", type: "normal" },
        { num: 8, text: "+     return await generateObject({", type: "add" },
        { num: 9, text: "+       schema: taskSchema, // includes points & priority", type: "add" },
        { num: 10, text: "+       prompt: taskPlannerSystemPrompt,", type: "add" },
        { num: 11, text: "+     });", type: "add" },
        { num: 12, text: "    });", type: "normal" },
      ],
      comment: {
        title: "AI QA Agent",
        badge: "PASSED",
        text: "Checked task creator schema. The generated tasks correctly define story points (Fibonacci points) and priority fields (LOW, MEDIUM, HIGH) conforming to active agile guidelines. Approved.",
        line: 9
      }
    },
    auth: {
      file: "apps/web/lib/auth-client.ts",
      lines: [
        { num: 12, text: "export const enforceOrgMembership = async (ctx, orgId) => {", type: "normal" },
        { num: 13, text: "  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });", type: "normal" },
        { num: 14, text: "  const member = await db.member.findFirst({", type: "del" },
        { num: 15, text: "+ const member = await db.member.findUnique({", type: "add" },
        { num: 16, text: "    where: {", type: "normal" },
        { num: 17, text: "      userId_organizationId: { userId: ctx.user.id, organizationId: orgId }", type: "normal" },
        { num: 18, text: "    }", type: "normal" },
        { num: 19, text: "  });", type: "normal" },
      ],
      comment: {
        title: "AI Security Agent",
        badge: "SECURE",
        text: "Vulnerability resolved. Replaced findFirst with a findUnique lookup targeting the compound index key. This enforces strong organization isolation constraints and mitigates BOLA.",
        line: 15
      }
    },
    webhooks: {
      file: "apps/web/app/api/webhooks/github/route.ts",
      lines: [
        { num: 20, text: "export async function POST(req: Request) {", type: "normal" },
        { num: 21, text: "+   const signature = req.headers.get('x-hub-signature-256');", type: "add" },
        { num: 22, text: "+   if (!verifySignature(await req.text(), signature)) {", type: "add" },
        { num: 23, text: "+     return new Response('Invalid HMAC Signature', { status: 401 });", type: "add" },
        { num: 24, text: "+   }", type: "add" },
        { num: 25, text: "    const payload = await req.json();", type: "normal" },
        { num: 26, text: "    const diff = await fetchPullRequestDiff(payload.pull_request);", type: "normal" },
      ],
      comment: {
        title: "AI Webhook Guard",
        badge: "PASSED",
        text: "Webhook verify check added. Correctly signs payload using HMAC SHA-256 signature checks under the GITHUB_WEBHOOK_SECRET schema context. Validated.",
        line: 22
      }
    }
  };

  return (
    <div>
      {/* Collibra-inspired Promo Announcement Bar */}
      <div className={styles.promoBar}>
        <Sparkles size={14} style={{ color: "var(--brand-lime)" }} />
        <span>Introducing the ShipFlow AI Control Plane: The end-to-end delivery framework for engineering teams.</span>
        <Link href="/auth?signup=true">
          Learn what&apos;s new <ArrowRight size={12} />
        </Link>
      </div>

      {/* Sticky Blurred Header Navbar */}
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link href="/" className={styles.logo}>
            <Sparkles size={20} className={styles.logoDot} />
            <span className={styles.logoText}>ShipFlow<span className={styles.logoDot}>AI</span></span>
          </Link>

          <nav className={styles.nav}>
            <Link href="#features" className={styles.navLink}>Platform</Link>
            <Link href="#pricing" className={styles.navLink}>Pricing</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.navLink} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              Docs <ExternalLink size={12} />
            </a>
          </nav>

          <div className={styles.headerActions}>
            <ThemeToggle />
            <Link href="/auth" className="btn-collibra-outline" style={{ padding: "8px 20px", fontSize: "0.85rem" }}>
              Sign In
            </Link>
            <Link href="/auth?signup=true" className="btn-collibra-lime" style={{ padding: "8px 20px", fontSize: "0.85rem" }}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.container}>
        {/* High-Impact Split Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <Sparkles size={12} />
              <span>Scale Dev Delivery with Confidence</span>
            </div>
            <h1 className={styles.heroTitle}>
              Ship code with <span className="text-gradient-ocean-lime">absolute confidence.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Great software isn't shipped by code generation alone. ShipFlow coordinates your entire product delivery loop: requirement clarification, task breakdown, continuous review, and release governance.
            </p>
            <div className={styles.heroActions}>
              <Link href="/auth?signup=true" className="btn-collibra-lime">
                Start Free Trial <ArrowRight size={16} />
              </Link>
              <Link href="#features" className="btn-collibra-outline">
                Explore Platform
              </Link>
            </div>
          </div>

          {/* Interactive Code & QA terminal on the right */}
          <div className={styles.heroGraphic}>
            <div className={styles.terminal}>
              <div className={styles.terminalHeader}>
                <div className={styles.terminalDots}>
                  <span className={`${styles.terminalDot} ${styles.dotRed}`}></span>
                  <span className={`${styles.terminalDot} ${styles.dotYellow}`}></span>
                  <span className={`${styles.terminalDot} ${styles.dotGreen}`}></span>
                </div>
                <div className={styles.terminalTitle}>ShipFlow AI — Live Review Console</div>
                <TerminalIcon size={14} style={{ color: "#475569" }} />
              </div>

              {/* Terminal Tabs */}
              <div className={styles.terminalTabs}>
                <div 
                  className={`${styles.terminalTab} ${activeTab === "functions" ? styles.terminalTabActive : ""}`}
                  onClick={() => setActiveTab("functions")}
                >
                  <Code size={12} /> functions.ts
                </div>
                <div 
                  className={`${styles.terminalTab} ${activeTab === "auth" ? styles.terminalTabActive : ""}`}
                  onClick={() => setActiveTab("auth")}
                >
                  <Lock size={12} /> auth-client.ts
                </div>
                <div 
                  className={`${styles.terminalTab} ${activeTab === "webhooks" ? styles.terminalTabActive : ""}`}
                  onClick={() => setActiveTab("webhooks")}
                >
                  <GitPullRequest size={12} /> webhook.ts
                </div>
              </div>

              {/* Terminal Body showing file diff */}
              <div className={styles.terminalBody}>
                <div style={{ color: "#64748b", fontSize: "0.7rem", marginBottom: "8px" }}>
                  File: {codeData[activeTab].file}
                </div>
                
                {codeData[activeTab].lines.map((line, idx) => (
                  <div key={idx} className={`${styles.codeLine} ${
                    line.type === "add" ? styles.lineAdd : line.type === "del" ? styles.lineDel : styles.lineNormal
                  }`}>
                    <span className={styles.lineNumber}>{line.num}</span>
                    <span>{line.text}</span>
                  </div>
                ))}

                {/* Floating comment card */}
                <div className={styles.terminalReviewCard}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewAgent}>
                      <Sparkles size={12} />
                      <span>{codeData[activeTab].comment.title}</span>
                    </div>
                    <span className={styles.reviewBadge}>{codeData[activeTab].comment.badge}</span>
                  </div>
                  <p className={styles.reviewContent}>
                    {codeData[activeTab].comment.text}
                  </p>
                  <div className={styles.reviewActions}>
                    <span style={{ fontSize: "0.65rem", color: "var(--brand-lime)", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Check size={10} /> PR Timeline Synced
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Integration Logo Wall */}
        <section className={styles.logoWallSection}>
          <p className={styles.logoWallTitle}>Seamlessly integrated into your workspace stack</p>
          <div className={styles.logoWallGrid}>
            <div className={styles.logoItem}>
              <GitPullRequest size={18} style={{ color: "var(--brand-lime)" }} />
              <span>GitHub</span>
            </div>
            <div className={styles.logoItem}>
              <Zap size={18} style={{ color: "#38bdf8" }} />
              <span>Inngest</span>
            </div>
            <div className={styles.logoItem}>
              <Lock size={18} style={{ color: "#ec4899" }} />
              <span>BetterAuth</span>
            </div>
            <div className={styles.logoItem}>
              <Code size={18} style={{ color: "#f8fafc" }} />
              <span>Next.js</span>
            </div>
            <div className={styles.logoItem}>
              <Layers size={18} style={{ color: "#0ea5e9" }} />
              <span>Prisma</span>
            </div>
          </div>
        </section>

        {/* Alternate Layout Features (Product Pillars) */}
        <section id="features" style={{ padding: "80px 0 20px" }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>The Durable Delivery Loop</h2>
            <p className={styles.sectionSubtitle}>
              ShipFlow connects requirement clarification, automatic planning, codebase analysis, and human approvals into a single continuous loop.
            </p>
          </div>

          <div className={styles.featureList}>
            {/* Feature 1 */}
            <div className={styles.featureRow}>
              <div className={styles.featureInfo}>
                <div className={styles.tagContainer}>
                  <span className={styles.hangingTag}>STAGE 01 / REQ CLARIFICATION</span>
                </div>
                <h3 className={styles.featureTitle}>AI Product Owner Guardrails</h3>
                <p className={styles.featureDesc}>
                  Create feature requests from tickets or customer requests. The AI PO Agent acts as a buffer—clarifying missing requirements, identifying duplicated items, and generating a structured PRD before coding starts.
                </p>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  <CheckCircle size={16} style={{ color: "var(--brand-lime)" }} />
                  <span>Interactive requirement chat interface</span>
                </div>
              </div>
              <div className={styles.featureVisual}>
                <div className={styles.cardMock}>
                  <div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--brand-lime)", fontWeight: "bold" }}>DEVELOPER REQUEST:</span>
                      <p style={{ fontSize: "0.85rem", marginTop: "4px", color: "var(--text-primary)" }}>Add Razorpay subscription tier to workspace settings.</p>
                    </div>
                    <div style={{ background: "rgba(212,240,76,0.05)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(212,240,76,0.1)", marginLeft: "16px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--brand-lime)", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}><Sparkles size={12} /> AI PO AGENT:</span>
                      <p style={{ fontSize: "0.85rem", marginTop: "4px", color: "var(--text-primary)" }}>Should we restrict the subscription configuration page to organization owners? Or can admin members initiate upgrades?</p>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Generating PRD Draft...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className={`${styles.featureRow} ${styles.featureRowReversed}`}>
              <div className={styles.featureInfo}>
                <div className={styles.tagContainer}>
                  <span className={styles.hangingTag}>STAGE 02 / AUTO-PLANNING</span>
                </div>
                <h3 className={styles.featureTitle}>Automated Tasks & Story Estimation</h3>
                <p className={styles.featureDesc}>
                  Convert approved PRDs directly into developer-friendly tasks on a Kanban board. The AI Planner automatically breaks down steps, assigns Fibonacci story points, and defines priorities.
                </p>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  <CheckCircle size={16} style={{ color: "var(--brand-lime)" }} />
                  <span>Deterministic point models & priorities (LOW, MEDIUM, HIGH)</span>
                </div>
              </div>
              <div className={styles.featureVisual}>
                <div className={styles.cardMock}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>TASK-102</span>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "600", marginTop: "2px" }}>Implement webhook HMAC verify</p>
                      </div>
                      <span style={{ background: "rgba(212,240,76,0.1)", color: "var(--brand-lime)", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>5 POINTS</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>TASK-103</span>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "600", marginTop: "2px" }}>Update database prisma.schema</p>
                      </div>
                      <span style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>3 POINTS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className={styles.featureRow}>
              <div className={styles.featureInfo}>
                <div className={styles.tagContainer}>
                  <span className={styles.hangingTag}>STAGE 03 / CONTINUOUS REVIEW</span>
                </div>
                <h3 className={styles.featureTitle}>AI QA Pull Request Loop</h3>
                <p className={styles.featureDesc}>
                  Every pull request diff is examined by the QA agent in real-time. Code changes are verified against the approved PRD, security rules, and performance standards. Comments and issues are posted directly to the GitHub PR timeline.
                </p>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  <CheckCircle size={16} style={{ color: "var(--brand-lime)" }} />
                  <span>Targeted line-level file review comments</span>
                </div>
              </div>
              <div className={styles.featureVisual}>
                <div className={styles.cardMock}>
                  <div style={{ padding: "8px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <GitPullRequest size={16} style={{ color: "var(--brand-lime)" }} />
                      <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>PR #42: Restrict org isolation procedures</span>
                    </div>
                    <div style={{ borderLeft: "2px solid #ef4444", paddingLeft: "12px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <p><strong>Blocking Issue:</strong> Missing membership lookup validation inside billing Router upgrades. This could expose tenant data fields.</p>
                      <span style={{ color: "#f87171", fontSize: "0.7rem", fontWeight: "bold" }}>Line 114 in billing.ts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className={`${styles.featureRow} ${styles.featureRowReversed}`}>
              <div className={styles.featureInfo}>
                <div className={styles.tagContainer}>
                  <span className={styles.hangingTag}>STAGE 04 / GOVERNANCE</span>
                </div>
                <h3 className={styles.featureTitle}>One-Click Release Approvals</h3>
                <p className={styles.featureDesc}>
                  Product Managers get a complete governance control board showing requirements, Kanban board statuses, pull request diff reviews, and build metrics. Approve and deploy with a single click.
                </p>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  <CheckCircle size={16} style={{ color: "var(--brand-lime)" }} />
                  <span>Enforced security and QA approval checkpoints</span>
                </div>
              </div>
              <div className={styles.featureVisual}>
                <div className={styles.cardMock} style={{ borderLeft: "4px solid var(--brand-lime)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>RELEASE READY</span>
                      <h4 style={{ fontSize: "1rem", fontWeight: "bold", color: "var(--text-primary)" }}>Release v1.2.0</h4>
                    </div>
                    <button className="btn-collibra-lime" style={{ padding: "8px 16px", fontSize: "0.8rem" }}>
                      Approve Release
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Table Section */}
        <section id="pricing" className={styles.pricing}>
          <div className={styles.pricingHeader}>
            <h2 className={styles.pricingTitle}>Simple, Transparent Pricing</h2>
            <p className={styles.pricingSubtitle}>Select a governance model appropriate for your team size</p>
          </div>

          <div className={styles.pricingGrid}>
            {/* Plan 1 */}
            <div className={styles.priceCard}>
              <div className={styles.priceHeader}>
                <div className={styles.planName}>Free Starter</div>
                <p className={styles.planDesc}>Best for solo developers and open-source validation.</p>
                <div className={styles.planPrice}>
                  ₹0 <span>/ month</span>
                </div>
              </div>
              <ul className={styles.planFeatures}>
                <li><CheckCircle className={styles.planCheckIcon} size={16} /> 1 Connected Repository</li>
                <li><CheckCircle className={styles.planCheckIcon} size={16} /> 5 AI Credits / month</li>
                <li><CheckCircle className={styles.planCheckIcon} size={16} /> Standard PRD & Tasks Gen</li>
                <li><CheckCircle className={styles.planCheckIcon} size={16} /> Basic PR Reviews</li>
              </ul>
              <Link href="/auth?signup=true" className="btn-collibra-outline" style={{ justifyContent: "center", width: "100%" }}>
                Get Started
              </Link>
            </div>

            {/* Plan 2 */}
            <div className={`${styles.priceCard} ${styles.priceCardFeatured}`}>
              <div className={styles.priceHeader}>
                <div className={styles.planName}>
                  <span>Premium Growth</span>
                  <span style={{ background: "rgba(212,240,76,0.15)", color: "var(--brand-lime)", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "9999px", fontWeight: "bold" }}>POPULAR</span>
                </div>
                <p className={styles.planDesc}>Best for growing software startups and product teams.</p>
                <div className={styles.planPrice}>
                  ₹4,900 <span>/ month</span>
                </div>
              </div>
              <ul className={styles.planFeatures}>
                <li><CheckCircle className={styles.planCheckIcon} size={16} /> Unlimited Connected Repositories</li>
                <li><CheckCircle className={styles.planCheckIcon} size={16} /> 1,000 AI Credits / month</li>
                <li><CheckCircle className={styles.planCheckIcon} size={16} /> Advanced PRD & Tasks breakdown models</li>
                <li><CheckCircle className={styles.planCheckIcon} size={16} /> Performance & Security Vulnerability reviews</li>
                <li><CheckCircle className={styles.planCheckIcon} size={16} /> Release approval dashboards</li>
              </ul>
              <Link href="/auth?signup=true" className="btn-collibra-lime" style={{ justifyContent: "center", width: "100%" }}>
                Upgrade Now
              </Link>
            </div>
          </div>
        </section>

        {/* Global bottom CTA section */}
        <section className={styles.ctaSection}>
          <h2 className={styles.ctaTitle}>Accelerate your delivery loops safely.</h2>
          <p className={styles.ctaDesc}>
            Connect your repository, outline your feature requirements, and let ShipFlow AI orchestrate your tasks, PR audits, and release pipelines.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/auth?signup=true" className="btn-collibra-lime">
              Get Started for Free <ArrowRight size={16} />
            </Link>
            <Link href="#features" className="btn-collibra-outline">
              Learn More
            </Link>
          </div>
        </section>
      </main>

      {/* Collibra-style Detailed Footer */}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerGrid}`}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.logo}>
              <Sparkles size={18} className={styles.logoDot} />
              <span className={styles.logoText}>ShipFlow<span className={styles.logoDot}>AI</span></span>
            </Link>
            <p className={styles.footerDesc}>
              A secure, multi-tenant developer governance platform ensuring code satisfies requirements from ticket to launch.
            </p>
          </div>
          
          <div className={styles.footerCol}>
            <span className={styles.footerColTitle}>Product</span>
            <ul className={styles.footerLinks}>
              <li><Link href="#features" className={styles.footerLink}>Features</Link></li>
              <li><Link href="#pricing" className={styles.footerLink}>Pricing</Link></li>
              <li><Link href="/auth" className={styles.footerLink}>Sign In</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.footerColTitle}>Integrations</span>
            <ul className={styles.footerLinks}>
              <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>GitHub</a></li>
              <li><a href="https://inngest.com" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>Inngest</a></li>
              <li><a href="https://better-auth.com" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>BetterAuth</a></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.footerColTitle}>Security</span>
            <ul className={styles.footerLinks}>
              <li><Link href="#" className={styles.footerLink}>ISO 27001 Compliant</Link></li>
              <li><Link href="#" className={styles.footerLink}>GDPR Compliance</Link></li>
              <li><Link href="#" className={styles.footerLink}>Workspace Isolation</Link></li>
            </ul>
          </div>
        </div>

        <div className={`${styles.container} ${styles.footerBottom}`}>
          <span>© 2026 ShipFlow AI. All rights reserved.</span>
          <span>Built with Next.js, tRPC, Inngest, BetterAuth & Razorpay</span>
        </div>
      </footer>
    </div>
  );
}
