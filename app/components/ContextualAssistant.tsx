"use client";

import { useState, useEffect } from "react";
import { Sparkle, X, CheckSquare } from "@phosphor-icons/react";

type Recommendation = {
  id: string;
  proposal: { title: string; priority: string };
  sources: { title: string }[];
  provider: string;
};

export function ContextualAssistant({
  isOpen,
  onClose,
  assistantContext,
  active,
  title
}: {
  isOpen: boolean;
  onClose: () => void;
  assistantContext?: { type: string; id: string };
  active?: string;
  title?: string;
}) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [assistantError, setAssistantError] = useState("");
  const [loadingAssistant, setLoadingAssistant] = useState(false);
  const [planPrompt, setPlanPrompt] = useState("");
  const [resolvedContext, setResolvedContext] = useState<{ type: string; id: string } | undefined>();

  const currentContext = assistantContext || resolvedContext;

  async function loadRecommendations(customContext = currentContext) {
    setLoadingAssistant(true);
    setAssistantError("");
    try {
      let context = customContext;
      if (!context && active === "Projects" && title) {
        const data = await (await fetch("/api/v1/projects")).json(),
          project = data.projects?.find((item: { id: string; name: string }) => item.name === title);
        if (project) {
          context = { type: "project", id: project.id };
          setResolvedContext(context);
        }
      }
      const url = context
        ? `/api/v1/recommendations?contextType=${context.type}&contextId=${context.id}&generate=true`
        : `/api/v1/recommendations?generate=true`;
      const response = await fetch(url),
        data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Failed to load recommendations");
      setRecommendations(data.recommendations || []);
    } catch (error) {
      setAssistantError((error as Error).message);
    } finally {
      setLoadingAssistant(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    void loadRecommendations();
  }, [isOpen, assistantContext?.type, assistantContext?.id, active, title]);

  async function decide(item: Recommendation, disposition: "accepted" | "rejected") {
    const response = await fetch(`/api/v1/recommendations/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disposition })
    });
    if (response.ok) setRecommendations((current) => current.filter((value) => value.id !== item.id));
    else setAssistantError((await response.json()).error?.message || "Recommendation failed");
  }

  if (!isOpen) return null;

  return (
    <aside className="ai-panel" aria-label="Contextual assistant">
      <header>
        <span>
          <Sparkle />
          <strong>Plan with Noema</strong>
        </span>
        <button className="icon-button" aria-label="Close assistant" onClick={onClose}>
          <X />
        </button>
      </header>

      {assistantError && <p role="alert">{assistantError}</p>}

      <form
        className="ai-plan-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!planPrompt.trim()) return;
          void (async () => {
            try {
              setLoadingAssistant(true);
              const res = await fetch("/api/v1/capture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ input: `Plan request: ${planPrompt}` })
              });
              if (!res.ok) throw new Error("Could not submit plan request");
              setPlanPrompt("");
              await loadRecommendations();
            } catch (err) {
              setAssistantError((err as Error).message);
            } finally {
              setLoadingAssistant(false);
            }
          })();
        }}
      >
        <input
          type="text"
          value={planPrompt}
          onChange={(e) => setPlanPrompt(e.target.value)}
          placeholder="Ask Noema to plan something..."
          aria-label="Ask Noema to plan something"
        />
        <button type="submit" className="primary" disabled={loadingAssistant || !planPrompt.trim()}>
          {loadingAssistant ? "…" : "Plan"}
        </button>
      </form>

      <div className="ai-plan-actions">
        <button type="button" className="secondary" onClick={() => void loadRecommendations()}>
          <Sparkle size={14} /> Refresh suggestions
        </button>
      </div>

      {loadingAssistant ? (
        <p className="ai-loading">Generating grounded recommendations…</p>
      ) : recommendations.length ? (
        <ol>
          {recommendations.map((item) => (
            <li key={item.id}>
              <CheckSquare />
              <span>
                <strong>{item.proposal.title}</strong>
                <small>
                  {item.proposal.priority} · {item.sources.map((source) => source.title).join(", ") || "Workspace"} · {item.provider}
                </small>
                <button className="secondary" onClick={() => void decide(item, "rejected")}>
                  Reject
                </button>
                <button className="primary" onClick={() => void decide(item, "accepted")}>
                  Create task
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="ai-empty">
          <p>No pending recommendations for this context.</p>
          <p className="ai-empty-sub">Type a request above to generate custom grounded plans.</p>
        </div>
      )}

      <small>Suggestions are persisted drafts. Nothing changes without confirmation.</small>
    </aside>
  );
}
