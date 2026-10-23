
import os
import ast
import re


DATABASE_FILE_PATTERN = re.compile(
    r"(^|[/\\])("
    r"database|databases|db|db_config|db_connection|"
    r"database_config|database_connection|connection|"
    r"session|"
    r")(\.py|[/\\]|$)",
    re.IGNORECASE
)

DATABASE_IMPORTS = {
    "sqlite3",
    "psycopg",
    "psycopg2",
    "asyncpg",
    "pymysql",
    "mysql",
    "mysql.connector",
    "MySQLdb",
    "sqlalchemy",
    "databases",
    "aiomysql",
    "aiosqlite",
    "motor",
    "pymongo",
    "redis",
    "cx_Oracle",
    "oracledb",
    "pyodbc"
}

DATABASE_CALLS = {
    "connect",
    "create_engine",
    "sessionmaker",
    "AsyncSession",
    "Session",
    "cursor",
    "execute",
    "executemany",
    "fetchone",
    "fetchall",
    "commit",
    "rollback",
    "add",
    "add_all",
    "flush",
    "query",
    "insert",
    "update",
    "delete",
    "select"
}


def scan_repository(path):
    nodes = []
    edges = []
    errors = []
    imports = []
    unresolved_imports = []
    files_scanned = 0
    python_files = set()
    file_trees = {}
    source_codes = {}
    function_definitions = {}
    function_calls = []
    database_files = set()
    database_usage = {}

    if not os.path.exists(path):
        raise FileNotFoundError("Repo path does not exist")
    if not os.path.isdir(path):
        raise NotADirectoryError("The provided path is not a directory")

    path = os.path.abspath(path)

    dir_ignore = {
        ".git",
        ".venv",
        "node_modules",
        "__pycache__",
        "venv",
        ".tox",
        ".mypy_cache"
    }

    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in dir_ignore]

        for file in files:
            if not file.endswith(".py"):
                continue

            file_path = os.path.join(root, file)
            relative_path = os.path.normpath(
                os.path.relpath(file_path, path)
            )

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
            source_codes[relative_path] = source_code
            files_scanned += 1

            database_import_names = set()
            database_reasons = set()

            if DATABASE_FILE_PATTERN.search(relative_path):
                database_reasons.add("database_module")

            for item in ast.walk(tree):
                if isinstance(item, ast.Import):
                    for alias in item.names:
                        imports.append({
                            "source": relative_path,
                            "module": alias.name,
                            "names": [],
                            "level": 0,
                            "line": item.lineno
                        })

                        if any(
                            alias.name == name
                            or alias.name.startswith(name + ".")
                            for name in DATABASE_IMPORTS
                        ):
                            database_import_names.add(alias.name)
                            database_reasons.add("database_library")

                elif isinstance(item, ast.ImportFrom):
                    imports.append({
                        "source": relative_path,
                        "module": item.module,
                        "names": [alias.name for alias in item.names],
                        "level": item.level,
                        "line": item.lineno
                    })

                    if item.module and any(
                        item.module == name
                        or item.module.startswith(name + ".")
                        for name in DATABASE_IMPORTS
                    ):
                        database_import_names.add(item.module)
                        database_reasons.add("database_library")

                elif isinstance(item, ast.Call):
                    if isinstance(item.func, ast.Name):
                        call_name = item.func.id
                    elif isinstance(item.func, ast.Attribute):
                        call_name = item.func.attr
                    else:
                        call_name = ""

                    if call_name in DATABASE_CALLS:
                        database_reasons.add("database_operation")

            if re.search(
                r"\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|"
                r"DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b",
                source_code,
                re.IGNORECASE
            ):
                database_reasons.add("sql_statement")

            if database_reasons:
                database_files.add(relative_path)
                database_usage[relative_path] = {
                    "reasons": sorted(database_reasons),
                    "libraries": sorted(database_import_names)
                }

            nodes.append({
                "id": relative_path,
                "label": os.path.basename(file_path),
                "type": "file",
                "path": relative_path,
                "database_related": bool(database_reasons),
                "database_reasons": sorted(database_reasons)
            })

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

                    function_definitions.setdefault(
                        item.name, []
                    ).append({
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

                elif isinstance(item, ast.FunctionDef):
                    pass

            for item in ast.walk(tree):
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    for child in ast.walk(item):
                        if isinstance(child, ast.Call):
                            if isinstance(child.func, ast.Name):
                                target_name = child.func.id
                            elif isinstance(child.func, ast.Attribute):
                                target_name = child.func.attr
                            else:
                                continue

                            function_calls.append({
                                "source_file": relative_path,
                                "caller": f"{relative_path}::{item.name}",
                                "target_name": target_name,
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
    existing_import_edges = set()

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
                target = find_module_file(
                    combined_module, source, level
                )

                if target is not None:
                    break

        if target is not None:
            import_targets.setdefault(source, []).append({
                "target": target,
                "module": module,
                "names": import_info["names"]
            })

            if source != target:
                edge_type = (
                    "database"
                    if target in database_files
                    else "imports"
                )

                edges.append({
                    "source": source,
                    "target": target,
                    "type": edge_type,
                    "module": module,
                    "line": import_info["line"]
                })

                if edge_type == "database":
                    existing_import_edges.add((source, target))

        else:
            unresolved_imports.append(import_info)

    database_modules = sorted(database_files)

    for source_file, usage in database_usage.items():
        if "database_module" not in usage["reasons"]:
            continue

        for import_info in imports:
            if import_info["source"] == source_file:
                continue

            target = find_module_file(
                import_info["module"],
                import_info["source"],
                import_info["level"]
            )

            if target == source_file:
                existing_import_edges.add(
                    (import_info["source"], source_file)
                )

    for source_file, usage in database_usage.items():
        if "database_operation" not in usage["reasons"] and (
            "sql_statement" not in usage["reasons"]
        ):
            continue

        if source_file in database_files and (
            "database_module" in usage["reasons"]
        ):
            continue

        candidates = [
            database_file
            for database_file in database_modules
            if database_file != source_file
            and "database_module"
            in database_usage.get(database_file, {}).get("reasons", [])
        ]

        imported_database_modules = {
            item["target"]
            for item in import_targets.get(source_file, [])
            if item["target"] in candidates
        }

        targets = (
            sorted(imported_database_modules)
            if imported_database_modules
            else candidates if len(candidates) == 1
            else []
        )

        for target in targets:
            if (source_file, target) in existing_import_edges:
                for edge in edges:
                    if (
                        edge["source"] == source_file
                        and edge["target"] == target
                    ):
                        edge["type"] = "database"
                continue

            edges.append({
                "source": source_file,
                "target": target,
                "type": "database",
                "reason": "database_usage",
                "confidence": (
                    "imported"
                    if target in imported_database_modules
                    else "inferred"
                )
            })

            existing_import_edges.add((source_file, target))

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
        "database_usage": database_usage,
        "statistics": {
            "files_scanned": files_scanned,
            "nodes_found": len(nodes),
            "imports_found": len(imports),
            "edges_found": len(edges),
            "unresolved_imports_count": len(unresolved_imports),
            "errors_count": len(errors),
            "function_calls_found": sum(
                1 for edge in edges if edge["type"] == "calls"
            ),
            "database_related_files": len(database_usage),
            "database_edges_found": sum(
                1 for edge in edges if edge["type"] == "database"
            )
        }
    }
