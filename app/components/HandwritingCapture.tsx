"use client";

import {FormEvent, useEffect, useState} from "react";
import {ArrowLeft, CheckCircle, Folder, Lightning, NotePencil, X} from "@phosphor-icons/react";
import {createId} from "../lib/id";
import {InkStroke, normalizeInk} from "../lib/ink";
import {deleteInkDraft} from "../lib/offlineQueue";
import {InkEditor} from "./InkEditor";
import {ModalDialog} from "./ModalDialog";

type Source = {id: string; name: string};

export function HandwritingCapture({onClose}: {onClose: () => void}) {
  const [step, setStep] = useState<"option" | "folder" | "canvas">("option");
  const [mode, setMode] = useState<"quick" | "folder">("quick");
  const [draft, setDraft] = useState(true);
  const [title, setTitle] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState("");
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [inkId, setInkId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{path: string; state: string} | null>(null);

  useEffect(() => {
    const key = "noema-handwriting-capture-id";
    const id = localStorage.getItem(key) || createId();
    localStorage.setItem(key, id);
    setInkId(id);
  }, []);

  useEffect(() => {
    let live = true;
    Promise.all([
      fetch("/api/v1/settings").then(r => r.json()),
      fetch("/api/v1/vault-sources").then(r => r.json())
    ])
      .then(([settings, vaults]) => {
        if (!live) return;
        const available = vaults.sources || [];
        const configured = settings.preferences?.captureVaultSourceId;
        const selected = available.some((item: Source) => item.id === configured)
          ? configured
          : available[0]?.id || "";
        setSources(available);
        setSourceId(selected);
      })
      .catch(() => setError("Could not load capture vault"))
      .finally(() => setLoading(false));

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!sourceId) {
      setFolders([]);
      setFolder("");
      return;
    }
    fetch(`/api/v1/vault-sources/${sourceId}/tree`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error?.message);
        setFolders(data.folders || []);
        setFolder(current => ((data.folders || []).includes(current) ? current : data.folders?.[0] || ""));
      })
      .catch(() => setError("Could not load vault folders"));
  }, [sourceId]);

  async function handleSave() {
    if (!strokes.length || (mode === "folder" && (!title.trim() || !folder))) return;
    setSaving(true);
    setError("");
    try {
      const ink = normalizeInk(strokes);
      const response = await fetch("/api/v1/handwriting-notes", {
        method: "POST",
        headers: {"Content-Type": "application/json", "Idempotency-Key": createId()},
        body: JSON.stringify({
          mode,
          vaultSourceId: sourceId,
          folder: mode === "quick" ? "" : folder,
          title: mode === "quick" ? "" : title.trim(),
          draft,
          ink
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Could not save handwriting");
      await deleteInkDraft(inkId);
      localStorage.removeItem("noema-handwriting-capture-id");
      setResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save handwriting");
    } finally {
      setSaving(false);
    }
  }

  // Step 1: Pop-up Option Modal
  if (step === "option") {
    return (
      <ModalDialog className="handwriting-option-modal" ariaLabel="New Canvas Note" onClose={onClose}>
        <div className="handwriting-option-head">
          <NotePencil className="option-title-icon" />
          <h2>New Canvas Note</h2>
          <p>Choose where to file your canvas note</p>
          <button className="icon-button close-btn" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="handwriting-option-list">
          <button
            type="button"
            className="handwriting-option-card"
            onClick={() => {
              setMode("quick");
              setStep("canvas");
            }}
          >
            <Lightning className="card-icon" />
            <div>
              <strong>Quick note</strong>
              <small>Start writing immediately in Drafts</small>
            </div>
          </button>

          <a
            className="handwriting-option-card"
            href="/vault?new=ink"
            onClick={onClose}
          >
            <NotePencil className="card-icon" />
            <div>
              <strong>Open Integrated Ink & Text Note</strong>
              <small>Write and type together directly over your note</small>
            </div>
          </a>

          <button
            type="button"
            className="handwriting-option-card"
            onClick={() => {
              setMode("folder");
              setStep("folder");
            }}
          >
            <Folder className="card-icon" />
            <div>
              <strong>Choose folder</strong>
              <small>Navigate vault structure to place your note</small>
            </div>
          </button>
        </div>
      </ModalDialog>
    );
  }

  // Step 2: Folder Tree Selection Modal
  if (step === "folder") {
    return (
      <ModalDialog className="handwriting-folder-modal" ariaLabel="Choose Folder Location" onClose={onClose}>
        <div className="handwriting-folder-head">
          <button type="button" className="icon-button" aria-label="Back" onClick={() => setStep("option")}>
            <ArrowLeft />
          </button>
          <h2>Choose Folder Location</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="handwriting-folder-body">
          {loading ? (
            <p role="status">Loading vault structure…</p>
          ) : !sources.length ? (
            <p role="alert">Connect a vault in Settings before writing.</p>
          ) : (
            <>
              <label>
                Vault Source
                <select value={sourceId} onChange={e => setSourceId(e.target.value)}>
                  {sources.map(s => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Note Title
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Meeting Notes or Project Sketch"
                  autoFocus
                />
              </label>
              <fieldset className="handwriting-tree-fieldset">
                <legend>Vault Folders</legend>
                <div className="handwriting-tree-list">
                  {folders.map(fPath => (
                    <button
                      type="button"
                      key={fPath}
                      className={`tree-folder-item ${folder === fPath ? "active" : ""}`}
                      onClick={() => setFolder(fPath)}
                    >
                      <Folder />
                      <span>{fPath}</span>
                    </button>
                  ))}
                  {!folders.length && <small>No subfolders found in this vault.</small>}
                </div>
              </fieldset>
              <label className="check-field">
                <input type="checkbox" checked={draft} onChange={e => setDraft(e.target.checked)} />
                <span>Save as reviewable draft</span>
              </label>
            </>
          )}
        </div>
        <div className="handwriting-folder-foot">
          <button type="button" className="secondary" onClick={() => setStep("option")}>
            Back
          </button>
          <button
            type="button"
            className="primary"
            disabled={!sourceId || !title.trim() || !folder}
            onClick={() => setStep("canvas")}
          >
            Open Canvas
          </button>
        </div>
      </ModalDialog>
    );
  }

  // Step 3: Full-Screen White Infinite Canvas
  return (
    <div className="white-infinite-canvas" role="dialog" aria-label="Infinite Canvas Writer">
      {result ? (
        <section className="handwriting-complete">
          <CheckCircle />
          <h2>Handwriting saved</h2>
          <p>{result.path}</p>
          <small>{result.state === "queued" ? "Queued for AI processing." : "Saved without AI processing."}</small>
          <button className="primary" onClick={onClose}>
            Close
          </button>
        </section>
      ) : (
        <div className="canvas-wrapper">
          <header className="canvas-header">
            <div className="canvas-dest-info">
              <button
                type="button"
                className="icon-button"
                aria-label="Change destination"
                onClick={() => setStep("option")}
                title="Change destination"
              >
                <ArrowLeft />
              </button>
              <span>
                <strong>{mode === "quick" ? "Quick Note" : title || "Untitled Note"}</strong>
                <small>{mode === "quick" ? "Drafts Vault" : `${folder || "Root"}`}</small>
              </span>
            </div>
            <div className="canvas-header-actions">
              <button type="button" className="secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={saving || !strokes.length}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Done"}
              </button>
            </div>
          </header>
          {error && <div className="auth-error canvas-error" role="alert">{error}</div>}
          <div className="white-canvas-container">
            <InkEditor id={inkId} capture onChange={setStrokes} />
          </div>
        </div>
      )}
    </div>
  );
}
