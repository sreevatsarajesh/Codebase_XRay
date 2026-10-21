
# Codebase X-Ray

### See the structure. Trace the dependencies. Understand the codebase.

Codebase X-Ray is a static code intelligence and repository visualization tool that scans Python repositories, extracts structural information, identifies import relationships, and renders an interactive architecture graph.

Instead of manually navigating files and imports, developers can explore a repository visually, inspect individual files, and understand how different parts of a codebase connect.

It supports scanning local repositories and public GitHub repositories through a FastAPI backend and visualizes the results in an interactive React Flow frontend.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Using Codebase X-Ray](#using-codebase-x-ray)
- [API Reference](#api-reference)
- [How It Works](#how-it-works)
- [Current Limitations](#current-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Understanding an unfamiliar codebase can be time-consuming. Files are distributed across directories, dependencies are not always obvious, and the impact of changes can be difficult to determine without tracing imports manually.

Codebase X-Ray addresses this problem by turning repository structure into an interactive visual graph.

The application scans Python source files, extracts structural information, identifies file-level import relationships, and organizes the results into a navigable architecture view.

### The core idea

**Repository → Static Analysis → Dependency Graph → Interactive Exploration**

Codebase X-Ray is designed as a lightweight foundation for repository understanding, architectural exploration, and future static-analysis capabilities.

## Features

### Repository Scanning

- Scan a local repository using its filesystem path.
- Scan a public GitHub repository using its URL.
- Discover Python source files.
- Extract repository structure and available code entities.
- Report scan statistics and parsing errors.

### Interactive Architecture Graph

- Visualize Python files as graph nodes.
- Display file-level import relationships as directed edges.
- Automatically arrange the initial graph using Dagre.
- Pan across the canvas and zoom into different sections.
- Drag individual file nodes to reposition them.
- Move folder groups and their contained files.
- Focus on a selected file or fit the complete graph into view.

### Folder-Based Visualization

- Group files by directory.
- Assign consistent accent colours to folder groups.
- Apply matching colours to the corresponding file nodes.
- Display folder-level file counts.
- Use a visual legend to distinguish directories and dependency connections.

### File Inspector

Select a file to inspect its available information, including:

- File name and repository path.
- Parent directory.
- Outgoing imports.
- Incoming imports.
- Connections to other files in the graph.

### Search and Navigation

- Filter files by name or path.
- Switch between graph and repository file views.
- Open the architecture graph in fullscreen mode.
- Use zoom, fit-to-view, and selected-node navigation controls.
- Switch between dark and light themes.

### Repository Metrics

Display scan statistics such as:

- Number of Python files scanned.
- Number of discovered graph nodes.
- Number of dependency edges.
- Number of functions and classes when available.
- Number of parsing errors.

---

## Screenshots

Add screenshots of the running application here.

Suggested screenshots:

| Screenshot | Description |
|---|---|
| `screenshots/dashboard.png` | Main dashboard and repository scanning interface |
| `screenshots/architecture-graph.png` | Coloured folder groups and import connections |
| `screenshots/fullscreen-graph.png` | Fullscreen architecture explorer |
| `screenshots/file-inspector.png` | Selected-file dependency inspection |

Once these images exist in your repository, embed them using Markdown:

```markdown
![Architecture Graph](screenshots/architecture-graph.png)
```

---

## Architecture

Codebase X-Ray follows a frontend/backend architecture.

```text
                     CODEBASE X-RAY
                            |
             +--------------+--------------+
             |                             |
       React Frontend                FastAPI Backend
             |                             |
       User Interface              Repository Scanner
             |                             |
       React Flow Graph             Python AST Analysis
             |                             |
       File Inspector               Import Extraction
             |                             |
       Graph Navigation             Repository Results
             |                             |
             +-------------+---------------+
                           |
                   Dependency Graph
```

### Frontend

The frontend provides the repository input interface, scan controls, metrics, interactive graph, folder grouping, search, and file inspector.

It communicates with the backend through HTTP requests.

### Backend

The backend exposes API endpoints for scanning local and GitHub repositories. It invokes the repository-scanning logic and returns structured results to the frontend.

### Static Analysis

Python's Abstract Syntax Tree (AST) facilities can be used to inspect Python source code without executing it. The scanner extracts information from source files and uses the available relationships to construct the dependency graph.

### Graph Layout

Dagre calculates an initial left-to-right graph layout. React Flow renders the resulting nodes and edges and provides interactive navigation.

---

## Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React | User interface |
| Build tool | Vite | Frontend development server and build |
| Graph visualization | React Flow | Interactive nodes and connections |
| Graph layout | Dagre | Automatic graph positioning |
| Icons | Lucide React | Interface icons |
| Backend | FastAPI | HTTP API |
| Server | Uvicorn | ASGI application server |
| Static analysis | Python AST | Python source inspection |
| Data format | JSON | Frontend/backend communication |

---

## Project Structure

The project is organized into separate frontend and backend components.

```text
codebase_XRay/
├── backend/
│   ├── app.py
│   ├── scanner.py
│   ├── test_scanner.py
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── ...
│   ├── package.json
│   ├── index.html
│   └── vite.config.js
├── README.md
└── ...
```

The exact backend filenames may vary depending on the current implementation.

- `backend/` contains the API and repository-scanning logic.
- `frontend/src/` contains the React interface and graph components.
- `README.md` documents setup, usage, and development.

---

## Prerequisites

Install the following before running the project:

- Python 3.10 or a compatible version supported by the backend dependencies.
- Node.js and npm.
- Git, if you want to clone the project or scan GitHub repositories.
- A terminal and a code editor.

Check your installed versions:

```bash
python3 --version
node --version
npm --version
git --version
```

---

## Installation

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd codebase_XRay
```

Replace `<YOUR_REPOSITORY_URL>` with the URL of your Codebase X-Ray GitHub repository.

### 2. Set up the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

Install the backend dependencies from the project's dependency file, if present:

```bash
pip install -r requirements.txt
```

If the project does not yet contain `requirements.txt`, install the packages declared or imported by the current backend implementation. At minimum, the application uses FastAPI and Uvicorn.

```bash
pip install fastapi uvicorn
```

Return to the project root when finished:

```bash
cd ..
```

### 3. Set up the frontend

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

The project uses React Flow, Dagre, and Lucide React. If these are not already listed in `package.json`, install them:

```bash
npm install @xyflow/react @dagrejs/dagre lucide-react
```

---

## Running the Application

Run the backend and frontend in separate terminals.

### Terminal 1: Start the backend

From the project root:

```bash
cd backend
source .venv/bin/activate
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

The backend should be accessible at:

- API base URL: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

These commands assume that the FastAPI instance is named `app` in `backend/app.py`.

### Terminal 2: Start the frontend

```bash
cd frontend
npm run dev
```

Open the local development URL printed by Vite, typically:

`http://localhost:5173`

Keep both development servers running while using the application.

---

## Using Codebase X-Ray

### 1. Select a repository source

Choose one of the available scanning modes:

- **GitHub URL:** enter the URL of a public GitHub repository.
- **Local path:** enter the absolute path to a repository on the machine running the backend.

### 2. Start the scan

Click the scan button. The frontend sends a request to the FastAPI backend.

After a successful scan, repository metrics and the architecture graph are populated with the returned data.

### 3. Explore the graph

- Drag the empty canvas to pan.
- Scroll to zoom.
- Drag file nodes to reposition them.
- Drag a folder group to move its contained files.
- Select a file to open its inspector.
- Search by file name or path.
- Use **Fit All** to bring the graph into view.
- Open fullscreen mode for a larger workspace.

### 4. Follow dependencies

Import edges represent relationships between source files. The arrow indicates the direction of the dependency represented by the scanner.

Use the file inspector to review the selected file's incoming and outgoing relationships.

### 5. Review scan metrics

Use the dashboard metrics to understand the size of the scanned repository and the number of relationships and parsing errors detected.

---

## API Reference

The frontend communicates with the backend at:

`http://127.0.0.1:8000`

The following endpoints are used by the current frontend.

### Scan a local repository

`POST /api/scan`

Example request:

```json
{
  "path": "/absolute/path/to/repository"
}
```

Example cURL command:

```bash
curl -X POST http://127.0.0.1:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"path": "/absolute/path/to/repository"}'
```

### Scan a GitHub repository

`POST /api/scan/github`

Example request:

```json
{
  "url": "https://github.com/owner/repository"
}
```

Example cURL command:

```bash
curl -X POST http://127.0.0.1:8000/api/scan/github \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/owner/repository"}'
```

### API documentation

FastAPI's interactive documentation is available at:

`http://127.0.0.1:8000/docs`

The exact response schema depends on the current scanner implementation. The frontend expects repository node and edge information alongside statistics where those fields are provided.

---

## How It Works

### 1. Repository discovery

The scanner receives a repository path or GitHub URL and obtains the source files available for analysis.

### 2. Source inspection

Python files are inspected to extract structural information. AST-based analysis can identify definitions and import statements without executing the source code.

### 3. Dependency extraction

The scanner identifies import relationships between files where it can resolve the corresponding modules. Unresolved imports may occur with external packages, dynamic imports, or incomplete module resolution.

### 4. Graph construction

The backend returns structured node and edge data. The frontend converts the results into graph elements and groups files by directory.

### 5. Automatic layout

Dagre calculates initial positions for file nodes and the frontend creates folder regions around the files in each directory.

### 6. Interactive exploration

React Flow renders the graph and enables users to pan, zoom, select files, and reposition graph elements.

---

## Current Limitations

Codebase X-Ray is an evolving project. Its current scope should be distinguished from features that may be introduced later.

- The current analysis focuses on Python repositories.
- Static analysis cannot reliably determine every runtime dependency.
- Dynamic imports and complex module resolution may not be fully represented.
- Unresolved imports do not necessarily indicate errors in the source code.
- Dependency edges are only as complete as the relationships detected by the scanner.
- Graph readability may decrease for very large repositories.
- GitHub scanning currently depends on the backend's repository retrieval implementation and network access.
- A static dependency graph is not a complete security audit and does not prove that a repository is safe or vulnerable.

---

## Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run the relevant tests and verify the application locally.
5. Submit a pull request describing the change.

For significant changes, open an issue first to discuss the proposed implementation.

---

## License

No license has been specified here. Add a `LICENSE` file and update this section once the project's licensing terms have been decided.

---

## Author

**Sreevatsa Rajesh**

Mathematics and Computing undergraduate interested in software development, static analysis, machine learning, and cybersecurity.

---

<p align="center">
  <strong>CODEBASE X-RAY</strong><br />
  <sub>Make complex codebases easier to see and understand.</sub>
</p>
