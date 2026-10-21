# Codebase X-Ray

### See the structure. Trace the dependencies. Understand the codebase.

Codebase X-Ray is a static code intelligence and repository visualization tool that scans Python repositories, extracts structural information, identifies import relationships, and renders an interactive architecture graph.

Instead of manually navigating files and imports, developers can explore a repository visually, inspect individual files, and understand how different parts of a codebase connect.

<p align="center">
  <img src="screenshots/architecture-graph.png" alt="Codebase X-Ray architecture graph" width="100%">
</p>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Limitations](#limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Understanding an unfamiliar codebase can be time-consuming. Files are distributed across directories, dependencies are not always obvious, and tracing relationships manually can slow down development.

Codebase X-Ray addresses this problem by turning repository structure into an interactive visual graph.

**The workflow:**

`Repository → Static Analysis → Dependency Graph → Interactive Exploration`

The application consists of a FastAPI backend that analyzes Python repositories and a React frontend that visualizes the results using React Flow.

## Features

### Repository Scanning
- Scan local repositories using a filesystem path.
- Scan public GitHub repositories using their URLs.
- Discover Python source files.
- Extract structural information and import relationships.
- Report repository statistics and parsing errors.

### Interactive Architecture Graph
- Visualize Python files as graph nodes.
- Represent file-level imports as directed edges.
- Automatically arrange the graph using Dagre.
- Pan, zoom, and reposition graph nodes.
- Group files by directory.
- Move folder groups and their contained files.
- Inspect incoming and outgoing dependencies.

### Code Exploration
- Search files by name or path.
- Switch between graph and repository file views.
- Inspect individual files and their relationships.
- Open the graph in fullscreen mode.
- Switch between light and dark themes.

### Repository Metrics
- Python files scanned.
- Graph nodes discovered.
- Dependency edges identified.
- Functions and classes detected, where available.
- Parsing errors reported.

## Technology Stack

| Technology | Purpose |
|---|---|
| Python | Source-code analysis |
| Python AST | Static source inspection |
| FastAPI | Backend API |
| Uvicorn | ASGI server |
| React | Frontend interface |
| Vite | Frontend development and build |
| React Flow | Interactive graph visualization |
| Dagre | Automatic graph layout |
| Lucide React | Interface icons |

## Architecture

```text
                   CODEBASE X-RAY
                         |
              +----------+----------+
              |                     |
        React Frontend         FastAPI Backend
              |                     |
        React Flow Graph       Repository Scanner
              |                     |
        File Inspector          Python AST
              |                     |
        Graph Navigation       Import Extraction
              |                     |
              +----------+----------+
                         |
                  Dependency Graph
```

The frontend communicates with the backend through HTTP requests. The backend scans the selected repository and returns structured data that the frontend converts into an interactive graph.

## Project Structure

```text
codebase_XRay/
├── backend/
│   ├── app.py
│   ├── scanner.py
│   ├── test_scanner.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── footer.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
├── .gitattributes
├── .gitignore
├── LICENSE
└── README.md
```

> This tree represents the main files shown in the current project structure. Local virtual environments, `node_modules`, and generated files are excluded from version control.

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Python 3.10 or a compatible version supported by the project dependencies.
- Node.js and npm.
- Git.

Verify your installations:

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

### 3. Set up the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
```

## Running the Application

Run the backend and frontend in separate terminals.

### Terminal 1 — Backend

From the project root:

```bash
cd backend
source .venv/bin/activate
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

The backend API will be available at:

- API: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs

### Terminal 2 — Frontend

From the project root:

```bash
cd frontend
npm run dev
```

Open the local URL printed by Vite, typically:

http://localhost:5173

Keep both servers running while using the application.

## Usage

1. Start the backend and frontend.
2. Open the frontend in your browser.
3. Select GitHub scanning or local repository scanning.
4. Enter a public GitHub repository URL or a local path accessible to the backend.
5. Start the scan.
6. Explore the generated dependency graph and repository metrics.
7. Select files to inspect their relationships.
8. Use search, folder grouping, zoom, and fullscreen controls to navigate the graph.

## API Reference

The backend exposes the following scanning endpoints.

### Scan a local repository

`POST /api/scan`

Example request:

```json
{
  "path": "/absolute/path/to/repository"
}
```

Example command:

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

Example command:

```bash
curl -X POST http://127.0.0.1:8000/api/scan/github \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/owner/repository"}'
```

Interactive API documentation is available at:

http://127.0.0.1:8000/docs

## Limitations

- Analysis currently focuses on Python repositories.
- Dynamic imports and complex module resolution may not be fully represented.
- Unresolved imports do not necessarily indicate errors.
- Static analysis cannot identify every runtime dependency.
- Graph readability may decrease for large repositories.
- GitHub scanning depends on network access and the backend's repository retrieval implementation.
- Codebase X-Ray is a code exploration tool, not a complete security scanner or proof that code is safe.

## Roadmap

Potential future improvements include:

- More accurate import resolution.
- Additional code relationship analysis.
- Better graph layouts for large repositories.
- Expanded repository metrics.
- Additional automated tests.
- Improved usability and documentation.

## Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Run the relevant tests.
5. Submit a pull request describing your changes.

For significant changes, consider opening an issue before implementing the feature.

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.

## Author

**Sreevatsa Rajesh**

Mathematics and Computing undergraduate interested in software development, static analysis, machine learning, and cybersecurity.

---

<p align="center">
  <strong>Codebase X-Ray</strong><br>
  <sub>Make complex codebases easier to see and understand.</sub>
</p>