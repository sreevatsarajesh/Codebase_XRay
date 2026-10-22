import os
import ast


def scan_repository(path):
    nodes = []
    edges = []
    errors = []
    imports = []
    unresolved_imports = []
    files_scanned = 0
    python_files = set()
    file_trees = {}
    function_definitions = {}
    function_calls = []

    if not os.path.exists(path):
        raise FileNotFoundError("Repo path does not exist")
    if not os.path.isdir(path):
        raise NotADirectoryError("The provided path is not a directory")

    path = os.path.abspath(path)

    dir_ignore = {".git", ".venv", "node_modules", "__pycache__", "venv"}

    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in dir_ignore]

        for file in files:
            if not file.endswith(".py"):
                continue

            file_path = os.path.join(root, file)
            relative_path = os.path.normpath(os.path.relpath(file_path, path))

            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    source_code = f.read()

                tree = ast.parse(source_code, filename=file_path)

            except (SyntaxError, UnicodeDecodeError, OSError) as e:
                errors.append({
                    "file": relative_path,
                    "error": str(e)
                })
                continue

            python_files.add(relative_path)
            file_trees[relative_path] = tree
            files_scanned += 1

            nodes.append({
                "id": relative_path,
                "label": os.path.basename(file_path),
                "type": "file",
                "path": relative_path
            })

            class_stack = []
            function_stack = []

            for item in ast.walk(tree):
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    function_id = f"{relative_path}::{item.name}"

                    nodes.append({
                        "id": function_id,
                        "label": item.name,
                        "type": "function",
                        "path": relative_path,
                        "line": item.lineno
                    })

                    function_definitions.setdefault(item.name, []).append({
                        "id": function_id,
                        "file": relative_path,
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

            for item in ast.walk(tree):
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    for child in ast.walk(item):
                        if isinstance(child, ast.Call):
                            if isinstance(child.func, ast.Name):
                                function_calls.append({
                                    "source_file": relative_path,
                                    "caller": f"{relative_path}::{item.name}",
                                    "target_name": child.func.id,
                                    "line": child.lineno
                                })

                            elif isinstance(child.func, ast.Attribute):
                                function_calls.append({
                                    "source_file": relative_path,
                                    "caller": f"{relative_path}::{item.name}",
                                    "target_name": child.func.attr,
                                    "line": child.lineno
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

    import_targets = {}

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

        if target is not None:
            import_targets.setdefault(source, []).append({
                "target": target,
                "module": module,
                "names": import_info["names"]
            })

            if source != target:
                edges.append({
                    "source": source,
                    "target": target,
                    "type": "imports",
                    "module": module,
                    "line": import_info["line"]
                })
        else:
            unresolved_imports.append(import_info)

    for call in function_calls:
        target_name = call["target_name"]
        source_file = call["source_file"]
        possible_targets = function_definitions.get(target_name, [])

        if not possible_targets:
            continue

        local_targets = [
            target for target in possible_targets
            if target["file"] == source_file
        ]

        if len(local_targets) == 1:
            target = local_targets[0]

            if call["caller"] != target["id"]:
                edges.append({
                    "source": call["caller"],
                    "target": target["id"],
                    "type": "calls",
                    "line": call["line"]
                })

            continue

        imported_targets = []

        for import_info in import_targets.get(source_file, []):
            for name in import_info["names"]:
                if name == target_name:
                    imported_targets.extend([
                        target for target in possible_targets
                        if target["file"] == import_info["target"]
                    ])

        imported_targets = list({
            target["id"]: target for target in imported_targets
        }.values())

        if len(imported_targets) == 1:
            target = imported_targets[0]

            if call["caller"] != target["id"]:
                edges.append({
                    "source": call["caller"],
                    "target": target["id"],
                    "type": "calls",
                    "line": call["line"]
                })

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
            "errors_count": len(errors),
            "function_calls_found": sum(
                1 for edge in edges if edge["type"] == "calls"
            )
        }
    }