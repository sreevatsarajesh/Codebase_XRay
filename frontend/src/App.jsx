import Footer from "./footer.jsx";
import dagre from "@dagrejs/dagre";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
  MarkerType
} from "@xyflow/react";
import {
  AlertCircle,
  FileCode2,
  FolderGit2,
  Layers3,
  Network,
  RefreshCw,
  Folder,
  Maximize2,
  Minimize2,
  X
} from "lucide-react";
import "@xyflow/react/dist/style.css";
import "./App.css";

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const DEFAULT_PATH =
  "/Users/sreevatsarajesh/Documents/GitHub/cybersecuritylabs";

const FOLDER_COLORS = [
  "#38bdf8",
  "#a78bfa",
  "#34d399",
  "#fb923c",
  "#f472b6",
  "#facc15",
  "#2dd4bf",
  "#818cf8",
  "#fb7185",
  "#a3e635",
  "#e879f9",
  "#60a5fa",
  "#4ade80",
  "#f97316",
  "#c084fc",
  "#22d3ee"
];

function getFolderColor(directory) {
  let hash = 0;

  for (let i = 0; i < directory.length; i += 1) {
    hash = (hash * 31 + directory.charCodeAt(i)) | 0;
  }

  return FOLDER_COLORS[Math.abs(hash) % FOLDER_COLORS.length];
}

function FileNode({ data, selected }) {
  const accent = data.analysisHighlight ? "#facc15" : data.color || "#38bdf8";
  const dimmed = data.analysisActive && !data.analysisHighlight;

  return (
    <div
      className={`file-node ${selected ? "selected" : ""}`}
      style={{
        border: `2px solid ${accent}`,
        borderLeft: `5px solid ${accent}`,
        boxShadow: selected
          ? `0 0 0 2px ${accent}55, 3px 3px 0 ${accent}55`
          : `3px 3px 0 ${accent}35`,
        background: "var(--bg-color)",
        opacity: dimmed ? 0.28 : 1,
        transition: "opacity 160ms ease, border-color 160ms ease, box-shadow 160ms ease"
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: accent,
          border: `1px solid ${accent}`,
          borderRadius: 0,
          width: 7,
          height: 7
        }}
      />

      <div className="file-node-icon" style={{ color: accent }}>
        <FileCode2 size={16} />
      </div>

      <div className="file-node-content">
        <div className="file-node-name">{data.label}</div>
        <div className="file-node-path">{data.directory || "Root"}</div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: accent,
          border: `1px solid ${accent}`,
          borderRadius: 0,
          width: 7,
          height: 7
        }}
      />
    </div>
  );
}

function FolderGroupNode({ data }) {
  const accent = data.color || "#38bdf8";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: "12px 14px",
        border: `2px dashed ${accent}`,
        borderRadius: 5,
        background: `${accent}0D`,
        boxShadow: `4px 4px 0 ${accent}35`,
        cursor: "grab",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: accent,
          fontSize: 11,
          fontWeight: "bold",
          textTransform: "uppercase",
          letterSpacing: "1px",
          pointerEvents: "none"
        }}
      >
        <Folder size={15} />

        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          [{data.directory}]
        </span>

        <span
          style={{
            color: accent,
            marginLeft: "auto",
            flexShrink: 0,
            fontSize: 10,
            border: `1px solid ${accent}88`,
            padding: "2px 4px"
          }}
        >
          {data.count} FILES
        </span>
      </div>
    </div>
  );
}

const nodeTypes = {
  fileNode: FileNode,
  folderGroup: FolderGroupNode
};

function makeGraph(result, relationshipMode = "imports") {
  const files = (result.nodes || [])
    .filter((node) => node.type === "file")
    .sort((a, b) => a.path.localeCompare(b.path));

  const fileIds = new Set(files.map((file) => file.id));

  const graphEdges = (result.edges || []).filter((edge) => {
    if (!fileIds.has(edge.source) || !fileIds.has(edge.target)) return false;

    if (relationshipMode === "database") {
      return edge.type === "database";
    }

    return edge.type === "imports" || (
      edge.type === "database" && Boolean(edge.module)
    );
  });

  const nodeWidth = 244;
  const nodeHeight = 69;
  const layout = new dagre.graphlib.Graph();

  layout.setDefaultEdgeLabel(() => ({}));

  layout.setGraph({
    rankdir: "LR",
    nodesep: 80,
    ranksep: 140,
    edgesep: 40,
    marginx: 50,
    marginy: 50,
    ranker: "network-simplex"
  });

  files.forEach((file) => {
    layout.setNode(file.id, {
      width: nodeWidth,
      height: nodeHeight
    });
  });

  graphEdges.forEach((edge) => {
    layout.setEdge(edge.source, edge.target, {
      weight: 2,
      minlen: 1
    });
  });

  if (files.length) {
    dagre.layout(layout);
  }

  const fileNodes = files.map((file) => {
    const position = layout.node(file.id);

    const directory = file.path.includes("/")
      ? file.path.substring(0, file.path.lastIndexOf("/"))
      : "Root";

    return {
      id: file.id,
      type: "fileNode",
      position: {
        x: position.x - nodeWidth / 2,
        y: position.y - nodeHeight / 2
      },
      width: nodeWidth,
      height: nodeHeight,
      zIndex: 2,
      draggable: true,
      data: {
        label: file.label,
        path: file.path,
        directory,
        type: file.type,
        color: getFolderColor(directory)
      }
    };
  });

  const groups = new Map();

  fileNodes.forEach((node) => {
    const directory = node.data.directory;

    if (!groups.has(directory)) {
      groups.set(directory, []);
    }

    groups.get(directory).push(node);
  });

  const folderNodes = [];

  groups.forEach((groupFiles, directory) => {
    const minX = Math.min(...groupFiles.map((node) => node.position.x));
    const minY = Math.min(...groupFiles.map((node) => node.position.y));

    const maxX = Math.max(
      ...groupFiles.map((node) => node.position.x + nodeWidth)
    );

    const maxY = Math.max(
      ...groupFiles.map((node) => node.position.y + nodeHeight)
    );

    const width = maxX - minX + 56;
    const height = maxY - minY + 80;
    const color = getFolderColor(directory);

    folderNodes.push({
      id: `folder-${directory}`,
      type: "folderGroup",
      position: {
        x: minX - 28,
        y: minY - 54
      },
      width,
      height,
      style: {
        width,
        height
      },
      zIndex: -1,
      draggable: true,
      selectable: false,
      connectable: false,
      data: {
        directory,
        count: groupFiles.length,
        color
      }
    });
  });

  const edges = graphEdges.map((edge, index) => {
    const isDatabase = relationshipMode === "database";
    const edgeColor = isDatabase ? "#22d3ee" : "#f59e0b";

    return {
      id: `edge-${index}-${edge.source}-${edge.target}-${edge.type}`,
      source: edge.source,
      target: edge.target,
      label: isDatabase ? "DATABASE ACCESS" : "IMPORTS",
      type: "smoothstep",
      animated: true,
      zIndex: 1,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: edgeColor
      },
      style: {
        stroke: edgeColor,
        strokeWidth: 2
      },
      labelStyle: {
        fill: "var(--text-main)",
        fontSize: 9,
        fontFamily: "inherit",
        fontWeight: "bold"
      },
      labelBgStyle: {
        fill: "var(--bg-color)",
        fillOpacity: 0.95,
        stroke: edgeColor,
        strokeWidth: 1
      }
    };
  });

  return {
    nodes: [...folderNodes, ...fileNodes],
    edges
  };
}

function makeFunctionGraph(result) {
  const functions = (result.nodes || [])
    .filter((node) => node.type === "function")
    .sort((a, b) => a.path.localeCompare(b.path) || a.label.localeCompare(b.label));

  const functionIds = new Set(functions.map((node) => node.id));
  const callEdges = (result.edges || []).filter(
    (edge) => edge.type === "calls" && functionIds.has(edge.source) && functionIds.has(edge.target)
  );

  const nodeWidth = 244;
  const nodeHeight = 69;
  const layout = new dagre.graphlib.Graph();
  layout.setDefaultEdgeLabel(() => ({}));
  layout.setGraph({
    rankdir: "LR",
    nodesep: 70,
    ranksep: 120,
    edgesep: 35,
    marginx: 50,
    marginy: 50,
    ranker: "network-simplex"
  });

  functions.forEach((node) => {
    layout.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  callEdges.forEach((edge) => {
    layout.setEdge(edge.source, edge.target, { weight: 2, minlen: 1 });
  });

  if (functions.length) dagre.layout(layout);

  const nodes = functions.map((item) => {
    const position = layout.node(item.id);
    const directory = item.path.includes("/")
      ? item.path.substring(0, item.path.lastIndexOf("/"))
      : "Root";

    return {
      id: item.id,
      type: "fileNode",
      position: {
        x: position.x - nodeWidth / 2,
        y: position.y - nodeHeight / 2
      },
      width: nodeWidth,
      height: nodeHeight,
      zIndex: 2,
      draggable: true,
      data: {
        label: item.label,
        path: item.path,
        directory,
        line: item.line,
        type: "function",
        color: "#34d399"
      }
    };
  });

  const edges = callEdges.map((edge, index) => ({
    id: `call-edge-${index}-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    label: "CALLS",
    type: "smoothstep",
    animated: true,
    zIndex: 1,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: "#34d399"
    },
    style: {
      stroke: "#34d399",
      strokeWidth: 2
    },
    labelStyle: {
      fill: "var(--text-main)",
      fontSize: 9,
      fontFamily: "inherit",
      fontWeight: "bold"
    },
    labelBgStyle: {
      fill: "var(--bg-color)",
      fillOpacity: 0.95,
      stroke: "#34d399",
      strokeWidth: 1
    }
  }));

  return { nodes, edges };
}

function StatCard({ icon, label, value, note }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

function GraphLegend({ directories }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "8px 16px",
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-heavy)",
        background: "var(--bg-color)",
        fontSize: 11
      }}
    >
      <strong style={{ letterSpacing: 1 }}>LEGEND</strong>

      {directories.map((directory) => {
        const color = getFolderColor(directory);

        return (
          <div
            key={directory}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 17,
                height: 12,
                flexShrink: 0,
                border: `2px dashed ${color}`,
                borderRadius: 2
              }}
            />
            <span
              title={directory}
              style={{
                color,
                maxWidth: 180,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis"
              }}
            >
              {directory}
            </span>
          </div>
        );
      })}

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 20,
            borderTop: "2px solid #f59e0b"
          }}
        />
        <span>IMPORTS → dependency target</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 20,
            borderTop: "2px solid #22d3ee"
          }}
        />
        <span>DATABASE ACCESS → related code</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <FileCode2 size={14} />
        <span>File node — draggable</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Folder size={14} />
        <span>Folder border — drag to move group</span>
      </div>
    </div>
  );
}

function GraphToolbar({
  fullscreen,
  onFullscreen,
  onFit,
  onZoomIn,
  onZoomOut,
  onFocus,
  hasSelection
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        padding: "10px 12px",
        borderBottom: "1px solid var(--border-heavy)",
        background: "var(--bg-color)"
      }}
    >
      <button className="action-btn" onClick={onFit} type="button">
        FIT ALL
      </button>

      <button className="action-btn" onClick={onZoomIn} type="button">
        ZOOM +
      </button>

      <button className="action-btn" onClick={onZoomOut} type="button">
        ZOOM −
      </button>

      <button
        className="action-btn"
        onClick={onFocus}
        disabled={!hasSelection}
        type="button"
      >
        FOCUS SELECTED
      </button>

      <span
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          marginLeft: 4
        }}
      >
        Drag background to pan · Scroll to zoom · Drag nodes to move
      </span>

      <button
        className="action-btn"
        onClick={onFullscreen}
        type="button"
        style={{ marginLeft: "auto" }}
      >
        {fullscreen ? (
          <>
            <Minimize2
              size={13}
              style={{ display: "inline", marginRight: 5 }}
            />
            EXIT FULLSCREEN
          </>
        ) : (
          <>
            <Maximize2
              size={13}
              style={{ display: "inline", marginRight: 5 }}
            />
            FULLSCREEN
          </>
        )}
      </button>
    </div>
  );
}

function AppContent() {
  const { fitView, zoomIn, zoomOut, setCenter, getNodes } = useReactFlow();

  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const [darkTheme, setDarkTheme] = useState(true);
  const [scanMode, setScanMode] = useState("github");
  const [repoPath, setRepoPath] = useState(DEFAULT_PATH);
  const [repoUrl, setRepoUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("graph");
  const [graphNodes, setGraphNodes] = useState([]);
  const [graphMode, setGraphMode] = useState("files");
  const [analysisMode, setAnalysisMode] = useState(null);

  const previousFolderPositions = useRef(new Map());

  useEffect(() => {
    document.body.classList.toggle("dark-theme", darkTheme);

    return () => {
      document.body.classList.remove("dark-theme");
    };
  }, [darkTheme]);

  const runScan = useCallback(async () => {
    const input = scanMode === "github" ? repoUrl.trim() : repoPath.trim();

    if (!input) {
      setError(
        scanMode === "github"
          ? "Enter a public GitHub repository URL."
          : "Enter a local repository path."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSelectedNode(null);
    setAnalysisMode(null);

    try {
      const endpoint =
        scanMode === "github" ? "/api/scan/github" : "/api/scan";

      const payload =
        scanMode === "github" ? { url: input } : { path: input };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : "The repository scan failed."
        );
      }

      setResult(body);
      setActiveTab("graph");
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the API. Make sure FastAPI is running at 127.0.0.1:8000."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, [scanMode, repoPath, repoUrl]);

  const rawGraph = useMemo(
    () => (
      result
        ? graphMode === "functions"
          ? makeFunctionGraph(result)
          : makeGraph(result, graphMode === "database" ? "database" : "imports")
        : { nodes: [], edges: [] }
    ),
    [result, graphMode]
  );

  const analysisResult = useMemo(() => {
    if (!analysisMode || !selectedNode) {
      return { nodeIds: new Set(), edgeIds: new Set() };
    }

    const direction = analysisMode === "impact" ? "incoming" : "outgoing";
    const nodeIds = new Set([selectedNode.id]);
    const edgeIds = new Set();
    const queue = [selectedNode.id];

    while (queue.length) {
      const currentId = queue.shift();
      const connectedEdges = rawGraph.edges.filter((edge) =>
        direction === "incoming"
          ? edge.target === currentId
          : edge.source === currentId
      );

      connectedEdges.forEach((edge) => {
        edgeIds.add(edge.id);
        const nextId = direction === "incoming" ? edge.source : edge.target;

        if (!nodeIds.has(nextId)) {
          nodeIds.add(nextId);
          queue.push(nextId);
        }
      });
    }

    return { nodeIds, edgeIds };
  }, [analysisMode, selectedNode, rawGraph.edges]);

  useEffect(() => {
    setGraphNodes(rawGraph.nodes);

    previousFolderPositions.current = new Map(
      rawGraph.nodes
        .filter((node) => node.type === "folderGroup")
        .map((node) => [node.id, node.position])
    );
  }, [rawGraph.nodes]);

  const fileNodes = useMemo(
    () => graphNodes.filter((node) => node.type === "fileNode"),
    [graphNodes]
  );

  const directories = useMemo(
    () => [...new Set(fileNodes.map((node) => node.data.directory))].sort(),
    [fileNodes]
  );

  const visibleNodes = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matchingFiles = query
      ? fileNodes.filter(
          (node) =>
            node.data.label.toLowerCase().includes(query) ||
            node.data.path.toLowerCase().includes(query)
        )
      : fileNodes;

    const matchingDirectories = new Set(
      matchingFiles.map((node) => node.data.directory)
    );

    const folders = graphNodes.filter(
      (node) =>
        node.type === "folderGroup" &&
        matchingDirectories.has(node.data.directory)
    );

    const filteredNodes = graphMode === "functions"
      ? matchingFiles
      : [...folders, ...matchingFiles];

    return filteredNodes.map((node) => {
      if (node.type !== "fileNode") return node;

      return {
        ...node,
        data: {
          ...node.data,
          analysisActive: Boolean(analysisMode),
          analysisHighlight: analysisResult.nodeIds.has(node.id)
        }
      };
    });
  }, [fileNodes, graphNodes, search, graphMode, analysisMode, analysisResult.nodeIds]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(
    () =>
      rawGraph.edges
        .filter(
          (edge) =>
            visibleNodeIds.has(edge.source) &&
            visibleNodeIds.has(edge.target)
        )
        .map((edge) => {
          if (!analysisMode) return edge;

          const highlighted = analysisResult.edgeIds.has(edge.id);

          return {
            ...edge,
            animated: highlighted,
            style: {
              ...edge.style,
              stroke: highlighted ? "#facc15" : "var(--border-light)",
              strokeWidth: highlighted ? 3 : 1,
              opacity: highlighted ? 1 : 0.16
            },
            markerEnd: {
              ...edge.markerEnd,
              color: highlighted ? "#facc15" : "var(--border-light)"
            },
            labelStyle: {
              ...edge.labelStyle,
              fill: highlighted ? "#facc15" : "var(--text-muted)"
            }
          };
        }),
    [rawGraph.edges, visibleNodeIds, analysisMode, analysisResult.edgeIds]
  );

  const onNodeDragStart = useCallback((_, node) => {
    if (node.type === "folderGroup") {
      previousFolderPositions.current.set(node.id, { ...node.position });
    }
  }, []);

  const onNodeDrag = useCallback((_, node) => {
    if (node.type !== "folderGroup") return;

    const previous = previousFolderPositions.current.get(node.id);

    if (!previous) {
      previousFolderPositions.current.set(node.id, { ...node.position });
      return;
    }

    const deltaX = node.position.x - previous.x;
    const deltaY = node.position.y - previous.y;

    if (deltaX === 0 && deltaY === 0) return;

    previousFolderPositions.current.set(node.id, { ...node.position });

    const directory = node.data.directory;

    setGraphNodes((current) =>
      current.map((item) => {
        if (
          item.type === "fileNode" &&
          item.data.directory === directory
        ) {
          return {
            ...item,
            position: {
              x: item.position.x + deltaX,
              y: item.position.y + deltaY
            }
          };
        }

        if (item.id === node.id) {
          return {
            ...item,
            position: { ...node.position }
          };
        }

        return item;
      })
    );
  }, []);

  const onNodeDragStop = useCallback((_, node) => {
    if (node.type === "folderGroup") {
      previousFolderPositions.current.set(node.id, { ...node.position });
    }
  }, []);

  const onNodeClick = useCallback((_, node) => {
    if (node.type === "fileNode") {
      setSelectedNode(node);
      setAnalysisMode(null);
    }
  }, []);

  const focusGraph = useCallback(() => {
    fitView({
      padding: 0.15,
      duration: 350,
      minZoom: 0.1,
      maxZoom: 1.2
    });
  }, [fitView]);

  const focusSelectedNode = useCallback(() => {
    if (!selectedNode) return;

    const node = getNodes().find((item) => item.id === selectedNode.id);
    if (!node) return;

    setCenter(
      node.position.x + (node.measured?.width || node.width || 244) / 2,
      node.position.y + (node.measured?.height || node.height || 69) / 2,
      {
        zoom: 1.1,
        duration: 350
      }
    );
  }, [selectedNode, getNodes, setCenter]);

  const statistics = result?.statistics || {};

  const functionCount = (result?.nodes || []).filter(
    (node) => node.type === "function"
  ).length;

  const classCount = (result?.nodes || []).filter(
    (node) => node.type === "class"
  ).length;

  const outgoing = selectedNode
    ? rawGraph.edges.filter((edge) => edge.source === selectedNode.id)
    : [];

  const incoming = selectedNode
    ? rawGraph.edges.filter((edge) => edge.target === selectedNode.id)
    : [];

  useEffect(() => {
    if (!isGraphFullscreen) return undefined;

    const frame = window.requestAnimationFrame(() => {
      fitView({
        padding: 0.12,
        duration: 250,
        maxZoom: 1.2
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isGraphFullscreen, fitView]);

  useEffect(() => {
    if (!isGraphFullscreen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsGraphFullscreen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGraphFullscreen]);

  const graphHeight = isGraphFullscreen
    ? "calc(100dvh - 150px)"
    : 580;

  return (
    <div
      className={`container ${
        isGraphFullscreen ? "graph-fullscreen-active" : ""
      }`}
    >
      {!isGraphFullscreen && (
        <header>
          <button
            className="action-btn theme-toggle-btn"
            onClick={() => setDarkTheme((value) => !value)}
            type="button"
          >
            {darkTheme ? "[ LIGHT THEME ]" : "[ DARK THEME ]"}
          </button>

          <h1>CODEBASE X-RAY</h1>

          <div className="description">
            RETRO MONOCHROME STATIC CODE INTELLIGENCE PLATFORM
          </div>

          <div className="api-status-wrapper">
            STATUS:{" "}
            <span className="status-text live">
              ONLINE ({API_URL})
            </span>
          </div>
        </header>
      )}

      <main>
        {!isGraphFullscreen && (
          <>
            <div className="controls-row" style={{ marginBottom: 30 }}>
              <button
                className={`action-btn ${
                  activeTab === "graph" ? "active" : ""
                }`}
                onClick={() => setActiveTab("graph")}
                type="button"
              >
                [ ARCHITECTURE GRAPH ]
              </button>

              <button
                className={`action-btn ${
                  activeTab === "files" ? "active" : ""
                }`}
                onClick={() => setActiveTab("files")}
                type="button"
              >
                [ REPOSITORY FILES ]
              </button>

              <button
                className="action-btn"
                onClick={runScan}
                disabled={loading}
                style={{ marginLeft: "auto" }}
                type="button"
              >
                <RefreshCw
                  size={14}
                  className={loading ? "spin" : ""}
                  style={{ display: "inline", marginRight: 6 }}
                />
                {loading ? "SCANNING..." : "RE-SCAN"}
              </button>
            </div>

            <div className="section-title">REPOSITORY TARGET INPUT</div>

            <div
              style={{
                border: "2px solid var(--border-heavy)",
                padding: 20,
                marginBottom: 32,
                background: "var(--bg-color)",
                boxShadow: "4px 4px 0px var(--border-heavy)"
              }}
            >
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <button
                  className="action-btn"
                  onClick={() => setScanMode("github")}
                  style={{ opacity: scanMode === "github" ? 1 : 0.6 }}
                  type="button"
                >
                  GITHUB URL
                </button>

                <button
                  className="action-btn"
                  onClick={() => setScanMode("local")}
                  style={{ opacity: scanMode === "local" ? 1 : 0.6 }}
                  type="button"
                >
                  LOCAL PATH
                </button>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  runScan();
                }}
                style={{ display: "flex", gap: 12 }}
              >
                <div
                  style={{
                    flex: 1,
                    border: "2px solid var(--border-heavy)",
                    padding: "8px 12px",
                    background: "var(--bg-color)"
                  }}
                >
                  <input
                    type="text"
                    value={scanMode === "github" ? repoUrl : repoPath}
                    onChange={(event) =>
                      scanMode === "github"
                        ? setRepoUrl(event.target.value)
                        : setRepoPath(event.target.value)
                    }
                    placeholder={
                      scanMode === "github"
                        ? "https://github.com/owner/repository"
                        : "/path/to/your/repository"
                    }
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-main)",
                      outline: "none",
                      fontFamily: "inherit"
                    }}
                  />
                </div>

                <button
                  className="action-btn"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "ANALYZING..." : "SCAN"}
                </button>
              </form>

              {error && (
                <div
                  style={{
                    marginTop: 12,
                    color: "var(--bad-color)",
                    fontWeight: "bold"
                  }}
                >
                  [ERROR]: {error}
                </div>
              )}

              {result && !error && (
                <div
                  style={{
                    marginTop: 12,
                    color: "var(--live-color)",
                    fontWeight: "bold"
                  }}
                >
                  [SUCCESS]: REPOSITORY PARSED SUCCESSFULLY (
                  {statistics.errors_count || 0} ERRORS)
                </div>
              )}
            </div>

            <div className="section-title">SYSTEM METRICS</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 16,
                marginBottom: 32
              }}
            >
              <StatCard
                label="PY FILES"
                value={statistics.files_scanned ?? fileNodes.length}
                note="Discovered"
                icon={<FolderGit2 size={16} />}
              />

              <StatCard
                label="EDGES"
                value={statistics.edges_found ?? rawGraph.edges.length}
                note={graphMode === "functions" ? "Function calls" : "Imports"}
                icon={<Network size={16} />}
              />

              <StatCard
                label="SYMBOLS"
                value={statistics.nodes_found ?? "—"}
                note={`${functionCount}F / ${classCount}C`}
                icon={<Layers3 size={16} />}
              />

              <StatCard
                label="ERRORS"
                value={statistics.errors_count ?? "—"}
                note="Failed Parse"
                icon={<AlertCircle size={16} />}
              />
            </div>

            <div className="section-title">ARCHITECTURE EXPLORER</div>
          </>
        )}

        <section
          style={{
            border: isGraphFullscreen ? "none" : "2px solid var(--border-heavy)",
            background: "var(--bg-color)",
            boxShadow: isGraphFullscreen
              ? "none"
              : "5px 5px 0px var(--border-heavy)",
            position: isGraphFullscreen ? "fixed" : "relative",
            inset: isGraphFullscreen ? 0 : "auto",
            zIndex: isGraphFullscreen ? 9999 : 1,
            display: "flex",
            flexDirection: "column",
            width: isGraphFullscreen ? "100vw" : "auto",
            height: isGraphFullscreen ? "100dvh" : "auto",
            minHeight: 0,
            overflow: "hidden"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              padding: "12px 16px",
              borderBottom: "2px solid var(--border-heavy)",
              background: "var(--bg-color)"
            }}
          >
            <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>
              {result
                ? `${fileNodes.length} ${graphMode === "functions" ? "FUNCTIONS" : "FILES"} LOADED`
                : "AWAITING SCAN INPUT"}
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                style={{
                  border: "1px solid var(--border-heavy)",
                  padding: "4px 8px",
                  background: "var(--bg-color)"
                }}
              >
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="FILTER FILE..."
                  style={{
                    width: 160,
                    maxWidth: "35vw",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-main)",
                    outline: "none",
                    fontSize: "0.85rem",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              {isGraphFullscreen && (
                <button
                  className="action-btn"
                  onClick={() => setDarkTheme((value) => !value)}
                  type="button"
                >
                  {darkTheme ? "LIGHT" : "DARK"}
                </button>
              )}

              <button
                className="action-btn"
                onClick={() => {
                  if (!isGraphFullscreen && activeTab !== "graph") {
                    setActiveTab("graph");
                  }

                  setIsGraphFullscreen((value) => !value);
                }}
                type="button"
              >
                {isGraphFullscreen ? (
                  <>
                    <X
                      size={13}
                      style={{ display: "inline", marginRight: 5 }}
                    />
                    EXIT
                  </>
                ) : (
                  <>
                    <Maximize2
                      size={13}
                      style={{ display: "inline", marginRight: 5 }}
                    />
                    FULLSCREEN
                  </>
                )}
              </button>
            </div>
          </div>

          {!result ? (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                flex: 1,
                overflow: "auto"
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: 12 }}>
                [ NO REPOSITORY DATA LOADED ]
              </div>

              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.9rem",
                  marginBottom: 20
                }}
              >
                Trigger a repository scan above to render the architecture
                graph.
              </p>

              <button
                className="action-btn"
                onClick={runScan}
                disabled={loading}
                type="button"
              >
                {loading ? "SCANNING..." : "RUN SCAN PIPELINE"}
              </button>
            </div>
          ) : activeTab === "files" && !isGraphFullscreen ? (
            <div
              style={{
                padding: 16,
                minHeight: 400,
                textAlign: "left",
                overflow: "auto"
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1fr",
                  borderBottom: "1px solid var(--border-heavy)",
                  paddingBottom: 8,
                  fontWeight: "bold",
                  fontSize: "0.9rem"
                }}
              >
                <span>FILE NAME</span>
                <span>DIRECTORY</span>
                <span>CONNECTIONS</span>
              </div>

              {visibleNodes
                .filter((node) => node.type === "fileNode")
                .map((node) => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 2fr 1fr",
                      gap: 8,
                      padding: "8px 0",
                      borderBottom: `1px dotted ${node.data.color}`,
                      borderLeft: `3px solid ${node.data.color}`,
                      paddingLeft: 8,
                      cursor: "pointer",
                      background:
                        selectedNode?.id === node.id
                          ? "var(--text-main)"
                          : "transparent",
                      color:
                        selectedNode?.id === node.id
                          ? "var(--bg-color)"
                          : "inherit"
                    }}
                  >
                    <span>{node.data.label}</span>
                    <span>{node.data.directory}</span>
                    <span>
                      {
                        rawGraph.edges.filter(
                          (edge) =>
                            edge.source === node.id ||
                            edge.target === node.id
                        ).length
                      }
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <>
              <GraphToolbar
                fullscreen={isGraphFullscreen}
                onFullscreen={() =>
                  setIsGraphFullscreen((value) => !value)
                }
                onFit={focusGraph}
                onZoomIn={() => zoomIn({ duration: 200 })}
                onZoomOut={() => zoomOut({ duration: 200 })}
                onFocus={focusSelectedNode}
                hasSelection={Boolean(selectedNode)}
              />

              <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border-heavy)", background: "var(--bg-color)", flexWrap: "wrap" }}>
                <button
                  className={`action-btn ${analysisMode === "impact" ? "active" : ""}`}
                  onClick={() => setAnalysisMode((mode) => mode === "impact" ? null : "impact")}
                  disabled={!selectedNode}
                  title="Highlight dependencies that may be affected by changing the selected node"
                  type="button"
                >
                  CHANGE IMPACT{analysisMode === "impact" ? ` (${Math.max(0, analysisResult.nodeIds.size - 1)})` : ""}
                </button>
                <button
                  className={`action-btn ${analysisMode === "trace" ? "active" : ""}`}
                  onClick={() => setAnalysisMode((mode) => mode === "trace" ? null : "trace")}
                  disabled={!selectedNode}
                  title="Trace outgoing dependencies or function calls from the selected node"
                  type="button"
                >
                  TRACE FLOW{analysisMode === "trace" ? ` (${Math.max(0, analysisResult.nodeIds.size - 1)})` : ""}
                </button>
                {analysisMode && (
                  <span style={{ alignSelf: "center", color: "var(--text-muted)", fontSize: 11 }}>
                    YELLOW = HIGHLIGHTED PATH · SELECT A NODE TO START AGAIN
                  </span>
                )}
                <button className={`action-btn ${graphMode === "files" ? "active" : ""}`} onClick={() => { setGraphMode("files"); setSelectedNode(null); setAnalysisMode(null); }} type="button">
                  FILE IMPORTS ({(result?.edges || []).filter((edge) => edge.type === "imports" || (edge.type === "database" && Boolean(edge.module))).length})
                </button>
                <button className={`action-btn ${graphMode === "database" ? "active" : ""}`} onClick={() => { setGraphMode("database"); setSelectedNode(null); setAnalysisMode(null); }} type="button">
                  DATABASE ACCESS ({(result?.edges || []).filter((edge) => edge.type === "database").length})
                </button>
                <button className={`action-btn ${graphMode === "functions" ? "active" : ""}`} onClick={() => { setGraphMode("functions"); setSelectedNode(null); setAnalysisMode(null); }} type="button">
                  FUNCTION CALLS ({(result?.edges || []).filter((edge) => edge.type === "calls").length})
                </button>
              </div>
              {graphMode !== "functions" && <GraphLegend directories={directories} />}
              {graphMode === "database" && (
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-heavy)", fontSize: 11, color: "var(--text-muted)" }}>
                  Cyan arrows show detected or inferred database relationships. Orange arrows in FILE IMPORTS show module imports.
                </div>
              )}
              {graphMode === "functions" && (
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-heavy)", fontSize: 11, color: "var(--text-muted)" }}>
                  Green nodes are functions. Green arrows show detected function calls. Counts reflect edges returned by the backend.
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flex: 1,
                  minHeight: 0,
                  height: graphHeight,
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 0,
                    position: "relative",
                    background: "var(--bg-color)"
                  }}
                >
                  {visibleNodes.some(
                    (node) => node.type === "fileNode"
                  ) ? (
                    <ReactFlow
                      nodes={visibleNodes}
                      edges={visibleEdges}
                      nodeTypes={nodeTypes}
                      onNodeClick={onNodeClick}
                      onNodeDragStart={onNodeDragStart}
                      onNodeDrag={onNodeDrag}
                      onNodeDragStop={onNodeDragStop}
                      fitView
                      fitViewOptions={{
                        padding: 0.15,
                        maxZoom: 1.2
                      }}
                      minZoom={0.08}
                      maxZoom={2.5}
                      panOnDrag={true}
                      panOnScroll={false}
                      zoomOnScroll={true}
                      zoomOnPinch={true}
                      zoomOnDoubleClick={false}
                      nodesDraggable={true}
                      elementsSelectable={true}
                      onlyRenderVisibleElements={true}
                      proOptions={{ hideAttribution: true }}
                      style={{
                        width: "100%",
                        height: "100%"
                      }}
                    >
                      <Background
                        color="var(--border-light)"
                        gap={24}
                        size={1}
                      />

                      <Controls />
                    </ReactFlow>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        placeItems: "center",
                        height: "100%",
                        color: "var(--text-muted)"
                      }}
                    >
                      NO FILES MATCH SEARCH CRITERIA.
                    </div>
                  )}
                </div>

                {selectedNode && (
                  <aside
                    style={{
                      width: isGraphFullscreen ? 320 : 300,
                      maxWidth: "40vw",
                      flexShrink: 0,
                      borderLeft: "2px solid var(--border-heavy)",
                      padding: 16,
                      background: "var(--bg-color)",
                      textAlign: "left",
                      overflowY: "auto"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        borderBottom: "1px solid var(--border-heavy)",
                        paddingBottom: 8,
                        marginBottom: 12
                      }}
                    >
                      <strong>{graphMode === "functions" ? "[ FUNCTION INSPECTOR ]" : "[ FILE INSPECTOR ]"}</strong>

                      <button
                        className="action-btn"
                        onClick={() => setSelectedNode(null)}
                        style={{
                          padding: "2px 6px",
                          fontSize: "0.75rem"
                        }}
                        type="button"
                      >
                        X
                      </button>
                    </div>

                    <div
                      style={{
                        borderLeft: `4px solid ${selectedNode.data.color}`,
                        paddingLeft: 8,
                        fontWeight: "bold",
                        fontSize: "1rem",
                        marginBottom: 8
                      }}
                    >
                      {selectedNode.data.label}
                    </div>

                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                        overflowWrap: "anywhere",
                        marginBottom: 12
                      }}
                    >
                      PATH: {selectedNode.data.path}{selectedNode.data.line ? `:${selectedNode.data.line}` : ""}
                    </div>

                    <div
                      style={{
                        color: selectedNode.data.color,
                        fontSize: 11,
                        marginBottom: 14
                      }}
                    >
                      FOLDER: {selectedNode.data.directory}
                    </div>

                    {analysisMode && (
                      <div style={{ borderLeft: "3px solid #facc15", padding: "8px 10px", marginBottom: 12, fontSize: 12, color: "var(--text-muted)" }}>
                        {analysisMode === "impact"
                          ? `${Math.max(0, analysisResult.nodeIds.size - 1)} upstream node(s) may be affected by changing this ${graphMode === "functions" ? "function" : "file"}.`
                          : `${Math.max(0, analysisResult.nodeIds.size - 1)} downstream node(s) are reachable from this ${graphMode === "functions" ? "function" : "file"}.`}
                      </div>
                    )}

                    <div
                      style={{
                        borderTop: "1px dotted var(--border-light)",
                        paddingTop: 10,
                        marginTop: 10
                      }}
                    >
                      <strong>{graphMode === "functions" ? "OUTGOING CALLS" : "OUTGOING IMPORTS"} ({outgoing.length}):</strong>

                      {outgoing.length === 0 && (
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                            marginTop: 6
                          }}
                        >
                          No outgoing dependencies found.
                        </div>
                      )}

                      {outgoing.map((edge) => (
                        <div
                          key={edge.id}
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                            marginTop: 6,
                            overflowWrap: "anywhere"
                          }}
                        >
                          → {graphMode === "functions" ? edge.target.split("::").pop() : edge.target.split("/").pop()}
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        borderTop: "1px dotted var(--border-light)",
                        paddingTop: 10,
                        marginTop: 14
                      }}
                    >
                      <strong>{graphMode === "functions" ? "INCOMING CALLS" : "INCOMING IMPORTS"} ({incoming.length}):</strong>

                      {incoming.length === 0 && (
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                            marginTop: 6
                          }}
                        >
                          No incoming dependencies found.
                        </div>
                      )}

                      {incoming.map((edge) => (
                        <div
                          key={edge.id}
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                            marginTop: 6,
                            overflowWrap: "anywhere"
                          }}
                        >
                          ← {graphMode === "functions" ? edge.source.split("::").pop() : edge.source.split("/").pop()}
                        </div>
                      ))}
                    </div>

                    <button
                      className="action-btn"
                      onClick={focusSelectedNode}
                      style={{ marginTop: 18, width: "100%" }}
                      type="button"
                    >
                      {graphMode === "functions" ? "FOCUS THIS FUNCTION" : "FOCUS THIS FILE"}
                    </button>
                  </aside>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {!isGraphFullscreen && <Footer />}

    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}
