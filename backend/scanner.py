import os
import ast
def scan_repository(path):
    nodes = []
    edges = []
    errors = []
    imports = []
    unresolved_imports = []
    files_scanned = 0
    if not os.path.exists(path):
        raise FileNotFoundError("Repo path does not exist")
    if not os.path.isdir(path):
        raise NotADirectoryError("The provided path is not a directory")
    path = os.path.abspath(path)
    print("Repository path is valid")
    dir_ignore = {".git", ".venv", "node_modules", "__pycache__", "venv"}
    python_files = set()
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
                    "file": os.path.relpath(file_path, path),
                    "error": str(e)
                })
                continue
            relative_path = os.path.relpath(file_path, path)
            relative_path = os.path.normpath(relative_path)
            python_files.add(relative_path)
            nodes.append({
                "id": relative_path,
                "label": os.path.basename(file_path),
                "type": "file",
                "path": relative_path
            })
            files_scanned += 1
            for item in ast.walk(tree):
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    nodes.append({
                        "id": f"{relative_path}::{item.name}",
                        "label": item.name,
                        "type": "function",
                        "path": relative_path,
                        "line": item.lineno
                    })
                elif isinstance(item, ast.ClassDef):
                    nodes.append({
                        "id": f"{relative_path}::{item.name}",
                        "label": item.name,
                        "type": "class",
                        "path": relative_path,
                        "line": item.lineno
                    })
                elif isinstance(item, ast.Import):
                    for alias in item.names:
                        imports.append({
                            "source": relative_path,
                            "module": alias.name,
                            "names": [],
                            "level": 0,
                            "line": item.lineno
                        })
                elif isinstance(item, ast.ImportFrom):
                    imports.append({
                        "source": relative_path,
                        "module": item.module,
                        "names": [alias.name for alias in item.names],
                        "level": item.level,
                        "line": item.lineno
                    })
    def find_module_file(module, source, level=0):
        source_dir = os.path.dirname(source)
        if level > 0:
            base_dir = source_dir
            for _ in range(level - 1):
                base_dir = os.path.dirname(base_dir)
            if module:
                module_path = module.replace(".", os.sep)
                base_dir = os.path.join(base_dir, module_path)
            candidates = [
                base_dir + ".py",
                os.path.join(base_dir, "__init__.py")
            ]
            for candidate in candidates:
                candidate = os.path.normpath(candidate)
                if candidate in python_files:
                    return candidate
            return None
        if not module:
            return None
        module_path = module.replace(".", os.sep)
        candidate_bases = [
            os.path.join(source_dir, module_path),
            module_path
        ]
        for base in candidate_bases:
            candidates = [
                base + ".py",
                os.path.join(base, "__init__.py")
            ]
            for candidate in candidates:
                candidate = os.path.normpath(candidate)

                if candidate in python_files:
                    return candidate
        return None
    for import_info in imports:
        source = import_info["source"]
        module = import_info["module"]
        level = import_info["level"]
        target = find_module_file(module, source, level)
        if target is None and module is None and level > 0:
            for name in import_info["names"]:
                if name == "*":
                    continue
                target = find_module_file(name, source, level)
                if target is not None:
                    break
        if target is None and module:
            for name in import_info["names"]:
                if name == "*":
                    continue
                combined_module = f"{module}.{name}"
                target = find_module_file(combined_module, source, level)
                if target is not None:
                    break
        if target is not None and source != target:
            edges.append({
                "source": source,
                "target": target,
                "type": "imports",
                "module": module,
                "line": import_info["line"]
            })
        else:
            unresolved_imports.append(import_info)
    return {
        "nodes": nodes,
        "edges": edges,
        "imports": imports,
        "unresolved_imports": unresolved_imports,
        "errors": errors,
        "statistics": {
            "files_scanned": files_scanned,
            "nodes_found": len(nodes),
            "imports_found": len(imports),
            "edges_found": len(edges),
            "unresolved_imports_count": len(unresolved_imports),
            "errors_count": len(errors)
        }
    }
