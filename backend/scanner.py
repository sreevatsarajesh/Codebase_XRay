import os
import ast
def scan_repository(path):
    nodes = []
    edges = []
    errors = []
    files_scanned = 0
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
            files_scanned += 1

            for item in ast.walk(tree):
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    function_node = {
                        "id": f"{relative_path}::{item.name}",
                        "label": item.name,
                        "type": "function",
                        "path": relative_path,
                        "line": item.lineno
                    }
                    nodes.append(function_node)

                elif isinstance(item, ast.ClassDef):
                    class_node = {
                        "id": f"{relative_path}::{item.name}",
                        "label": item.name,
                        "type": "class",
                        "path": relative_path,
                        "line": item.lineno
                    }
                    nodes.append(class_node)

    return {
        "nodes": nodes,
        "edges": edges,
        "errors": errors,
        "statistics": {
            "files_scanned": files_scanned,
            "nodes_found": len(nodes),
            "errors_count": len(errors)
        }
    }
