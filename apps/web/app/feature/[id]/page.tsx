"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { authClient } from "../../../lib/auth-client";
import { 
  ArrowLeft, 
  MessageSquare, 
  FileText, 
  ClipboardList, 
  ShieldCheck, 
  CheckCircle, 
  Loader2, 
  Send, 
  Play, 
  GitBranch, 
  AlertOctagon, 
  AlertCircle,
  FolderOpen,
  Sparkles
} from "lucide-react";
import Link from "next/link";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

interface EngineeringTask {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
}

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: "BLOCKING" | "NON_BLOCKING";
  status: string;
}

function renderMarkdown(md: string | null) {
  if (!md) return <span style={{ color: "var(--text-muted)" }}>No content generated.</span>;
  
  const lines = md.split("\n");
  let html = "";
  let inList = false;

  for (let line of lines) {
    line = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    if (line.startsWith("### ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h4 style="font-size: 1.15rem; font-weight: 700; margin-top: 18px; margin-bottom: 8px; color: var(--text-primary);">${line.slice(4)}</h4>`;
    }
    else if (line.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h3 style="font-size: 1.35rem; font-weight: 700; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; color: var(--text-primary);">${line.slice(3)}</h3>`;
    }
    else if (line.startsWith("# ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2 style="font-size: 1.6rem; font-weight: 700; margin-top: 28px; margin-bottom: 16px; color: var(--text-primary);">${line.slice(2)}</h2>`;
    }
    else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      if (!inList) { html += '<ul style="margin-bottom: 16px; padding-left: 20px; list-style-type: disc;">'; inList = true; }
      const content = line.trim().slice(2);
      html += `<li style="margin-bottom: 6px; color: var(--text-secondary);">${content}</li>`;
    }
    else if (line.trim() === "") {
      if (inList) { html += "</ul>"; inList = false; }
      html += "<br />";
    }
    else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p style="margin-bottom: 12px; line-height: 1.6; color: var(--text-secondary);">${line}</p>`;
    }
  }

  if (inList) { html += "</ul>"; }

  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary); font-weight: 600;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color: var(--text-primary);">$1</em>')
    .replace(/`(.*?)`/g, '<code style="background: rgba(255, 255, 255, 0.05); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.85em; border: 1px solid rgba(255,255,255,0.03);">$1</code>');

  return <div dangerouslySetInnerHTML={{ __html: html }} style={{ fontSize: "0.95rem" }} />;
}

export default function FeaturePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [activeTab, setActiveTab] = useState<"clarify" | "prd" | "tasks" | "review" | "release">("clarify");
  const [chatMessage, setChatMessage] = useState("");
  const [prNumberInput, setPrNumberInput] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: feature, refetch: refetchFeature, isLoading: featureLoading } = trpc.featureRequest.getById.useQuery(
    { id },
    { refetchInterval: (data: any) => {
      if (data?.status === "PRD_GENERATING" || data?.status === "QA_REVIEWING") {
        return 2000;
      }
      return false;
    }}
  );

  const sendChatMutation = trpc.featureRequest.sendChatMessage.useMutation();
  const finalizePrdMutation = trpc.featureRequest.finalizeAndGenerate.useMutation();
  const updateTaskMutation = trpc.tasks.updateStatus.useMutation();
  const linkPrMutation = trpc.github.submitPR.useMutation();
  const simulatePrMutation = trpc.github.triggerMockPR.useMutation();
  const approveReleaseMutation = trpc.release.approve.useMutation();
  const rejectReleaseMutation = trpc.release.reject.useMutation();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feature?.chatMessages]);

  useEffect(() => {
    if (feature) {
      if (feature.status === "CLARIFYING" || feature.status === "DRAFT" || feature.status === "PRD_GENERATING") {
        setActiveTab("clarify");
      } else if (feature.status === "PRD_GENERATED") {
        setActiveTab("prd");
      } else if (feature.status === "TASKS_GENERATED") {
        setActiveTab("tasks");
      } else if (feature.status === "DEVELOPING" || feature.status === "QA_REVIEWING") {
        setActiveTab("review");
      } else if (feature.status === "HUMAN_APPROVAL" || feature.status === "SHIPPED") {
        setActiveTab("release");
      }
    }
  }, [feature?.status]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || actionLoading) return;
    setActionLoading(true);
    setErrorMsg("");

    try {
      const msg = chatMessage;
      setChatMessage("");
      await sendChatMutation.mutateAsync({
        featureRequestId: id,
        content: msg,
      });
      refetchFeature();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send message");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizePRD = async () => {
    setActionLoading(true);
    setErrorMsg("");
    try {
      await finalizePrdMutation.mutateAsync({ featureRequestId: id });
      refetchFeature();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to finalize PRD generation");
      setActionLoading(false);
    }
  };

  const handleMoveTask = async (taskId: string, currentStatus: string, direction: "LEFT" | "RIGHT") => {
    const statuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
    const idx = statuses.indexOf(currentStatus);
    const nextIdx = idx + (direction === "RIGHT" ? 1 : -1);
    
    if (nextIdx < 0 || nextIdx >= statuses.length) return;
    const nextStatus = statuses[nextIdx] as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

    try {
      await updateTaskMutation.mutateAsync({
        taskId,
        status: nextStatus,
      });
      refetchFeature();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleLinkPR = async (e: React.FormEvent) => {
    e.preventDefault();
    const prNum = parseInt(prNumberInput);
    if (isNaN(prNum) || !feature?.project?.githubRepo) return;
    setActionLoading(true);
    setErrorMsg("");

    try {
      await linkPrMutation.mutateAsync({
        featureRequestId: id,
        prNumber: prNum,
        githubRepo: feature.project.githubRepo,
      });
      setPrNumberInput("");
      refetchFeature();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to link pull request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulatePR = async (type: "WITH_ERRORS" | "CLEAN") => {
    setActionLoading(true);
    setErrorMsg("");
    try {
      await simulatePrMutation.mutateAsync({
        featureRequestId: id,
        type,
      });
      refetchFeature();
    } catch (err: any) {
      setErrorMsg(err.message || "Simulation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRelease = async () => {
    setActionLoading(true);
    setErrorMsg("");
    try {
      await approveReleaseMutation.mutateAsync({
        featureRequestId: id,
        notes: releaseNotes,
      });
      refetchFeature();
    } catch (err: any) {
      setErrorMsg(err.message || "Release approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRelease = async () => {
    setActionLoading(true);
    setErrorMsg("");
    try {
      await rejectReleaseMutation.mutateAsync({
        featureRequestId: id,
        notes: releaseNotes,
      });
      refetchFeature();
    } catch (err: any) {
      setErrorMsg(err.message || "Release rejection failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (featureLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (!feature) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <h2 style={{ fontSize: "1.5rem" }}>Feature Request Not Found</h2>
        <Link href="/dashboard" className="glow-btn">Go to Dashboard</Link>
      </div>
    );
  }

  const activePR = feature.pullRequests?.[0];
  const activeReview = activePR?.reviews?.[0];
  const activeIssues: Issue[] = (activeReview?.issues as unknown as Issue[]) || [];
  const blockingIssues = activeIssues.filter((i: Issue) => i.severity === "BLOCKING");
  const nonBlockingIssues = activeIssues.filter((i: Issue) => i.severity === "NON_BLOCKING");

  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      {/* Header */}
      <header className="glass" style={{ borderBottom: "1px solid var(--border-color)", padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href={`/project/${feature.projectId}`} style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            <ArrowLeft size={16} /> Back to Project
          </Link>
          <div style={{ width: "1px", height: "16px", background: "var(--border-color)" }}></div>
          <div>
            <h1 style={{ fontSize: "1.15rem", fontWeight: "bold" }}>{feature.title}</h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Current status: <strong style={{ color: "var(--color-primary)" }}>{feature.status}</strong></p>
          </div>
        </div>

        {/* Tab Navigation links */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button 
            onClick={() => setActiveTab("clarify")} 
            className="glow-btn-secondary" 
            style={{ 
              fontSize: "0.8rem", 
              padding: "8px 12px", 
              border: "none", 
              background: activeTab === "clarify" ? "rgba(255,255,255,0.06)" : "transparent",
              color: activeTab === "clarify" ? "var(--text-primary)" : "var(--text-secondary)"
            }}
          >
            1. Clarify
          </button>
          
          <button 
            onClick={() => setActiveTab("prd")} 
            disabled={!feature.prd}
            className="glow-btn-secondary" 
            style={{ 
              fontSize: "0.8rem", 
              padding: "8px 12px", 
              border: "none", 
              background: activeTab === "prd" ? "rgba(255,255,255,0.06)" : "transparent",
              color: activeTab === "prd" ? "var(--text-primary)" : "var(--text-secondary)"
            }}
          >
            2. PRD Spec
          </button>

          <button 
            onClick={() => setActiveTab("tasks")} 
            disabled={feature.tasks.length === 0}
            className="glow-btn-secondary" 
            style={{ 
              fontSize: "0.8rem", 
              padding: "8px 12px", 
              border: "none", 
              background: activeTab === "tasks" ? "rgba(255,255,255,0.06)" : "transparent",
              color: activeTab === "tasks" ? "var(--text-primary)" : "var(--text-secondary)"
            }}
          >
            3. Kanban
          </button>

          <button 
            onClick={() => setActiveTab("review")} 
            disabled={feature.tasks.length === 0}
            className="glow-btn-secondary" 
            style={{ 
              fontSize: "0.8rem", 
              padding: "8px 12px", 
              border: "none", 
              background: activeTab === "review" ? "rgba(255,255,255,0.06)" : "transparent",
              color: activeTab === "review" ? "var(--text-primary)" : "var(--text-secondary)"
            }}
          >
            4. QA & Code
          </button>

          <button 
            onClick={() => setActiveTab("release")} 
            disabled={feature.status !== "HUMAN_APPROVAL" && feature.status !== "SHIPPED"}
            className="glow-btn-secondary" 
            style={{ 
              fontSize: "0.8rem", 
              padding: "8px 12px", 
              border: "none", 
              background: activeTab === "release" ? "rgba(255,255,255,0.06)" : "transparent",
              color: activeTab === "release" ? "var(--text-primary)" : "var(--text-secondary)"
            }}
          >
            5. Release Sign-off
          </button>
        </div>
      </header>

      {/* Error alert */}
      {errorMsg && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", borderBottom: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--color-danger)", padding: "12px 40px", fontSize: "0.85rem", display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Board view */}
      <main style={{ flexGrow: 1, padding: "40px", maxWidth: "1200px", margin: "0 auto", width: "100%", overflowY: "auto" }}>
        
        {/* Tab 1: Clarification */}
        {activeTab === "clarify" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 220px)", minHeight: "450px", gap: "20px" }}>
            
            {/* Top Prompt Card */}
            <div className="glass" style={{ padding: "20px 24px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Feature Request Brief</span>
              <p style={{ fontSize: "1rem", color: "var(--text-primary)", fontWeight: "500", marginTop: "4px" }}>{feature.description}</p>
            </div>

            {/* Chat Box */}
            <div className="glass" style={{ flexGrow: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {feature.chatMessages && feature.chatMessages.length > 0 ? (
                feature.chatMessages.map((msg: ChatMessage) => (
                  <div 
                    key={msg.id} 
                    style={{ 
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "75%",
                      background: msg.role === "user" ? "var(--color-primary)" : "rgba(255,255,255,0.03)",
                      border: msg.role === "user" ? "none" : "1px solid var(--border-color)",
                      padding: "16px 20px",
                      borderRadius: msg.role === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                      lineHeight: "1.5"
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: msg.role === "user" ? "rgba(255,255,255,0.7)" : "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                      {msg.role === "user" ? "You" : "AI Product Owner"}
                    </span>
                    <p style={{ fontSize: "0.95rem", color: msg.role === "user" ? "white" : "var(--text-secondary)", whiteSpace: "pre-line" }}>
                      {msg.content}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", gap: "10px" }}>
                  <MessageSquare size={36} />
                  <span>Start the discovery conversation below to clarify context.</span>
                </div>
              )}
              {feature.status === "PRD_GENERATING" && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(99,102,241,0.05)", border: "1px dashed rgba(99,102,241,0.3)", padding: "16px", borderRadius: "12px", color: "var(--color-primary)", fontSize: "0.9rem", alignSelf: "flex-start" }}>
                  <Loader2 className="animate-spin" size={18} />
                  <span>AI Agent is generating structured PRD spec & engineering tasks in the background...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat inputs & Finalize triggers */}
            {feature.status === "CLARIFYING" || feature.status === "DRAFT" ? (
              <div style={{ display: "flex", gap: "12px" }}>
                <form onSubmit={handleSendMessage} style={{ display: "flex", flexGrow: 1, gap: "12px" }}>
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    required
                    placeholder="Provide details about target audience, specifications, or answer follow-up questions..."
                    style={{ flexGrow: 1, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px 18px", outline: "none" }}
                  />
                  <button type="submit" className="glow-btn" disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  </button>
                </form>

                {feature.chatMessages && feature.chatMessages.length > 1 && (
                  <button 
                    onClick={handleFinalizePRD} 
                    className="glow-btn" 
                    style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)", whiteSpace: "nowrap" }}
                    disabled={actionLoading}
                  >
                    <Play size={16} /> Finalize & Generate PRD
                  </button>
                )}
              </div>
            ) : (
              <div className="glass" style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  Requirement Discovery Completed. PRD and Engineering tasks have been generated.
                </span>
                <button onClick={() => setActiveTab("prd")} className="glow-btn">
                  View PRD Spec
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: PRD Viewer */}
        {activeTab === "prd" && (
          <div className="glass animate-fade-in" style={{ padding: "40px", maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Deliverable</span>
                <h2 style={{ fontSize: "1.75rem" }}>Product Requirements Document</h2>
              </div>
              <button onClick={() => setActiveTab("tasks")} className="glow-btn">
                View Kanban Board
              </button>
            </div>
            <div style={{ padding: "8px 0" }}>
              {renderMarkdown(feature.prd)}
            </div>
          </div>
        )}

        {/* Tab 3: Kanban Board */}
        {activeTab === "tasks" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem" }}>Engineering Tasks</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Actionable task breakdown derived from PRD specifications</p>
              </div>
              <button onClick={() => setActiveTab("review")} className="glow-btn">
                Proceed to Development
              </button>
            </div>

            {/* Kanban Columns */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", alignItems: "flex-start" }}>
              {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((col) => {
                const colTasks = feature.tasks.filter((t: any) => t.status === col);
                return (
                  <div key={col} className="glass" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", minHeight: "400px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                      <span style={{ fontWeight: "bold", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{col}</span>
                      <span className="badge badge-free" style={{ background: "rgba(255,255,255,0.03)" }}>{colTasks.length}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {colTasks.map((task: EngineeringTask) => (
                        <div key={task.id} className="glass" style={{ padding: "16px", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>{task.title}</span>
                          {task.description && (
                            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                              {task.description}
                            </p>
                          )}
                          
                          {/* Left/Right movement triggers */}
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "8px", marginTop: "4px" }}>
                            {col !== "TODO" && (
                              <button 
                                onClick={() => handleMoveTask(task.id, task.status, "LEFT")}
                                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.75rem" }}
                              >
                                ◀ Back
                              </button>
                            )}
                            {col !== "DONE" && (
                              <button 
                                onClick={() => handleMoveTask(task.id, task.status, "RIGHT")}
                                style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600" }}
                              >
                                Move ▶
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Code & QA Review */}
        {activeTab === "review" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>GitHub Integration & AI QA Review</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  Link a PR or run a local simulation to check your implementation against requirements
                </p>
              </div>
              {feature.status === "HUMAN_APPROVAL" && (
                <button onClick={() => setActiveTab("release")} className="glow-btn">
                  Go to Final Sign-off
                </button>
              )}
            </div>

            {/* QA Dashboard Controls */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              
              {/* GitHub Pull Request Linker */}
              <div className="glass" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <GitBranch className="text-indigo-500" style={{ color: "#6366f1" }} /> 
                  Link Live GitHub PR
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  If your project has a connected repository (e.g. <code>{feature.project?.githubRepo || "owner/repo"}</code>) and your server has a GITHUB_TOKEN configured, enter the PR number below to pull the diff.
                </p>
                <form onSubmit={handleLinkPR} style={{ display: "flex", gap: "12px", marginTop: "auto" }}>
                  <input
                    type="number"
                    value={prNumberInput}
                    onChange={(e) => setPrNumberInput(e.target.value)}
                    required
                    placeholder="PR Number (e.g. 42)"
                    disabled={!feature.project?.githubRepo}
                    style={{ flexGrow: 1, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none" }}
                  />
                  <button type="submit" className="glow-btn" disabled={actionLoading || !feature.project?.githubRepo}>
                    Link PR
                  </button>
                </form>
              </div>

              {/* Mocks and Simulators */}
              <div className="glass" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles className="text-indigo-500" style={{ color: "#6366f1" }} /> 
                  No-code AI Simulator (Testing)
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Test the entire AI review loop immediately by simulating code submissions.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "auto" }}>
                  <button 
                    onClick={() => handleSimulatePR("WITH_ERRORS")} 
                    className="glow-btn-secondary" 
                    style={{ borderColor: "rgba(239,68,68,0.3)", color: "var(--color-danger)" }}
                    disabled={actionLoading}
                  >
                    Simulate PR with exposed API Key (Should fail review)
                  </button>
                  <button 
                    onClick={() => handleSimulatePR("CLEAN")} 
                    className="glow-btn-secondary" 
                    style={{ borderColor: "rgba(16,185,129,0.3)", color: "var(--color-success)" }}
                    disabled={actionLoading}
                  >
                    Simulate Clean Code PR (Should pass review)
                  </button>
                </div>
              </div>

            </div>

            {/* In Review Loader */}
            {feature.status === "QA_REVIEWING" && (
              <div className="glass animate-pulse" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", color: "var(--color-primary)" }}>
                <Loader2 className="animate-spin" size={24} />
                <div>
                  <h4 style={{ fontWeight: "bold" }}>AI QA Review In Progress...</h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Analyzing code changes against requirements, acceptance criteria, security configurations, and performance rules.</p>
                </div>
              </div>
            )}

            {/* PR Details and AI reviews logs */}
            {activePR && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* PR Banner */}
                <div className="glass" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Linked Pull Request</span>
                    <h3 style={{ fontSize: "1.1rem", marginTop: "4px" }}>
                      <a href={activePR.htmlUrl || "#"} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", color: "var(--color-primary)" }}>
                        #{activePR.prNumber}: {activePR.title}
                      </a>
                    </h3>
                  </div>
                  {activeReview && (
                    <span 
                      className="badge" 
                      style={{ 
                        padding: "6px 12px", 
                        fontSize: "0.85rem",
                        background: activeReview.status === "APPROVED" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        color: activeReview.status === "APPROVED" ? "var(--color-success)" : "var(--color-danger)",
                        border: activeReview.status === "APPROVED" ? "1px solid var(--color-success)" : "1px solid var(--color-danger)"
                      }}
                    >
                      {activeReview.status === "APPROVED" ? "APPROVED BY AI QA" : "CHANGES REQUESTED BY AI QA"}
                    </span>
                  )}
                </div>

                {/* AI Review Comments and Issues */}
                {activeReview ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px", alignItems: "flex-start" }}>
                    
                    {/* Review Feedback MD */}
                    <div className="glass" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
                      <h4 style={{ fontWeight: "bold", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>AI Review Log</h4>
                      <div>{renderMarkdown(activeReview.feedback)}</div>
                    </div>

                    {/* Review Issues */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      
                      {/* Blocking Issues */}
                      <div className="glass" style={{ padding: "24px" }}>
                        <div style={{ display: "flex", justifyItems: "center", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                          <span style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px", color: "var(--color-danger)" }}>
                            <AlertOctagon size={16} /> Blocking ({blockingIssues.length})
                          </span>
                        </div>
                        {blockingIssues.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {blockingIssues.map((issue: Issue) => (
                              <div key={issue.id} style={{ background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.15)", padding: "12px", borderRadius: "8px" }}>
                                <h5 style={{ fontWeight: "bold", fontSize: "0.85rem", marginBottom: "4px" }}>{issue.title}</h5>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>{issue.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No blocking issues found. Code is safe.</div>
                        )}
                      </div>

                      {/* Non-Blocking Issues */}
                      <div className="glass" style={{ padding: "24px" }}>
                        <div style={{ display: "flex", justifyItems: "center", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                          <span style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px", color: "var(--color-warning)" }}>
                            <AlertCircle size={16} /> Suggestions ({nonBlockingIssues.length})
                          </span>
                        </div>
                        {nonBlockingIssues.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {nonBlockingIssues.map((issue: Issue) => (
                              <div key={issue.id} style={{ background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.15)", padding: "12px", borderRadius: "8px" }}>
                                <h5 style={{ fontWeight: "bold", fontSize: "0.85rem", marginBottom: "4px" }}>{issue.title}</h5>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>{issue.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No suggestions filed.</div>
                        )}
                      </div>

                    </div>

                  </div>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", padding: "40px" }}>No reviews logged for this PR yet. Click simulate/link PR above to trigger.</div>
                )}

              </div>
            )}

          </div>
        )}

        {/* Tab 5: Release Sign-off */}
        {activeTab === "release" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "800px", margin: "0 auto" }}>
            
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>Human PM Approval & Release</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Perform the final manual verification check to deploy code changes to production</p>
            </div>

            {/* Checklists */}
            <div className="glass" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <h3 style={{ fontSize: "1.2rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>Release Readiness Checklist</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <CheckCircle className="text-emerald-500" style={{ color: "#10b981", flexShrink: 0 }} />
                  <div>
                    <h4 style={{ fontWeight: "bold", fontSize: "0.95rem" }}>PRD Specifications Generated</h4>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>AI Product Owner successfully documented goals, scope, and acceptance criteria.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <CheckCircle className="text-emerald-500" style={{ color: "#10b981", flexShrink: 0 }} />
                  <div>
                    <h4 style={{ fontWeight: "bold", fontSize: "0.95rem" }}>Kanban Tasks Synchronized</h4>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Derived tasks were placed on the team delivery board.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <CheckCircle className={`${blockingIssues.length === 0 ? "text-emerald-500" : "text-rose-500"}`} style={{ color: blockingIssues.length === 0 ? "#10b981" : "#ef4444", flexShrink: 0 }} />
                  <div>
                    <h4 style={{ fontWeight: "bold", fontSize: "0.95rem" }}>AI QA Code Review Loop Result</h4>
                    {blockingIssues.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Passed! All critical blocking security and logic checks are satisfied.</p>
                    ) : (
                      <p style={{ fontSize: "0.8rem", color: "var(--color-danger)" }}>Blocked! There are {blockingIssues.length} unresolved blocking issues in the code.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Approval / Shipped View details */}
            {feature.status === "HUMAN_APPROVAL" ? (
              <div className="glass" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ fontWeight: "bold" }}>Sign-off Signature</h4>
                <textarea
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="Enter release notes or sign-off message (e.g., Shipped verified dark mode settings to production)"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 14px", outline: "none", height: "80px", resize: "none" }}
                />
                
                <div style={{ display: "flex", gap: "16px" }}>
                  <button 
                    onClick={handleRejectRelease}
                    className="glow-btn-secondary" 
                    style={{ flexGrow: 1, justifyContent: "center", borderColor: "rgba(239,68,68,0.3)", color: "var(--color-danger)" }}
                    disabled={actionLoading}
                  >
                    Reject Release
                  </button>
                  <button 
                    onClick={handleApproveRelease}
                    className="glow-btn" 
                    style={{ flexGrow: 1, justifyContent: "center", background: "linear-gradient(135deg, #10b981, #059669)" }}
                    disabled={actionLoading || blockingIssues.length > 0}
                  >
                    Approve & Release to Production
                  </button>
                </div>
              </div>
            ) : feature.status === "SHIPPED" ? (
              <div className="glass" style={{ padding: "40px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", border: "1px solid var(--color-success)", background: "rgba(16,185,129,0.02)" }}>
                <FolderOpen size={48} className="text-emerald-500" style={{ color: "#10b981" }} />
                <div>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Release Shipped! 🚀</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>This feature request is closed and successfully running in production.</p>
                </div>
                {feature.releases?.[0] && (
                  <div className="glass" style={{ width: "100%", padding: "16px", background: "rgba(255,255,255,0.01)", textAlign: "left", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Release Notes:</span>
                    <p style={{ color: "var(--text-secondary)", whiteSpace: "pre-line" }}>{feature.releases[0].notes || "No release notes provided."}</p>
                  </div>
                )}
                <Link href={`/project/${feature.projectId}`} className="glow-btn" style={{ padding: "8px 20px" }}>
                  Return to Project Board
                </Link>
              </div>
            ) : null}

          </div>
        )}

      </main>
    </div>
  );
}
