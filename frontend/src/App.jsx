import dagre from "@dagrejs/dagre";
import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Handle,
  Position,
  MarkerType
} from "@xyflow/react";
import {
  Activity,
  AlertCircle,
  Box,
  CheckCircle2,
  ChevronRight,
  Code2,
  FileCode2,
  FolderGit2,
  GitBranch,
  Layers3,
  LoaderCircle,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import "@xyflow/react/dist/style.css";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";
const DEFAULT_PATH =
  "/Users/sreevatsarajesh/Documents/GitHub/cybersecuritylabs";

function FileNode({ data, selected }) {
  return (
    <div className={`file-node ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div className="file-node-icon">
        <FileCode2 size={17} />
      </div>
      <div className="file-node-content">
        <div className="file-node-name">{data.label}</div>
        <div className="file-node-path">{data.directory || "Root"}</div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function FolderGroupNode({ data }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: "14px 16px",
        border: "1px solid #293858",
        borderRadius: "14px",
        background: "rgba(17, 26, 44, 0.55)",
        pointerEvents: "none"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#aebfff",
          fontSize: "12px",
          fontWeight: 600,
          minWidth: 0
        }}
      >
        <FolderGit2 size={15} />
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {data.directory}
        </span>
        <span
          style={{
            color: "#7483a4",
            marginLeft: "auto",
            whiteSpace: "nowrap"
          }}
        >
          {data.count} files
        </span>
      </div>
    </div>
  );
}

const nodeTypes = {
  fileNode: FileNode,
  folderGroup: FolderGroupNode
};

function makeGraph(result) {
  const files = (result.nodes || [])
    .filter((node) => node.type === "file")
    .sort((a, b) => a.path.localeCompare(b.path));

  const fileIds = new Set(files.map((file) => file.id));
  const graphEdges = (result.edges || []).filter(
    (edge) => fileIds.has(edge.source) && fileIds.has(edge.target)
  );

  const nodeWidth = 244;
  const nodeHeight = 69;
  const paddingX = 24;
  const paddingTop = 50;
  const paddingBottom = 24;

  const layout = new dagre.graphlib.Graph();
  layout.setDefaultEdgeLabel(() => ({}));
  layout.setGraph({
    rankdir: "LR",
    nodesep: 65,
    ranksep: 115,
    edgesep: 30,
    marginx: 40,
    marginy: 40,
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
      zIndex: 1,
      data: {
        label: file.label,
        path: file.path,
        directory,
        type: file.type
      }
    };
  });

  const directoryGroups = new Map();

  fileNodes.forEach((node) => {
    const directory = node.data.directory;

    if (!directoryGroups.has(directory)) {
      directoryGroups.set(directory, []);
    }

    directoryGroups.get(directory).push(node);
  });

  const folderNodes = [];

  directoryGroups.forEach((groupFiles, directory) => {
    const minX = Math.min(
      ...groupFiles.map((node) => node.position.x)
    );
    const minY = Math.min(
      ...groupFiles.map((node) => node.position.y)
    );
    const maxX = Math.max(
      ...groupFiles.map((node) => node.position.x + nodeWidth)
    );
    const maxY = Math.max(
      ...groupFiles.map((node) => node.position.y + nodeHeight)
    );

    const width = maxX - minX + paddingX * 2;
    const height = maxY - minY + paddingTop + paddingBottom;

    folderNodes.push({
      id: `folder-${directory}`,
      type: "folderGroup",
      position: {
        x: minX - paddingX,
        y: minY - paddingTop
      },
      style: {
        width,
        height
      },
      width,
      height,
      zIndex: -1,
      draggable: false,
      selectable: false,
      connectable: false,
      focusable: false,
      data: {
        directory,
        count: groupFiles.length
      }
    });
  });

  const edges = graphEdges.map((edge, index) => ({
    id: `edge-${index}-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    label: "imports",
    type: "smoothstep",
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed
    },
    style: {
      stroke: "#7185ff",
      strokeWidth: 1.6
    },
    labelStyle: {
      fill: "#aeb9d7",
      fontSize: 10
    },
    labelBgStyle: {
      fill: "#111827",
      fillOpacity: 0.95
    }
  }));

  return {
    nodes: [...folderNodes, ...fileNodes],
    edges
  };
}

function StatCard({ icon, label, value, note, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

function AppContent() {
  const [repoPath, setRepoPath] = useState(DEFAULT_PATH);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("graph");

  const runScan = useCallback(async () => {
    if (!repoPath.trim()) {
      setError("Enter a repository path first.");
      return;
    }

    setLoading(true);
    setError("");
    setSelectedNode(null);

    try {
      const response = await fetch(`${API_URL}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          path: repoPath.trim()
        })
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
  }, [repoPath]);

  const graph = useMemo(
    () => (result ? makeGraph(result) : { nodes: [], edges: [] }),
    [result]
  );

  const fileNodes = useMemo(
    () => graph.nodes.filter((node) => node.type === "fileNode"),
    [graph.nodes]
  );

  const visibleNodes = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matchingFiles = !query
      ? fileNodes
      : fileNodes.filter(
          (node) =>
            node.data.label.toLowerCase().includes(query) ||
            node.data.path.toLowerCase().includes(query)
        );

    const visibleDirectories = new Set(
      matchingFiles.map((node) => node.data.directory)
    );

    const folders = graph.nodes.filter(
      (node) =>
        node.type === "folderGroup" &&
        visibleDirectories.has(node.data.directory)
    );

    return [...folders, ...matchingFiles];
  }, [fileNodes, graph.nodes, search]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(
    () =>
      graph.edges.filter(
        (edge) =>
          visibleNodeIds.has(edge.source) &&
          visibleNodeIds.has(edge.target)
      ),
    [graph.edges, visibleNodeIds]
  );

  const onNodeClick = useCallback((_, node) => {
    if (node.type === "fileNode") {
      setSelectedNode(node);
    }
  }, []);

  const statistics = result?.statistics || {};
  const fileCount = fileNodes.length;

  const functionCount = (result?.nodes || []).filter(
    (node) => node.type === "function"
  ).length;

  const classCount = (result?.nodes || []).filter(
    (node) => node.type === "class"
  ).length;

  const selectedOutgoing = selectedNode
    ? graph.edges.filter((edge) => edge.source === selectedNode.id)
    : [];

  const selectedIncoming = selectedNode
    ? graph.edges.filter((edge) => edge.target === selectedNode.id)
    : [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Network size={23} />
          </div>
          <div>
            <div className="brand-name">CODEBASE X-RAY</div>
            <div className="brand-caption">Code intelligence platform</div>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <button
          className={`side-link ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Layers3 size={17} />
          <span>Overview</span>
          <ChevronRight size={15} className="side-chevron" />
        </button>

        <button
          className={`side-link ${activeTab === "graph" ? "active" : ""}`}
          onClick={() => setActiveTab("graph")}
        >
          <GitBranch size={17} />
          <span>Dependency graph</span>
        </button>

        <button
          className={`side-link ${activeTab === "files" ? "active" : ""}`}
          onClick={() => setActiveTab("files")}
        >
          <FolderGit2 size={17} />
          <span>Repository files</span>
        </button>

        <div className="sidebar-label sidebar-label-spaced">
          ANALYSIS
        </div>

        <div className="sidebar-info">
          <ShieldCheck size={17} />
          <div>
            <div className="sidebar-info-title">Static analysis</div>
            <div className="sidebar-info-text">
              Python AST-based scanning
            </div>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="connection-indicator">
            <span className="status-dot" />
            <span>Local API</span>
            <span className="connection-state">DEV</span>
          </div>
          <div className="sidebar-version">
            CODEBASE X-RAY · v0.1.0
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>Overview</strong>
          </div>
          <div className="topbar-right">
            <span className="environment-tag">
              <span className="status-dot" />
              Local environment
            </span>
            <div className="avatar">X</div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                <Sparkles size={14} />
                CODE INTELLIGENCE
              </div>
              <h1>Repository overview</h1>
              <p>
                Understand your codebase, map dependencies, and explore
                your software architecture.
              </p>
            </div>

            <button
              className="secondary-button"
              onClick={runScan}
              disabled={loading}
            >
              <RefreshCw
                size={15}
                className={loading ? "spin" : ""}
              />
              Rescan repository
            </button>
          </section>

          <section className="scan-panel">
            <div className="scan-panel-heading">
              <div className="scan-icon">
                <FolderGit2 size={19} />
              </div>
              <div>
                <h2>Scan a repository</h2>
                <p>Enter an absolute path accessible to the backend.</p>
              </div>
            </div>

            <form
              className="scan-form"
              onSubmit={(event) => {
                event.preventDefault();
                runScan();
              }}
            >
              <div className="path-input-wrap">
                <Code2 size={17} />
                <input
                  value={repoPath}
                  onChange={(event) => setRepoPath(event.target.value)}
                  placeholder="/path/to/your/repository"
                  aria-label="Repository path"
                />
              </div>

              <button
                className="primary-button"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <LoaderCircle size={17} className="spin" />
                ) : (
                  <Activity size={17} />
                )}
                {loading ? "Scanning..." : "Analyze codebase"}
              </button>
            </form>

            {error && (
              <div className="error-banner">
                <AlertCircle size={17} />
                <span>{error}</span>
                <button
                  onClick={() => setError("")}
                  aria-label="Dismiss error"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {result && !error && (
              <div className="success-message">
                <CheckCircle2 size={15} />
                Scan completed successfully
                <span>{statistics.errors_count || 0} parsing errors</span>
              </div>
            )}
          </section>

          <section className="stats-grid">
            <StatCard
              icon={<FolderGit2 size={18} />}
              label="Python files"
              value={statistics.files_scanned ?? "—"}
              note="Successfully scanned"
              tone="blue"
            />
            <StatCard
              icon={<Network size={18} />}
              label="Dependency edges"
              value={statistics.edges_found ?? "—"}
              note="Local import connections"
              tone="purple"
            />
            <StatCard
              icon={<Box size={18} />}
              label="Code symbols"
              value={statistics.nodes_found ?? "—"}
              note={`${functionCount} functions · ${classCount} classes`}
              tone="green"
            />
            <StatCard
              icon={<AlertCircle size={18} />}
              label="Parse errors"
              value={statistics.errors_count ?? "—"}
              note="Files with parsing errors"
              tone="orange"
            />
          </section>

          <section className="workspace-panel">
            <div className="workspace-toolbar">
              <div className="workspace-title">
                <div className="workspace-title-icon">
                  <GitBranch size={18} />
                </div>
                <div>
                  <h2>Architecture explorer</h2>
                  <p>
                    {result
                      ? `${fileCount} files · ${graph.edges.length} connections`
                      : "Your dependency map will appear here"}
                  </p>
                </div>
              </div>

              <div className="workspace-actions">
                <div className="search-box">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Find a file..."
                    aria-label="Search files"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="tab-switch">
                  <button
                    className={activeTab !== "files" ? "selected" : ""}
                    onClick={() => setActiveTab("graph")}
                  >
                    <Network size={14} />
                    Graph
                  </button>
                  <button
                    className={activeTab === "files" ? "selected" : ""}
                    onClick={() => setActiveTab("files")}
                  >
                    <FileCode2 size={14} />
                    Files
                  </button>
                </div>
              </div>
            </div>

            {!result ? (
              <div className="empty-state">
                <div className="empty-graphic">
                  <div className="empty-graphic-ring ring-one" />
                  <div className="empty-graphic-ring ring-two" />
                  <div className="empty-graphic-center">
                    <Network size={34} />
                  </div>
                  <div className="empty-node empty-node-one" />
                  <div className="empty-node empty-node-two" />
                  <div className="empty-node empty-node-three" />
                </div>

                <h3>Your codebase, visualized.</h3>
                <p>
                  Run your first scan to discover files and map their
                  relationships.
                </p>

                <button
                  className="primary-button"
                  onClick={runScan}
                  disabled={loading}
                >
                  {loading ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : (
                    <Activity size={16} />
                  )}
                  {loading ? "Analyzing..." : "Analyze repository"}
                </button>
              </div>
            ) : activeTab === "files" ? (
              <div className="file-list">
                <div className="file-list-heading">
                  <span>File name</span>
                  <span>Directory</span>
                  <span>Connections</span>
                </div>

                {visibleNodes
                  .filter((node) => node.type === "fileNode")
                  .map((node) => (
                    <button
                      className={`file-row ${
                        selectedNode?.id === node.id ? "active" : ""
                      }`}
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                    >
                      <span className="file-name-cell">
                        <FileCode2 size={16} />
                        {node.data.label}
                      </span>
                      <span className="file-directory-cell">
                        {node.data.directory}
                      </span>
                      <span className="file-edge-count">
                        {
                          graph.edges.filter(
                            (edge) =>
                              edge.source === node.id ||
                              edge.target === node.id
                          ).length
                        }
                      </span>
                    </button>
                  ))}

                {!visibleNodes.some(
                  (node) => node.type === "fileNode"
                ) && (
                  <div className="no-results">
                    No files match your search.
                  </div>
                )}
              </div>
            ) : (
              <div className="graph-layout">
                <div className="graph-canvas">
                  {visibleNodes.some(
                    (node) => node.type === "fileNode"
                  ) ? (
                    <ReactFlow
                      nodes={visibleNodes}
                      edges={visibleEdges}
                      nodeTypes={nodeTypes}
                      onNodeClick={onNodeClick}
                      fitView
                      fitViewOptions={{ padding: 0.2 }}
                      minZoom={0.15}
                      maxZoom={2}
                      proOptions={{ hideAttribution: true }}
                    >
                      <Background color="#273149" gap={22} size={1} />
                      <Controls />
                      <MiniMap
                        nodeColor={(node) =>
                          node.type === "folderGroup"
                            ? "#293858"
                            : "#6477ff"
                        }
                        maskColor="rgba(8, 12, 23, 0.75)"
                      />
                    </ReactFlow>
                  ) : (
                    <div className="no-results">
                      <Search size={22} />
                      <span>No files match your search.</span>
                    </div>
                  )}

                  <div className="graph-legend">
                    <span className="legend-dot" />
                    Python file
                    <span className="legend-line" />
                    Imports
                  </div>
                </div>

                {selectedNode && (
                  <aside className="details-panel">
                    <div className="details-heading">
                      <div>
                        <div className="details-eyebrow">
                          FILE INSPECTOR
                        </div>
                        <h3>File details</h3>
                      </div>
                      <button
                        className="icon-button"
                        onClick={() => setSelectedNode(null)}
                        aria-label="Close details"
                      >
                        <X size={17} />
                      </button>
                    </div>

                    <div className="details-file-icon">
                      <FileCode2 size={22} />
                    </div>
                    <h4>{selectedNode.data.label}</h4>
                    <div className="detail-type">Python source file</div>

                    <div className="detail-section">
                      <div className="detail-label">RELATIVE PATH</div>
                      <div className="detail-path">
                        {selectedNode.data.path}
                      </div>
                    </div>

                    <div className="detail-section">
                      <div className="detail-label">DEPENDENCIES</div>
                      <div className="detail-count">
                        {selectedOutgoing.length} outgoing imports
                      </div>
                      <div className="detail-count">
                        {selectedIncoming.length} incoming imports
                      </div>
                    </div>

                    <div className="detail-section">
                      <div className="detail-label">DIRECT IMPORTS</div>
                      {selectedOutgoing.length ? (
                        selectedOutgoing.map((edge) => (
                          <div className="dependency-item" key={edge.id}>
                            <FileCode2 size={14} />
                            <span>{edge.target.split("/").pop()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="muted-text">
                          No resolved imports.
                        </div>
                      )}
                    </div>

                    <div className="detail-section">
                      <div className="detail-label">IMPORTED BY</div>
                      {selectedIncoming.length ? (
                        selectedIncoming.map((edge) => (
                          <div className="dependency-item" key={edge.id}>
                            <FileCode2 size={14} />
                            <span>{edge.source.split("/").pop()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="muted-text">
                          No files import this file.
                        </div>
                      )}
                    </div>
                  </aside>
                )}
              </div>
            )}
          </section>

          <footer className="page-footer">
            <span>
              <span className="status-dot" />
              Codebase X-Ray is running locally
            </span>
            <span>Built for developers · v0.1.0</span>
          </footer>
        </div>
      </main>
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