
import os
import ast

def scan_repository(path):
    nodes = []
    edges = []
    errors = []
    if not os.path.exists(path):
        raise FileNotFoundError("Repo path does not exist")
    if not os.path.isdir(path):
        raise NotADirectoryError("The provided path is not a directory")
    print("Repository path is valid")
    dir_ignore = {".git", ".venv", "node_modules", "__pycache__", "venv"}
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in dir_ignore]
        for file in files:
            if not file.endswith(".py"):
                continue
            file_path = os.path.join(root, file)
            print("Scanning:", file_path)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    source_code = f.read()
                tree = ast.parse(source_code, filename=file_path)
            except (SyntaxError, UnicodeDecodeError, OSError) as e:
                errors.append({
                    "file": file_path,
                    "error": str(e)
                })
                continue
            relative_path = os.path.relpath(file_path, path)

            file_node = {
                "id": relative_path,
                "label": os.path.basename(file_path),
                "type": "file",
                "path": relative_path
            }

            nodes.append(file_node)

    return {
        "nodes": nodes,
        "edges": edges,
        "errors": errors,
        "statistics": {
            "files_scanned": len(nodes),
            "errors_count": len(errors)
        }
    }
