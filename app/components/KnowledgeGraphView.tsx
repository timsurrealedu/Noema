"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ArrowClockwise,
  ArrowRight,
  ArrowsIn,
  ArrowsOut,
  CaretDown,
  CaretRight,
  Check,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  Minus,
  Pause,
  Play,
  Plus,
  ShareNetwork,
  SlidersHorizontal,
  Sparkle,
  Warning,
  X,
} from "@phosphor-icons/react";

type Node = { id: string; type: string; objectId: string; label: string; href: string };
type Edge = { id: string; source: string; target: string; kind: string; provenance: string };
type Graph = { nodes: Node[]; edges: Edge[]; meta: { privacy: string } };

interface SimNode extends Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  degree: number;
  pinned: boolean;
}

interface SimEdge {
  id: string;
  source: string;
  target: string;
  kind: string;
  provenance: string;
  sourceNode?: SimNode;
  targetNode?: SimNode;
}

const defaultTypeColors: Record<string, string> = {
  project: "#a9b665",
  task: "#7daea3",
  event: "#d8a657",
  note: "#d3869b",
  capture: "#ea6962",
  asset: "#928374",
  automation: "#89b482",
  course: "#ea6962",
  assignment: "#d8a657",
};

const request = async (url: string) => {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Graph is unavailable");
  return data;
};

export function KnowledgeGraphView({ onOpenNote }: { onOpenNote?: (noteId: string) => void }) {
  const [graph, setGraph] = useState<Graph>({ nodes: [], edges: [], meta: { privacy: "" } });
  const [selected, setSelected] = useState<Node | null>(null);
  const [root, setRoot] = useState("");
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [hideOrphans, setHideOrphans] = useState(false);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [path, setPath] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Obsidian-like Physics & Display Config
  const [hudOpen, setHudOpen] = useState(false);
  const [hudTab, setHudTab] = useState<"filters" | "forces" | "display">("forces");
  const [physicsRunning, setPhysicsRunning] = useState(true);
  const [centerForce, setCenterForce] = useState(0.4);
  const [repulsionForce, setRepulsionForce] = useState(320);
  const [linkDistance, setLinkDistance] = useState(110);
  const [linkStrength, setLinkStrength] = useState(0.5);
  const [damping, setDamping] = useState(0.86);
  const [nodeScale, setNodeScale] = useState(1.0);
  const [linkScale, setLinkScale] = useState(1.0);
  const [showLabels, setShowLabels] = useState<"always" | "hover" | "off">("always");
  const [showArrows, setShowArrows] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Hover state for tooltip & neighbor highlight
  const [hoveredNode, setHoveredNode] = useState<{ node: SimNode; x: number; y: number } | null>(null);

  // Canvas & Simulation Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);
  const alphaRef = useRef<number>(1.0);
  const animIdRef = useRef<number | null>(null);
  const isInteractingRef = useRef<boolean>(false);

  // Camera Viewport
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1.0 });

  // Dragging / Panning State
  const dragStateRef = useRef<{
    active: boolean;
    node: SimNode | null;
    startX: number;
    startY: number;
    hasMoved: boolean;
    startTime: number;
  }>({
    active: false,
    node: null,
    startX: 0,
    startY: 0,
    hasMoved: false,
    startTime: 0,
  });

  const panStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initialCamX: number;
    initialCamY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    initialCamX: 0,
    initialCamY: 0,
  });

  // Fetch Graph Data
  const load = async (nextRoot = root) => {
    setLoading(true);
    setError("");
    try {
      const data = await request(
        `/api/v1/knowledge-graph?limit=120&depth=2${nextRoot ? `&root=${encodeURIComponent(nextRoot)}` : ""}`
      );
      setGraph(data);
      setSelected((current) => data.nodes.find((node: Node) => node.id === current?.id) || null);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("");
  }, []);

  const availableTypes = useMemo(
    () => [...new Set(graph.nodes.map((node) => node.type))].sort(),
    [graph.nodes]
  );

  // Calculate Node Degrees for Mass & Filtering
  const nodeDegrees = useMemo(() => {
    const deg: Record<string, number> = {};
    for (const edge of graph.edges) {
      deg[edge.source] = (deg[edge.source] || 0) + 1;
      deg[edge.target] = (deg[edge.target] || 0) + 1;
    }
    return deg;
  }, [graph.edges]);

  // Filter visible nodes & edges
  const visibleNodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return graph.nodes.filter((node) => {
      if (types.length && !types.includes(node.type)) return false;
      if (hideOrphans && (nodeDegrees[node.id] || 0) === 0) return false;
      if (q && !node.label.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [graph.nodes, types, hideOrphans, query, nodeDegrees]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    return graph.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  }, [graph.edges, visibleIds]);

  // Adjacency set for fast neighbor lookup
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of visibleEdges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    }
    return map;
  }, [visibleEdges]);

  // Re-heat simulation function
  const reheat = useCallback((amount = 0.6) => {
    alphaRef.current = Math.max(alphaRef.current, amount);
  }, []);

  // Initialize or update simulation nodes & edges
  useEffect(() => {
    const existingMap = new Map(nodesRef.current.map((n) => [n.id, n]));
    const total = visibleNodes.length;

    const newNodes: SimNode[] = visibleNodes.map((n, i) => {
      const existing = existingMap.get(n.id);
      const degree = nodeDegrees[n.id] || 0;
      const baseRadius = Math.max(7, Math.min(22, 7 + Math.sqrt(degree) * 3.5));

      if (existing) {
        return {
          ...existing,
          ...n,
          radius: baseRadius,
          mass: 1 + Math.sqrt(degree) * 1.5,
          degree,
        };
      }

      // Initial organic circle layout
      const angle = (i / Math.max(total, 1)) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = 90 + Math.sqrt(i) * 32 + (Math.random() - 0.5) * 40;
      return {
        ...n,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: baseRadius,
        mass: 1 + Math.sqrt(degree) * 1.5,
        degree,
        pinned: false,
      };
    });

    const nodeIndexMap = new Map(newNodes.map((n) => [n.id, n]));

    const newEdges: SimEdge[] = visibleEdges
      .map((e) => ({
        ...e,
        sourceNode: nodeIndexMap.get(e.source),
        targetNode: nodeIndexMap.get(e.target),
      }))
      .filter((e) => e.sourceNode && e.targetNode);

    nodesRef.current = newNodes;
    edgesRef.current = newEdges;

    reheat(0.8);
  }, [visibleNodes, visibleEdges, nodeDegrees, reheat]);

  // Read Theme Colors
  const getThemePalette = useCallback(() => {
    if (typeof window === "undefined") return defaultTypeColors;
    const style = getComputedStyle(document.documentElement);
    const getVar = (name: string, fallback: string) => {
      const val = style.getPropertyValue(name).trim();
      return val || fallback;
    };
    return {
      project: getVar("--primary", defaultTypeColors.project),
      task: getVar("--source-file", defaultTypeColors.task),
      event: getVar("--warning", defaultTypeColors.event),
      note: getVar("--source-voice", defaultTypeColors.note),
      capture: getVar("--error", defaultTypeColors.capture),
      asset: getVar("--faint", defaultTypeColors.asset),
      automation: getVar("--success", defaultTypeColors.automation),
      course: getVar("--error", defaultTypeColors.course),
      assignment: getVar("--warning", defaultTypeColors.assignment),
      bg: getVar("--sidebar", "#1d2021"),
      surface: getVar("--surface", "#282828"),
      ink: getVar("--ink", "#ebdbb2"),
      muted: getVar("--muted", "#928374"),
      border: getVar("--border", "#3c3836"),
      primary: getVar("--primary", "#a9b665"),
      primarySoft: getVar("--primary-soft", "rgba(169, 182, 101, 0.15)"),
    };
  }, []);

  // Screen <-> World coordinate transforms
  const screenToWorld = useCallback((sx: number, sy: number, width: number, height: number) => {
    const cam = cameraRef.current;
    const wx = (sx - width / 2) / cam.zoom + cam.x;
    const wy = (sy - height / 2) / cam.zoom + cam.y;
    return { x: wx, y: wy };
  }, []);

  const worldToScreen = useCallback((wx: number, wy: number, width: number, height: number) => {
    const cam = cameraRef.current;
    const sx = (wx - cam.x) * cam.zoom + width / 2;
    const sy = (wy - cam.y) * cam.zoom + height / 2;
    return { x: sx, y: sy };
  }, []);

  // Hit test node in world space
  const getNodeAt = useCallback(
    (wx: number, wy: number) => {
      const nodes = nodesRef.current;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const r = n.radius * nodeScale + 6 / cameraRef.current.zoom;
        const dx = n.x - wx;
        const dy = n.y - wy;
        if (dx * dx + dy * dy <= r * r) {
          return n;
        }
      }
      return null;
    },
    [nodeScale]
  );

  // Physics Simulation Step
  const stepPhysics = useCallback(() => {
    if (!physicsRunning) return;
    const alpha = alphaRef.current;
    if (alpha < 0.001) return; // Equilibrium resting state

    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const nLen = nodes.length;

    // 1. Center Gravity Force
    for (let i = 0; i < nLen; i++) {
      const n = nodes[i];
      if (n.pinned) continue;
      const dist = Math.sqrt(n.x * n.x + n.y * n.y) || 1;
      const pull = centerForce * 0.004;
      n.vx -= (n.x / dist) * Math.min(dist * pull, 12);
      n.vy -= (n.y / dist) * Math.min(dist * pull, 12);
    }

    // 2. Many-Body Coulomb Repulsion Force + Collision buffer
    const repBase = repulsionForce * 240;
    for (let i = 0; i < nLen; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nLen; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy + 1;
        const dist = Math.sqrt(distSq);
        const minR = (a.radius + b.radius) * nodeScale + 12;

        let force = repBase / (distSq + 200);
        if (dist < minR) {
          // Hard spring-collision prevention
          force += (minR - dist) * 0.6;
        }

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!a.pinned) {
          a.vx -= fx / a.mass;
          a.vy -= fy / a.mass;
        }
        if (!b.pinned) {
          b.vx += fx / b.mass;
          b.vy += fy / b.mass;
        }
      }
    }

    // 3. Link Spring Force (Hooke's Law)
    const targetDist = linkDistance;
    const springK = linkStrength * 0.04;
    for (let k = 0; k < edges.length; k++) {
      const e = edges[k];
      const u = e.sourceNode;
      const v = e.targetNode;
      if (!u || !v) continue;

      const dx = v.x - u.x;
      const dy = v.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const delta = dist - targetDist;
      const force = delta * springK;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (!u.pinned) {
        u.vx += fx / u.mass;
        u.vy += fy / u.mass;
      }
      if (!v.pinned) {
        v.vx -= fx / v.mass;
        v.vy -= fy / v.mass;
      }
    }

    // 4. Integrate Velocities and Damp
    const maxSpeed = 30;
    for (let i = 0; i < nLen; i++) {
      const n = nodes[i];
      if (n.pinned) continue;

      n.vx *= damping;
      n.vy *= damping;

      const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (speed > maxSpeed) {
        n.vx = (n.vx / speed) * maxSpeed;
        n.vy = (n.vy / speed) * maxSpeed;
      }

      n.x += n.vx * alpha;
      n.y += n.vy * alpha;
    }

    // 5. Dynamic Alpha Cooling (Decay smoothly)
    alphaRef.current = Math.max(0.0005, alpha * 0.994);
  }, [
    physicsRunning,
    centerForce,
    repulsionForce,
    linkDistance,
    linkStrength,
    damping,
    nodeScale,
  ]);

  // Main Render Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    const cam = cameraRef.current;
    const palette = getThemePalette();

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // High-DPI Scale
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    // Apply Camera Transform
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    // 1. Draw Subtle Dot Grid
    if (showGrid) {
      const gridSize = 40;
      const minX = cam.x - width / 2 / cam.zoom - gridSize;
      const maxX = cam.x + width / 2 / cam.zoom + gridSize;
      const minY = cam.y - height / 2 / cam.zoom - gridSize;
      const maxY = cam.y + height / 2 / cam.zoom + gridSize;

      const startX = Math.floor(minX / gridSize) * gridSize;
      const startY = Math.floor(minY / gridSize) * gridSize;

      ctx.fillStyle = "rgba(146, 131, 116, 0.15)";
      for (let x = startX; x <= maxX; x += gridSize) {
        for (let y = startY; y <= maxY; y += gridSize) {
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
      }
    }

    const activeNodeId = hoveredNode?.node?.id || selected?.id || null;
    const activeNeighbors = activeNodeId ? adjacencyMap.get(activeNodeId) : null;
    const pathNodeIds = path ? new Set(path.nodes.map((n) => n.id)) : null;
    const pathEdgeIds = path ? new Set(path.edges.map((e) => e.id)) : null;

    const edges = edgesRef.current;
    const nodes = nodesRef.current;

    // 2. Draw Edges / Connections
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const u = e.sourceNode;
      const v = e.targetNode;
      if (!u || !v) continue;

      const isPathEdge = pathEdgeIds?.has(e.id);
      const isConnectedToActive =
        activeNodeId && (e.source === activeNodeId || e.target === activeNodeId);

      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      ctx.lineTo(v.x, v.y);

      if (isPathEdge) {
        ctx.strokeStyle = palette.primary;
        ctx.lineWidth = 3.5 * linkScale;
        ctx.globalAlpha = 0.95;
      } else if (isConnectedToActive) {
        ctx.strokeStyle = palette.primary;
        ctx.lineWidth = 2.4 * linkScale;
        ctx.globalAlpha = 0.9;
      } else if (activeNodeId) {
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 1.0 * linkScale;
        ctx.globalAlpha = 0.12;
      } else {
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 1.2 * linkScale;
        ctx.globalAlpha = 0.55;
      }

      ctx.stroke();

      // Draw Directional Arrows (if enabled)
      if (showArrows && (isPathEdge || isConnectedToActive || !activeNodeId)) {
        const dx = v.x - u.x;
        const dy = v.y - u.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 20) {
          const arrowOffset = v.radius * nodeScale + 4;
          const ax = v.x - (dx / dist) * arrowOffset;
          const ay = v.y - (dy / dist) * arrowOffset;
          const angle = Math.atan2(dy, dx);
          const arrowLen = 6 * linkScale;

          ctx.fillStyle = ctx.strokeStyle;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(
            ax - arrowLen * Math.cos(angle - Math.PI / 6),
            ay - arrowLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            ax - arrowLen * Math.cos(angle + Math.PI / 6),
            ay - arrowLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // 3. Draw Nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const isSelected = selected?.id === n.id;
      const isHovered = hoveredNode?.node?.id === n.id;
      const isPath = pathNodeIds?.has(n.id);
      const isNeighbor = activeNeighbors?.has(n.id);
      const isActive = isSelected || isHovered || isPath;

      const nodeColor = (defaultTypeColors[n.type] || (palette as any)[n.type] || palette.primary) as string;
      const r = n.radius * nodeScale;

      // Determine Opacity
      let alpha = 1.0;
      if (activeNodeId) {
        if (isActive || isNeighbor) {
          alpha = 1.0;
        } else {
          alpha = 0.18;
        }
      }

      ctx.globalAlpha = alpha;

      // Outer Halo / Glow for active or selected nodes
      if (isActive) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = `${nodeColor}33`; // 20% opacity
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 2, 0, Math.PI * 2);
        ctx.strokeStyle = palette.ink;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Main Node Circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      // Node Border
      ctx.lineWidth = isSelected ? 2.5 : 1;
      ctx.strokeStyle = isSelected ? palette.ink : "rgba(0, 0, 0, 0.35)";
      ctx.stroke();

      // Node Labels
      const shouldDrawLabel =
        showLabels === "always" ||
        (showLabels === "hover" && (isActive || isNeighbor)) ||
        cam.zoom > 1.4 ||
        n.degree >= 3;

      if (shouldDrawLabel && showLabels !== "off" && alpha > 0.3) {
        const text = n.label.length > 24 ? `${n.label.slice(0, 22)}…` : n.label;
        const fontSize = Math.max(9, Math.min(13, 10 + Math.sqrt(n.degree)));
        ctx.font = `${isActive ? "600" : "500"} ${fontSize}px var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const textY = n.y + r + fontSize + 2;
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;

        // Label Pill Background
        ctx.fillStyle = "rgba(29, 32, 33, 0.75)";
        ctx.beginPath();
        ctx.roundRect(
          n.x - textWidth / 2 - 4,
          textY - fontSize / 2 - 2,
          textWidth + 8,
          fontSize + 4,
          4
        );
        ctx.fill();

        // Label Text
        ctx.fillStyle = isActive ? palette.ink : palette.muted;
        ctx.fillText(text, n.x, textY);
      }
    }

    ctx.restore();
    ctx.restore();
  }, [
    showGrid,
    hoveredNode,
    selected,
    path,
    adjacencyMap,
    getThemePalette,
    showArrows,
    nodeScale,
    linkScale,
    showLabels,
  ]);

  // Animation Loop Effect
  useEffect(() => {
    let active = true;

    const renderLoop = () => {
      if (!active) return;
      stepPhysics();
      draw();
      animIdRef.current = requestAnimationFrame(renderLoop);
    };

    animIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      active = false;
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [stepPhysics, draw]);

  // Responsive Canvas Resize Observer
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      reheat(0.4);
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    return () => ro.disconnect();
  }, [reheat]);

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, rect.width, rect.height);

    const hit = getNodeAt(world.x, world.y);

    if (hit) {
      // Start Dragging Node
      dragStateRef.current = {
        active: true,
        node: hit,
        startX: sx,
        startY: sy,
        hasMoved: false,
        startTime: Date.now(),
      };
      hit.pinned = true;
      hit.x = world.x;
      hit.y = world.y;
      hit.vx = 0;
      hit.vy = 0;
      reheat(0.8);
    } else {
      // Start Panning Viewport
      panStateRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        initialCamX: cameraRef.current.x,
        initialCamY: cameraRef.current.y,
      };
    }

    isInteractingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (dragStateRef.current.active && dragStateRef.current.node) {
      // Drag Node with spring reaction
      const dx = sx - dragStateRef.current.startX;
      const dy = sy - dragStateRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragStateRef.current.hasMoved = true;
      }
      const world = screenToWorld(sx, sy, rect.width, rect.height);
      const node = dragStateRef.current.node;
      node.x = world.x;
      node.y = world.y;
      node.vx = 0;
      node.vy = 0;
      reheat(0.4);
    } else if (panStateRef.current.active) {
      // Pan Canvas
      const dx = e.clientX - panStateRef.current.startX;
      const dy = e.clientY - panStateRef.current.startY;
      const cam = cameraRef.current;
      cameraRef.current = {
        ...cam,
        x: panStateRef.current.initialCamX - dx / cam.zoom,
        y: panStateRef.current.initialCamY - dy / cam.zoom,
      };
    } else {
      // Hover detection
      const world = screenToWorld(sx, sy, rect.width, rect.height);
      const hit = getNodeAt(world.x, world.y);
      if (hit) {
        setHoveredNode({ node: hit, x: sx, y: sy });
      } else {
        setHoveredNode(null);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && (e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }

    if (dragStateRef.current.active && dragStateRef.current.node) {
      const node = dragStateRef.current.node;
      const elapsed = Date.now() - dragStateRef.current.startTime;

      // Click detected (quick tap with minimal move)
      if (!dragStateRef.current.hasMoved && elapsed < 350) {
        choose(node);
      }

      // Unpin node to settle naturally into simulation
      node.pinned = false;
      dragStateRef.current.active = false;
      dragStateRef.current.node = null;
      reheat(0.3);
    }

    panStateRef.current.active = false;
    isInteractingRef.current = false;
  };

  // Zoom on Wheel Event centered around cursor
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const cam = cameraRef.current;
    const nextZoom = Math.max(0.18, Math.min(4.5, cam.zoom * zoomFactor));

    // Anchor point in world coordinates
    const worldBefore = screenToWorld(sx, sy, rect.width, rect.height);
    cameraRef.current.zoom = nextZoom;
    const worldAfter = screenToWorld(sx, sy, rect.width, rect.height);

    // Offset camera so cursor world position stays invariant
    cameraRef.current.x += worldBefore.x - worldAfter.x;
    cameraRef.current.y += worldBefore.y - worldAfter.y;

    reheat(0.05);
  };

  // Double click to open note/source directly
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, rect.width, rect.height);
    const hit = getNodeAt(world.x, world.y);
    if (hit) {
      openSource(hit);
    } else {
      fitToView();
    }
  };

  // Navigation & Zoom Controls
  const zoomIn = () => {
    cameraRef.current.zoom = Math.min(4.5, cameraRef.current.zoom * 1.25);
    reheat(0.05);
  };

  const zoomOut = () => {
    cameraRef.current.zoom = Math.max(0.18, cameraRef.current.zoom / 1.25);
    reheat(0.05);
  };

  const fitToView = () => {
    const canvas = canvasRef.current;
    const nodes = nodesRef.current;
    if (!canvas || !nodes.length) return;

    const rect = canvas.getBoundingClientRect();
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.radius);
      maxX = Math.max(maxX, n.x + n.radius);
      minY = Math.min(minY, n.y - n.radius);
      maxY = Math.max(maxY, n.y + n.radius);
    }

    const boundsW = Math.max(maxX - minX + 80, 100);
    const boundsH = Math.max(maxY - minY + 80, 100);

    const fitZoom = Math.max(0.2, Math.min(1.8, Math.min(rect.width / boundsW, rect.height / boundsH) * 0.9));

    cameraRef.current = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      zoom: fitZoom,
    };
    reheat(0.1);
  };

  const resetCamera = () => {
    cameraRef.current = { x: 0, y: 0, zoom: 1.0 };
    reheat(0.1);
  };

  const resetGraphLayout = () => {
    const nodes = nodesRef.current;
    const total = nodes.length;
    nodes.forEach((n, i) => {
      const angle = (i / Math.max(total, 1)) * Math.PI * 2;
      const dist = 90 + Math.sqrt(i) * 35;
      n.x = Math.cos(angle) * dist;
      n.y = Math.sin(angle) * dist;
      n.vx = (Math.random() - 0.5) * 4;
      n.vy = (Math.random() - 0.5) * 4;
      n.pinned = false;
    });
    cameraRef.current = { x: 0, y: 0, zoom: 1.0 };
    reheat(1.0);
  };

  const choose = (node: Node) => {
    setSelected(node);
    setSource((current) => current || node.id);
  };

  const focus = async (node: Node) => {
    setRoot(node.id);
    setPath(null);
    await load(node.id);
  };

  const reset = async () => {
    setRoot("");
    setSelected(null);
    setPath(null);
    await load("");
  };

  const trace = async () => {
    if (!source || !target) return;
    setError("");
    try {
      const res = await request(
        `/api/v1/knowledge-graph/path?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`
      );
      setPath(res);
      reheat(0.6);
    } catch (reason) {
      setPath(null);
      setError((reason as Error).message);
    }
  };

  function openSource(node: Node) {
    if (node.type === "note" && onOpenNote) {
      onOpenNote(node.objectId);
    } else {
      location.assign(node.href);
    }
  }

  // Find neighbors of selected node for inspector list
  const selectedNeighbors = useMemo(() => {
    if (!selected) return [];
    const neighborIds = adjacencyMap.get(selected.id) || new Set();
    return graph.nodes.filter((n) => neighborIds.has(n.id));
  }, [selected, adjacencyMap, graph.nodes]);

  return (
    <div className="vault-graph-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="module-header" style={{ margin: 0 }}>
        <div>
          <h2>Knowledge Graph</h2>
          <p>Interactive force-directed graph of notes, tasks, events, and assets.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="secondary" disabled={loading} onClick={() => void reset()}>
            <ArrowClockwise /> Reset graph
          </button>
        </div>
      </div>

      {error && (
        <div className="warning-text" role="alert">
          <Warning /> {error}
        </div>
      )}

      {/* Top Filter & Quick Toggle Bar */}
      <section className="graph-toolbar">
        <label>
          <MagnifyingGlass />
          <span className="sr-only">Filter nodes</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              reheat(0.5);
            }}
            placeholder="Search notes, tags, objects…"
          />
        </label>
        <div role="group" aria-label="Filter object types">
          {availableTypes.map((type) => (
            <button
              key={type}
              className={types.includes(type) ? "active" : ""}
              aria-pressed={types.includes(type)}
              onClick={() => {
                setTypes((current) =>
                  current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
                );
                reheat(0.6);
              }}
            >
              <i style={{ background: defaultTypeColors[type] || "var(--primary)" }} />
              {type}
            </button>
          ))}
          <button
            className={hideOrphans ? "active" : ""}
            onClick={() => {
              setHideOrphans((v) => !v);
              reheat(0.6);
            }}
            title="Hide nodes with 0 connections"
          >
            {hideOrphans ? <EyeSlash /> : <Eye />}
            <span>Hide orphans</span>
          </button>
        </div>
        <span>
          {visibleNodes.length} nodes · {visibleEdges.length} connections
        </span>
      </section>

      {/* Main Interactive Graph Layout */}
      <div className="graph-layout">
        <section
          className="graph-canvas"
          aria-label="Interactive knowledge graph"
          style={{ position: "relative", minHeight: "590px", display: "flex", flexDirection: "column" }}
        >
          {loading ? (
            <p role="status">Synchronizing graph…</p>
          ) : visibleNodes.length ? (
            <div
              ref={containerRef}
              className={`graph-canvas-viewport ${isInteractingRef.current ? "is-dragging" : ""}`}
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                flex: 1,
                minHeight: "580px",
                overflow: "hidden",
                touchAction: "none",
                cursor: hoveredNode ? "grab" : "default",
              }}
            >
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={`Interactive knowledge graph with ${visibleNodes.length} nodes and ${visibleEdges.length} connections. Drag nodes to simulate physics, use scroll to zoom, drag empty space to pan.`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onWheel={handleWheel}
                onDoubleClick={handleDoubleClick}
                style={{ display: "block", width: "100%", height: "100%" }}
              />

              {/* Obsidian-like Floating HUD Control Drawer (Top Left) */}
              <div className="graph-hud-overlay">
                <button
                  type="button"
                  className={`secondary icon-button ${hudOpen ? "active" : ""}`}
                  aria-label="Graph settings & physics controls"
                  title="Graph settings & physics controls"
                  onClick={() => setHudOpen((v) => !v)}
                  style={{ width: "36px", height: "36px", borderRadius: "var(--r-sm)" }}
                >
                  <SlidersHorizontal />
                </button>

                {hudOpen && (
                  <div className="graph-hud-panel" role="region" aria-label="Graph display and physics controls">
                    <div className="graph-hud-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Sparkle /> Graph Settings
                      </strong>
                      <button className="icon-button" style={{ width: "24px", height: "24px" }} onClick={() => setHudOpen(false)} aria-label="Close settings">
                        <X />
                      </button>
                    </div>

                    <div className="graph-hud-tabs" role="tablist">
                      <button
                        role="tab"
                        aria-selected={hudTab === "forces"}
                        className={hudTab === "forces" ? "active" : ""}
                        onClick={() => setHudTab("forces")}
                      >
                        Forces
                      </button>
                      <button
                        role="tab"
                        aria-selected={hudTab === "display"}
                        className={hudTab === "display" ? "active" : ""}
                        onClick={() => setHudTab("display")}
                      >
                        Display
                      </button>
                      <button
                        role="tab"
                        aria-selected={hudTab === "filters"}
                        className={hudTab === "filters" ? "active" : ""}
                        onClick={() => setHudTab("filters")}
                      >
                        Filters
                      </button>
                    </div>

                    {hudTab === "forces" && (
                      <div className="graph-hud-tab-content">
                        <div className="graph-slider-row">
                          <label>
                            <span>Center force</span>
                            <small>{centerForce.toFixed(2)}</small>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={centerForce}
                            onChange={(e) => {
                              setCenterForce(parseFloat(e.target.value));
                              reheat(0.5);
                            }}
                          />
                        </div>

                        <div className="graph-slider-row">
                          <label>
                            <span>Repulsion force</span>
                            <small>{repulsionForce}</small>
                          </label>
                          <input
                            type="range"
                            min="50"
                            max="800"
                            step="10"
                            value={repulsionForce}
                            onChange={(e) => {
                              setRepulsionForce(parseInt(e.target.value, 10));
                              reheat(0.7);
                            }}
                          />
                        </div>

                        <div className="graph-slider-row">
                          <label>
                            <span>Link distance</span>
                            <small>{linkDistance}px</small>
                          </label>
                          <input
                            type="range"
                            min="40"
                            max="260"
                            step="5"
                            value={linkDistance}
                            onChange={(e) => {
                              setLinkDistance(parseInt(e.target.value, 10));
                              reheat(0.6);
                            }}
                          />
                        </div>

                        <div className="graph-slider-row">
                          <label>
                            <span>Link strength</span>
                            <small>{linkStrength.toFixed(2)}</small>
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={linkStrength}
                            onChange={(e) => {
                              setLinkStrength(parseFloat(e.target.value));
                              reheat(0.5);
                            }}
                          />
                        </div>

                        <div className="graph-slider-row">
                          <label>
                            <span>Friction / Damping</span>
                            <small>{damping.toFixed(2)}</small>
                          </label>
                          <input
                            type="range"
                            min="0.70"
                            max="0.96"
                            step="0.02"
                            value={damping}
                            onChange={(e) => {
                              setDamping(parseFloat(e.target.value));
                              reheat(0.3);
                            }}
                          />
                        </div>

                        <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
                          <button
                            type="button"
                            className="secondary"
                            style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
                            onClick={() => resetGraphLayout()}
                          >
                            <ArrowClockwise /> Scramble layout
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
                            onClick={() => {
                              setCenterForce(0.4);
                              setRepulsionForce(320);
                              setLinkDistance(110);
                              setLinkStrength(0.5);
                              setDamping(0.86);
                              reheat(0.8);
                            }}
                          >
                            Reset physics
                          </button>
                        </div>
                      </div>
                    )}

                    {hudTab === "display" && (
                      <div className="graph-hud-tab-content">
                        <div className="graph-slider-row">
                          <label>
                            <span>Node size</span>
                            <small>{nodeScale.toFixed(1)}x</small>
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="2.2"
                            step="0.1"
                            value={nodeScale}
                            onChange={(e) => setNodeScale(parseFloat(e.target.value))}
                          />
                        </div>

                        <div className="graph-slider-row">
                          <label>
                            <span>Line thickness</span>
                            <small>{linkScale.toFixed(1)}x</small>
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="2.5"
                            step="0.1"
                            value={linkScale}
                            onChange={(e) => setLinkScale(parseFloat(e.target.value))}
                          />
                        </div>

                        <div className="graph-slider-row">
                          <label>
                            <span>Labels</span>
                          </label>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {(["always", "hover", "off"] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                className={showLabels === m ? "active" : "secondary"}
                                style={{ flex: 1, padding: "4px", fontSize: "0.72rem", textTransform: "capitalize" }}
                                onClick={() => setShowLabels(m)}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={showArrows}
                              onChange={(e) => setShowArrows(e.target.checked)}
                            />
                            <span>Directional link arrows</span>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={showGrid}
                              onChange={(e) => setShowGrid(e.target.checked)}
                            />
                            <span>Background dot grid</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {hudTab === "filters" && (
                      <div className="graph-hud-tab-content">
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Toggle Types:</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {availableTypes.map((t) => (
                              <button
                                key={t}
                                type="button"
                                className={types.includes(t) ? "active" : "secondary"}
                                style={{ padding: "4px 8px", fontSize: "0.72rem", borderRadius: "999px" }}
                                onClick={() => {
                                  setTypes((cur) =>
                                    cur.includes(t) ? cur.filter((item) => item !== t) : [...cur, t]
                                  );
                                  reheat(0.6);
                                }}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Floating Bottom Navigation Controls */}
              <div className="graph-floating-nav">
                <button
                  type="button"
                  aria-label={physicsRunning ? "Pause physics" : "Play physics"}
                  title={physicsRunning ? "Pause physics simulation" : "Resume physics simulation"}
                  onClick={() => {
                    setPhysicsRunning((v) => !v);
                    if (!physicsRunning) reheat(0.6);
                  }}
                >
                  {physicsRunning ? <Pause /> : <Play />}
                </button>
                <span style={{ width: "1px", height: "16px", background: "var(--border)" }} />
                <button type="button" aria-label="Zoom in" title="Zoom in" onClick={zoomIn}>
                  <Plus />
                </button>
                <button type="button" aria-label="Zoom out" title="Zoom out" onClick={zoomOut}>
                  <Minus />
                </button>
                <button type="button" aria-label="Fit graph to view" title="Fit all nodes to view" onClick={fitToView}>
                  <ArrowsIn />
                </button>
                <button type="button" aria-label="Reset camera" title="Reset camera to center" onClick={resetCamera}>
                  <ArrowClockwise />
                </button>
              </div>

              {/* Hover Tooltip Card */}
              {hoveredNode && (
                <div
                  className="graph-node-tooltip"
                  style={{
                    left: `${hoveredNode.x}px`,
                    top: `${hoveredNode.y}px`,
                  }}
                >
                  <i style={{ background: defaultTypeColors[hoveredNode.node.type] || "var(--primary)" }} />
                  <strong>{hoveredNode.node.label}</strong>
                  <small>
                    {hoveredNode.node.type} · {hoveredNode.node.degree} links
                  </small>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <ShareNetwork />
              <h3>No connected objects yet</h3>
              <p>Create tasks, notes, or links to populate the graph.</p>
            </div>
          )}
        </section>

        {/* Node Inspector Panel */}
        <aside className="graph-inspector">
          <h3>{selected ? selected.label : "Select a node"}</h3>
          {selected ? (
            <>
              <span>
                <i style={{ background: defaultTypeColors[selected.type] || "var(--primary)" }} />
                {selected.type} · {(adjacencyMap.get(selected.id)?.size || 0)} connections
              </span>
              <button className="secondary" onClick={() => void focus(selected)}>
                Focus neighborhood
              </button>
              <button className="primary" onClick={() => openSource(selected)}>
                Open source <ArrowRight />
              </button>

              {selectedNeighbors.length > 0 && (
                <div className="graph-inspector-neighbors">
                  <small style={{ color: "var(--muted)", fontWeight: "600" }}>Connected neighbors:</small>
                  {selectedNeighbors.slice(0, 8).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => choose(n)}
                      title={`Inspect ${n.label}`}
                    >
                      <i style={{ background: defaultTypeColors[n.type] || "var(--primary)", width: "6px", height: "6px", borderRadius: "50%" }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p>Click and drag any node to test physics, or click to inspect its connections and neighborhood.</p>
          )}
          <small>{graph.meta.privacy}</small>
        </aside>
      </div>

      {/* Path Finder Section */}
      <section className="path-finder">
        <header>
          <div>
            <h3>Trace a path</h3>
            <p>Find the shortest provenance-backed connection between two objects.</p>
          </div>
          <button className="primary" disabled={!source || !target || source === target} onClick={() => void trace()}>
            Trace path
          </button>
        </header>
        <div>
          <label>
            From
            <select value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="">Select source</option>
              {graph.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label} · {node.type}
                </option>
              ))}
            </select>
          </label>
          <ArrowRight />
          <label>
            To
            <select value={target} onChange={(event) => setTarget(event.target.value)}>
              <option value="">Select target</option>
              {graph.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label} · {node.type}
                </option>
              ))}
            </select>
          </label>
        </div>
        {path && (
          <ol aria-label="Shortest path">
            {path.nodes.map((node, index) => (
              <li key={node.id}>
                <button
                  style={{
                    background: "none",
                    border: 0,
                    padding: 0,
                    color: "var(--primary)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                  onClick={() => openSource(node)}
                >
                  {node.label}
                </button>
                <small>
                  {node.type}
                  {index < path.edges.length ? ` · ${path.edges[index].kind} via ${path.edges[index].provenance}` : ""}
                </small>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Accessible Relationship Table */}
      <section className="graph-table">
        <div className="list-title">
          <h3>Accessible relationship table</h3>
          <span>Equivalent to the visual graph</span>
        </div>
        <div role="region" aria-label="Knowledge graph relationships" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Relationship</th>
                <th>Target</th>
                <th>Provenance</th>
              </tr>
            </thead>
            <tbody>
              {visibleEdges.map((edge) => {
                const sourceNode = graph.nodes.find((node) => node.id === edge.source);
                const targetNode = graph.nodes.find((node) => node.id === edge.target);
                return (
                  <tr key={edge.id}>
                    <td>
                      <button onClick={() => sourceNode && choose(sourceNode)}>{sourceNode?.label}</button>
                    </td>
                    <td>{edge.kind}</td>
                    <td>
                      <button onClick={() => targetNode && choose(targetNode)}>{targetNode?.label}</button>
                    </td>
                    <td>
                      <code>{edge.provenance}</code>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

