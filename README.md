# Codebase X-Ray

### See the structure. Trace the dependencies. Understand the codebase.

**Codebase X-Ray** is an interactive codebase visualization tool that transforms Python repositories into navigable architecture graphs. It uses static analysis to discover source files and import relationships, helping developers understand how a project is organized and how its components connect.

Instead of manually jumping between files, explore the repository visually, inspect dependencies, and navigate unfamiliar codebases from a single interface.

<p align="center">
  <a href="https://codebase-xray-1.onrender.com">
    <strong>Live Demo →</strong>
  </a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Running Locally](#running-locally)
- [Using Codebase X-Ray](#using-codebase-x-ray)
- [API Reference](#api-reference)
- [Security and Limitations](#security-and-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Overview

Understanding an unfamiliar repository is one of the most time-consuming parts of software development. File structures can be large, dependencies can be difficult to trace, and the impact of a change may not be obvious.

Codebase X-Ray approaches this problem by converting repository structure into an interactive visual graph.

**The workflow:**

`Repository → Python AST Analysis → Dependency Extraction → Interactive Graph`

The project combines a Python static-analysis backend with a React-based visualization interface to make codebase exploration more intuitive.

## Features

### Repository Analysis

- Scan public GitHub repositories.
- Scan local repositories when running the backend on the same machine.
- Discover Python source files.
- Extract available structural information and import relationships.
- Report scan statistics and parsing errors.

### Interactive Architecture Graph

- Visualize source files as graph nodes.
- Display detected import relationships as directed edges.
- Automatically arrange the initial graph using Dagre.
- Pan, zoom, and navigate large graph layouts.
- Drag individual nodes to reorganize the view.
- Move folder groups and their contained files.
- Fit the graph to the available viewport or focus on a selected file.
- Explore the graph in fullscreen mode.

### Folder-Based Visualization

- Group files by directory.
- Distinguish folders using consistent accent colors.
- Display folder-level file counts.
- Use a graph legend to understand folders and dependency connections.

### File Inspector

Select a node to inspect available file information, including:

- File name and repository path.
- Parent directory.
- Incoming imports.
- Outgoing imports.
- Connected files in the architecture graph.

### Search and Navigation

- Filter files by name or path.
- Switch between graph and repository file views.
- Navigate to selected nodes.
- Toggle between dark and light themes.

### Repository Metrics

View analysis statistics where available, including:

- Files scanned.
- Graph nodes discovered.
- Dependency edges identified.
- Functions and classes detected.
- Parsing errors encountered.

### ZIP Repository Upload

The backend includes a ZIP-upload scanning endpoint for analyzing uploaded repository archives. Upload compatibility depends on the archive's structure and the server's configured security limits. Archives containing symlinks or excessive entries may be rejected.

---

## Architecture

Codebase X-Ray separates repository analysis from visualization.

```text
                  CODEBASE X-RAY
                        |
              +---------+---------+
              |                   |
        React Frontend       FastAPI Backend
              |                   |
        React Flow UI       Repository Scanner
              |                   |
        Graph Rendering      Python AST Analysis
              |                   |
        User Interaction     Import Extraction
              |                   |
              +---------+---------+
                        |
                Dependency Graph
```

### Frontend

The React frontend handles repository input, scan controls, graph rendering, search, file inspection, themes, and navigation.

### Backend

The FastAPI backend exposes endpoints for repository scanning and returns structured analysis results to the frontend.

### Static Analysis

Python's Abstract Syntax Tree (AST) facilities allow source code to be inspected without executing it. The scanner extracts definitions and import information that can be used to construct a dependency graph.

### Graph Layout

Dagre calculates the initial graph layout, while React Flow provides interactive node positioning, navigation, and graph rendering.

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Build tool | Vite |
| Graph visualization | React Flow (`@xyflow/react`) |
| Graph layout | Dagre (`@dagrejs/dagre`) |
| Icons | Lucide React |
| Backend API | FastAPI |
| Application server | Uvicorn |
| Static analysis | Python AST |
| Communication | HTTP and JSON |
| Deployment | Render |

---

## Getting Started

### Prerequisites

Install the following:

- Python 3.10 or a compatible version supported by the backend dependencies.
- Node.js and npm.
- Git.

Check your installation:

```bash
python3 --version
node --version
npm --version
git --version
```

### 1. Clone the repository

```bash
git clone <https://github.com/sreevatsarajesh/Codebase_XRay>
cd codebase_XRay
```

### 2. Set up the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

The backend dependency file should contain the packages required by the current application.

### 3. Set up the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
```

The frontend dependencies are declared in `package.json`.

---

## Running Locally

Run the backend and frontend in separate terminals.

### Terminal 1: Backend

From the project root:

```bash
cd backend
source .venv/bin/activate
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

The API should be available at:

- API base: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

### Terminal 2: Frontend

From the project root:

```bash
cd frontend
npm run dev
```

Open the local URL printed by Vite, typically:

`http://localhost:5173`

Keep both servers running while using the application.

If the frontend uses a configurable API base URL, configure its Vite environment variable to point to `http://127.0.0.1:8000` for local development. Follow the variable name used in the current frontend source.

---

## Using Codebase X-Ray

### 1. Choose a repository

Select a supported scanning method:

- **GitHub URL:** Enter the URL of a public GitHub repository.
- **Local path:** Enter an absolute path to a repository accessible to the machine running the backend.
- **ZIP upload:** Upload a compatible repository archive if the upload interface is available.

**Important:** When using the hosted demo, a local path refers to the server's filesystem, not your personal computer. Use GitHub scanning or ZIP upload to provide source code to the hosted service.

### 2. Run the scan

Start the scan and wait for the backend to return the analysis results.

### 3. Explore the architecture

- Pan across the canvas and zoom in or out.
- Drag nodes to reorganize the graph.
- Move folder groups to arrange related files.
- Search for a file by name or path.
- Select a node to inspect its dependencies.
- Use the graph controls to fit the graph into view or focus on a selected file.

### 4. Trace dependencies

Use incoming and outgoing import relationships to understand how detected Python modules connect.

### 5. Review the metrics

Inspect the available scan statistics and parsing errors to understand what the scanner could analyze successfully.

---

## API Reference

The following endpoints are implemented by the backend.

Base URL for local development:

`http://127.0.0.1:8000`

For the hosted application, use the deployed backend service URL.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check backend health |
| `POST` | `/api/scan` | Scan a repository path accessible to the backend |
| `POST` | `/api/scan/github` | Retrieve and scan a public GitHub repository |
| `POST` | `/api/scan/upload` | Upload and scan a ZIP archive |

### Scan a local repository

`POST /api/scan`

Example request:

```json
{
  "path": "/absolute/path/to/repository"
}
```

### Scan a GitHub repository

`POST /api/scan/github`

Example request:

```json
{
  "url": "https://github.com/owner/repository"
}
```

### Upload a ZIP archive

`POST /api/scan/upload`

Submit a ZIP archive using a multipart form upload with the field name expected by the backend endpoint.

For exact request schemas, validation rules, and response structures, use FastAPI's interactive documentation at `/docs`.

---

## Security and Limitations

Codebase X-Ray is a static-analysis and visualization tool, not a complete code-security auditing platform.

- **Language coverage:** Current analysis focuses on Python repositories.
- **Static analysis:** Runtime behavior and dependencies that are only visible during execution may not be represented.
- **Dynamic imports:** Complex import patterns and unresolved modules may be missed.
- **Graph completeness:** The graph represents relationships detected by the scanner, not necessarily every dependency in the application.
- **Large repositories:** Very large repositories may encounter processing, size, or graph-rendering limits.
- **Local paths:** A hosted backend cannot directly read files from a user's local computer.
- **ZIP uploads:** Archive size, entry count, file count, extracted source size, and symlink restrictions can prevent some archives from being accepted.
- **Security conclusions:** A dependency graph alone cannot prove that a repository is secure or vulnerable.

The scanner should not execute uploaded source code as part of static analysis. Archive extraction and repository retrieval must continue to enforce appropriate path and resource limits.

---

## Roadmap

Potential directions for future development:

- [ ] Expand language support beyond Python.
- [ ] Improve module resolution and dependency accuracy.
- [ ] Add function-level and class-level relationship exploration.
- [ ] Trace execution paths across related functions.
- [ ] Introduce change-impact analysis for modified files.
- [ ] Add guided challenges for learning unfamiliar repositories.
- [ ] Improve large-graph performance and filtering.
- [ ] Expand automated testing and regression coverage.
- [ ] Improve ZIP-upload diagnostics and archive compatibility.

These are planned directions, not claims that the features are already implemented.

---

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement and test your changes.
4. Run relevant backend tests and verify the frontend build.
5. Submit a pull request describing your changes.

For substantial changes, open an issue first to discuss the proposed implementation.

---

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

## Author

**Sreevatsa Rajesh**

Mathematics and Computing undergraduate interested in software development, static analysis, machine learning, and cybersecurity.

---

<p align="center">
  <strong>CODEBASE X-RAY</strong><br>
  <sub>Make complex codebases easier to see and understand.</sub>
</p>
