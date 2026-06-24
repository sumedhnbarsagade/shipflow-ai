"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { 
  ArrowLeft, 
  GitBranch, 
  Sparkles, 
  Plus, 
  ArrowRight,
  FileText,
  MessageSquare,
  ClipboardList,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Loader2
} from "lucide-react";
import Link from "next/link";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  // Modals & Form states
  const [showCreateFeature, setShowCreateFeature] = useState(false);
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDesc, setFeatureDesc] = useState("");
  const [featureSource, setFeatureSource] = useState<"MANUAL" | "EMAIL" | "SUPPORT">("MANUAL");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [showConnectRepo, setShowConnectRepo] = useState(false);
  const [githubRepoInput, setGithubRepoInput] = useState("");

  // Query Project details
  const { data: project, isLoading: projectLoading, refetch: refetchProject } = trpc.project.getById.useQuery({ id });
  
  // Query Feature Requests
  const { data: features, isLoading: featuresLoading, refetch: refetchFeatures } = trpc.featureRequest.list.useQuery({ projectId: id });

  // Mutation
  const createFeatureMutation = trpc.featureRequest.create.useMutation();
  const updateRepoMutation = trpc.project.updateRepo.useMutation();

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureTitle.trim() || !featureDesc.trim()) return;
    setActionLoading(true);
    setErrorMsg("");

    try {
      const result = await createFeatureMutation.mutateAsync({
        projectId: id,
        title: featureTitle,
        description: featureDesc,
        source: featureSource,
      });

      setFeatureTitle("");
      setFeatureDesc("");
      setShowCreateFeature(false);
      refetchFeatures();
      
      // Redirect directly to the feature page to start clarification
      router.push(`/feature/${result.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create feature request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg("");

    try {
      await updateRepoMutation.mutateAsync({
        projectId: id,
        githubRepo: githubRepoInput.trim() || null,
      });
      setShowConnectRepo(false);
      refetchProject();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to connect repository");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <span className="badge badge-free" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--color-danger)", borderColor: "rgba(239, 68, 68, 0.3)" }}>Duplicate Draft</span>;
      case "CLARIFYING":
        return <span className="badge badge-free" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--color-primary)", borderColor: "rgba(99, 102, 241, 0.3)" }}>Clarifying</span>;
      case "PRD_GENERATING":
        return <span className="badge badge-free" style={{ background: "rgba(14, 165, 233, 0.15)", color: "var(--color-secondary)", borderColor: "rgba(14, 165, 233, 0.3)" }}>PRD Generating</span>;
      case "PRD_GENERATED":
        return <span className="badge badge-free" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7", borderColor: "rgba(168, 85, 247, 0.3)" }}>PRD Ready</span>;
      case "TASKS_GENERATED":
        return <span className="badge badge-free" style={{ background: "rgba(234, 179, 8, 0.15)", color: "#eab308", borderColor: "rgba(234, 179, 8, 0.3)" }}>Tasks Ready</span>;
      case "DEVELOPING":
        return <span className="badge badge-free" style={{ background: "rgba(249, 115, 22, 0.15)", color: "#f97316", borderColor: "rgba(249, 115, 22, 0.3)" }}>In Dev</span>;
      case "QA_REVIEWING":
        return <span className="badge badge-free" style={{ background: "rgba(236, 72, 153, 0.15)", color: "#ec4899", borderColor: "rgba(236, 72, 153, 0.3)" }}>QA Reviewing</span>;
      case "HUMAN_APPROVAL":
        return <span className="badge badge-free" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", borderColor: "rgba(16, 185, 129, 0.3)" }}>Ready to Release</span>;
      case "SHIPPED":
        return <span className="badge badge-free" style={{ background: "rgba(16, 185, 129, 0.25)", color: "#10b981", borderColor: "#10b981" }}>Shipped</span>;
      default:
        return <span className="badge badge-free">{status}</span>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CLARIFYING":
        return <MessageSquare size={16} />;
      case "PRD_GENERATED":
      case "PRD_GENERATING":
        return <FileText size={16} />;
      case "TASKS_GENERATED":
        return <ClipboardList size={16} />;
      case "DEVELOPING":
        return <GitBranch size={16} />;
      case "QA_REVIEWING":
        return <ShieldCheck size={16} />;
      case "HUMAN_APPROVAL":
      case "SHIPPED":
        return <CheckCircle size={16} />;
      default:
        return <HelpCircle size={16} />;
    }
  };

  if (projectLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <h2 style={{ fontSize: "1.5rem" }}>Project Not Found</h2>
        <Link href="/dashboard" className="glow-btn">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      {/* Header */}
      <header className="glass" style={{ borderBottom: "1px solid var(--border-color)", padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            <ArrowLeft size={16} /> Back to Projects
          </Link>
          <div style={{ width: "1px", height: "16px", background: "var(--border-color)" }}></div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{project.name}</h1>
        </div>

        {/* GitHub repo status block */}
        <button 
          onClick={() => { setGithubRepoInput(project.githubRepo || ""); setErrorMsg(""); setShowConnectRepo(true); }}
          className="glow-btn-secondary" 
          style={{ fontSize: "0.85rem", padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <GitBranch size={16} />
          {project.githubRepo ? (
            <span>Connected: <strong style={{ color: "var(--text-primary)" }}>{project.githubRepo}</strong></span>
          ) : (
            <span>Connect GitHub Repo</span>
          )}
        </button>
      </header>

      {/* Main Board content */}
      <main style={{ flexGrow: 1, padding: "40px", display: "flex", flexDirection: "column", gap: "32px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        
        {/* Project info card */}
        <div className="glass" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Project Description</span>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.5" }}>
            {project.description || "No description provided. Click repo settings or add feature requests below."}
          </p>
        </div>

        {/* Feature Request header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>Feature Delivery Board</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Process features from idea discovery to production release</p>
          </div>
          <button onClick={() => { setFeatureTitle(""); setFeatureDesc(""); setErrorMsg(""); setShowCreateFeature(true); }} className="glow-btn">
            <Plus size={16} /> Add Feature Request
          </button>
        </div>

        {/* Features list */}
        {featuresLoading ? (
          <div style={{ display: "flex", padding: "40px", justifyContent: "center" }}>
            <Loader2 className="animate-spin text-indigo-500" size={24} />
          </div>
        ) : features && features.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {features.map((feat: any) => (
              <Link key={feat.id} href={`/feature/${feat.id}`} className="glass-interactive" style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexGrow: 1 }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", flexShrink: 0 }}>
                    {getStatusIcon(feat.status)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>{feat.title}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Source: {feat.source} | Updated: {new Date(feat.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  {getStatusBadge(feat.status)}
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.85rem", color: "var(--color-primary)", fontWeight: "600" }}>
                    Open Delivery Loop <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass" style={{ padding: "60px 40px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px" }}>
            <Sparkles size={40} style={{ color: "var(--text-muted)" }} />
            <h3 style={{ fontSize: "1.25rem" }}>No feature requests tracked</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "360px" }}>
              Add a feature request manually or link them to begin the requirement clarification process and generate PRDs.
            </p>
            <button onClick={() => { setFeatureTitle(""); setFeatureDesc(""); setErrorMsg(""); setShowCreateFeature(true); }} className="glow-btn" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
              <Plus size={16} /> Add First Feature
            </button>
          </div>
        )}

        {/* Modal: Connect GitHub Repo */}
        {showConnectRepo && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div className="glass" style={{ width: "100%", maxWidth: "420px", padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Connect GitHub Repository</h3>
              {errorMsg && <div style={{ color: "var(--color-danger)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", padding: "10px", borderRadius: "6px", fontSize: "0.8rem" }}>{errorMsg}</div>}
              <form onSubmit={handleConnectRepo} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Repository path</label>
                  <input
                    type="text"
                    value={githubRepoInput}
                    onChange={(e) => setGithubRepoInput(e.target.value)}
                    placeholder="owner/repo (e.g. facebook/react)"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", justifyItems: "flex-end", gap: "12px", marginTop: "8px" }}>
                  <button type="button" onClick={() => setShowConnectRepo(false)} className="glow-btn-secondary" style={{ flexGrow: 1, padding: "8px", justifyContent: "center" }}>Cancel</button>
                  <button type="submit" className="glow-btn" disabled={actionLoading} style={{ flexGrow: 1, padding: "8px", justifyContent: "center" }}>
                    {actionLoading ? <Loader2 className="animate-spin" size={16} /> : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Feature Request */}
        {showCreateFeature && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div className="glass" style={{ width: "100%", maxWidth: "500px", padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Add Feature Request</h3>
              {errorMsg && <div style={{ color: "var(--color-danger)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", padding: "10px", borderRadius: "6px", fontSize: "0.8rem" }}>{errorMsg}</div>}
              <form onSubmit={handleCreateFeature} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Title</label>
                  <input
                    type="text"
                    value={featureTitle}
                    onChange={(e) => setFeatureTitle(e.target.value)}
                    required
                    placeholder="Implement dark mode toggle"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Description / User Ask</label>
                  <textarea
                    value={featureDesc}
                    onChange={(e) => setFeatureDesc(e.target.value)}
                    required
                    placeholder="Customers are requesting a toggle to switch between dark and light themes in the sidebar settings panel."
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none", height: "120px", resize: "none" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Source</label>
                  <select
                    value={featureSource}
                    onChange={(e) => setFeatureSource(e.target.value as any)}
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none", color: "var(--text-primary)" }}
                  >
                    <option value="MANUAL" style={{ background: "#0f111a" }}>Manual Creation</option>
                    <option value="EMAIL" style={{ background: "#0f111a" }}>Support Email</option>
                    <option value="SUPPORT" style={{ background: "#0f111a" }}>Support Ticket</option>
                  </select>
                </div>
                <div style={{ display: "flex", justifyItems: "flex-end", gap: "12px", marginTop: "8px" }}>
                  <button type="button" onClick={() => setShowCreateFeature(false)} className="glow-btn-secondary" style={{ flexGrow: 1, padding: "8px", justifyContent: "center" }}>Cancel</button>
                  <button type="submit" className="glow-btn" disabled={actionLoading} style={{ flexGrow: 1, padding: "8px", justifyContent: "center" }}>
                    {actionLoading ? <Loader2 className="animate-spin" size={16} /> : "Submit Feature"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
