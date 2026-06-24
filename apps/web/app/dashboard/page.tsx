"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { trpc } from "../../lib/trpc";
import { 
  Plus, 
  Folder, 
  GitBranch, 
  CreditCard, 
  Sparkles, 
  LogOut, 
  Building,
  ArrowRight,
  GitPullRequest,
  CheckCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  
  // Auth state
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  
  // Organization state
  const { data: orgsData, error: orgsError, refetch: refetchOrgs } = authClient.useListOrganizations();
  const { data: activeOrg } = authClient.useActiveOrganization();
  
  // Modals / forms state
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Get session
  useEffect(() => {
    async function checkSession() {
      try {
        const { data, error } = await authClient.getSession();
        if (error || !data) {
          router.push("/auth");
        } else {
          setSession(data);
        }
      } catch (e) {
        router.push("/auth");
      } finally {
        setSessionLoading(false);
      }
    }
    checkSession();
  }, [router]);

  // Query projects for active organization
  const activeOrgId = activeOrg?.id || "";
  const { data: projects, refetch: refetchProjects, isLoading: projectsLoading } = trpc.project.list.useQuery(
    { organizationId: activeOrgId },
    { enabled: !!activeOrgId }
  );

  // Query subscription details
  const { data: subscription, refetch: refetchSub } = trpc.workspace.getSubscription.useQuery(
    { organizationId: activeOrgId },
    { enabled: !!activeOrgId }
  );

  // tRPC mutations
  const createProjectMutation = trpc.project.create.useMutation();

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setActionLoading(true);
    setFormError("");

    try {
      const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const { data, error } = await authClient.organization.create({
        name: newOrgName,
        slug,
      });

      if (error) {
        setFormError(error.message || "Failed to create organization");
      } else {
        setNewOrgName("");
        setShowCreateOrg(false);
        // Set active
        if (data?.id) {
          await authClient.organization.setActive({ organizationId: data.id });
        }
        refetchOrgs();
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !activeOrgId) return;
    setActionLoading(true);
    setFormError("");

    try {
      await createProjectMutation.mutateAsync({
        organizationId: activeOrgId,
        name: projectName,
        description: projectDesc,
        githubRepo: githubRepo.trim() || undefined,
      });

      setProjectName("");
      setProjectDesc("");
      setGithubRepo("");
      setShowCreateProject(false);
      refetchProjects();
      refetchSub(); // Refresh repository limit counts
    } catch (err: any) {
      setFormError(err.message || "Failed to create project");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  const switchOrg = async (id: string) => {
    await authClient.organization.setActive({ organizationId: id });
    refetchProjects();
    refetchSub();
  };

  if (sessionLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside className="glass" style={{ width: "280px", borderRight: "1px solid var(--border-color)", borderRadius: 0, padding: "24px", display: "flex", flexDirection: "column", gap: "24px", flexShrink: 0 }}>
        
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", fontSize: "1.1rem" }}>
          <Sparkles size={18} style={{ color: "#6366f1" }} />
          <span className="text-gradient">ShipFlow AI</span>
        </div>

        {/* Workspace Selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Workspace</label>
          {orgsData && orgsData.length > 0 ? (
            <select 
              value={activeOrgId} 
              onChange={(e) => switchOrg(e.target.value)}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "8px 12px", outline: "none", color: "var(--text-primary)" }}
            >
              {orgsData.map((o: any) => (
                <option key={o.id} value={o.id} style={{ background: "#0f111a" }}>{o.name}</option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "4px 0" }}>No workspace active</div>
          )}
          <button 
            onClick={() => { setFormError(""); setShowCreateOrg(true); }}
            style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: "4px 0", width: "fit-content", fontWeight: "500" }}
          >
            <Plus size={14} /> New Workspace
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Link href="/dashboard" className="glow-btn-secondary" style={{ border: "none", background: "rgba(99, 102, 241, 0.08)", color: "var(--color-primary)", justifyContent: "flex-start", padding: "10px 12px", borderRadius: "8px" }}>
            <Folder size={18} /> Projects
          </Link>
          <Link href="/billing" className="glow-btn-secondary" style={{ border: "none", justifyContent: "flex-start", padding: "10px 12px", borderRadius: "8px" }}>
            <CreditCard size={18} /> Billing & Plans
          </Link>
        </nav>

        {/* Subscription limits display */}
        {activeOrg && subscription && (
          <div className="glass" style={{ padding: "16px", fontSize: "0.85rem", marginTop: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "600" }}>Plan</span>
              <span className={`badge ${subscription.plan === "PREMIUM" ? "badge-premium" : "badge-free"}`}>
                {subscription.plan}
              </span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                <span>AI Credits:</span>
                <span style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{subscription.aiCredits}</span>
              </div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min((subscription.aiCredits / 5) * 100, 100)}%`, background: "var(--color-primary)" }}></div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
              <span>Repo limit:</span>
              <span style={{ fontWeight: "bold", color: "var(--text-primary)" }}>
                {subscription.plan === "PREMIUM" ? "Unlimited" : `${subscription.repoLimit} connected`}
              </span>
            </div>
            {subscription.plan !== "PREMIUM" && (
              <Link href="/billing" className="glow-btn" style={{ width: "100%", padding: "6px", fontSize: "0.75rem", justifyContent: "center", borderRadius: "6px", marginTop: "4px" }}>
                Upgrade to Premium
              </Link>
            )}
          </div>
        )}

        {/* User profile */}
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "9999px", background: "linear-gradient(135deg, #6366f1, #0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.9rem" }}>
              {session?.user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: "140px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.name}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.email}</span>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flexGrow: 1, padding: "40px", display: "flex", flexDirection: "column", gap: "32px", overflowY: "auto" }}>
        
        {/* No Workspace Warning */}
        {orgsData && orgsData.length === 0 && (
          <div className="glass" style={{ padding: "40px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px", margin: "auto 0" }}>
            <Building size={48} className="text-indigo-500" style={{ color: "#6366f1" }} />
            <h2 style={{ fontSize: "1.5rem" }}>Create your first workspace</h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "400px" }}>
              Workspaces isolate your teams, repositories, billing subscriptions, and workflow configurations.
            </p>
            <form onSubmit={handleCreateOrg} style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "400px" }}>
              <input
                type="text"
                placeholder="Workspace Name (e.g. My Team)"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                required
                style={{ flexGrow: 1, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none" }}
              />
              <button type="submit" className="glow-btn" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={18} /> : "Create"}
              </button>
            </form>
          </div>
        )}

        {/* Dashboard Header */}
        {activeOrg && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: "2rem", marginBottom: "4px" }}>Projects</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Coordinate feature shipping in workspace **{activeOrg.name}**</p>
            </div>
            <button onClick={() => { setFormError(""); setShowCreateProject(true); }} className="glow-btn">
              <Plus size={18} /> Create Project
            </button>
          </div>
        )}

        {/* Project Grid */}
        {activeOrg && (
          <>
            {projectsLoading ? (
              <div style={{ display: "flex", padding: "40px", justifyContent: "center" }}>
                <Loader2 className="animate-spin text-indigo-500" size={24} />
              </div>
            ) : projects && projects.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
                {projects.map((project: any) => (
                  <Link key={project.id} href={`/project/${project.id}`} className="glass-interactive" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{project.name}</h3>
                      <Folder size={18} style={{ color: "var(--color-primary)" }} />
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", flexGrow: 1, lineBreak: "anywhere" }}>
                      {project.description || "No description provided."}
                    </p>
                    <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <GitBranch size={14} />
                        {project.githubRepo ? (
                          <span style={{ color: "var(--text-secondary)", fontWeight: "500" }}>{project.githubRepo}</span>
                        ) : (
                          <span>Connect repo</span>
                        )}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--color-primary)", fontWeight: "600" }}>
                        View Board <ArrowRight size={12} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="glass" style={{ padding: "60px 40px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px" }}>
                <Folder size={40} style={{ color: "var(--text-muted)" }} />
                <h3 style={{ fontSize: "1.25rem" }}>No projects created yet</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "360px" }}>
                  Create your first project to start creating feature requests and managing engineering task deliveries.
                </p>
                <button onClick={() => { setFormError(""); setShowCreateProject(true); }} className="glow-btn" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                  <Plus size={16} /> Create First Project
                </button>
              </div>
            )}
          </>
        )}

        {/* Modal: Create Organization */}
        {showCreateOrg && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div className="glass" style={{ width: "100%", maxWidth: "400px", padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Create Workspace</h3>
              {formError && <div style={{ color: "var(--color-danger)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", padding: "10px", borderRadius: "6px", fontSize: "0.8rem" }}>{formError}</div>}
              <form onSubmit={handleCreateOrg} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Workspace Name</label>
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    required
                    placeholder="Engineering Team"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", justifyItems: "flex-end", gap: "12px", marginTop: "8px" }}>
                  <button type="button" onClick={() => setShowCreateOrg(false)} className="glow-btn-secondary" style={{ flexGrow: 1, padding: "8px", justifyContent: "center" }}>Cancel</button>
                  <button type="submit" className="glow-btn" disabled={actionLoading} style={{ flexGrow: 1, padding: "8px", justifyContent: "center" }}>
                    {actionLoading ? <Loader2 className="animate-spin" size={16} /> : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Project */}
        {showCreateProject && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div className="glass" style={{ width: "100%", maxWidth: "460px", padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Create New Project</h3>
              {formError && <div style={{ color: "var(--color-danger)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", padding: "10px", borderRadius: "6px", fontSize: "0.8rem" }}>{formError}</div>}
              <form onSubmit={handleCreateProject} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    placeholder="My SaaS App"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Description (Optional)</label>
                  <textarea
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="Build the core billing engine and checkouts"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none", height: "80px", resize: "none" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>GitHub Repository (Optional)</label>
                    {subscription?.plan !== "PREMIUM" && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Free Plan limit: 1 repo</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    placeholder="owner/repo (e.g. vercel/next.js)"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", justifyItems: "flex-end", gap: "12px", marginTop: "8px" }}>
                  <button type="button" onClick={() => setShowCreateProject(false)} className="glow-btn-secondary" style={{ flexGrow: 1, padding: "8px", justifyContent: "center" }}>Cancel</button>
                  <button type="submit" className="glow-btn" disabled={actionLoading} style={{ flexGrow: 1, padding: "8px", justifyContent: "center" }}>
                    {actionLoading ? <Loader2 className="animate-spin" size={16} /> : "Create Project"}
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
