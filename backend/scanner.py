import ast
import os
import re
from collections import defaultdict

DATABASE_FILE_PATTERN = re.compile(
    r"(^|[/\\])(database|databases|db|db_config|db_connection|database_config|database_connection|connection|session)(\.py|[/\\]|$)",
    re.IGNORECASE,
)

DATABASE_IMPORTS = {
    "sqlite3", "psycopg", "psycopg2", "asyncpg", "pymysql", "mysql",
    "mysql.connector", "MySQLdb", "sqlalchemy", "databases", "aiomysql",
    "aiosqlite", "motor", "pymongo", "redis", "cx_Oracle", "oracledb", "pyodbc",
}

DATABASE_CALLS = {
    "connect", "create_engine", "sessionmaker", "AsyncSession", "Session",
    "cursor", "execute", "executemany", "fetchone", "fetchall", "commit",
    "rollback", "add", "add_all", "flush", "query", "insert", "update",
    "delete", "select",
}


def scan_repository(path):
    if not os.path.exists(path):
        raise FileNotFoundError("Repo path does not exist")
    if not os.path.isdir(path):
        raise NotADirectoryError("The provided path is not a directory")

    path = os.path.abspath(path)
    dir_ignore = {".git", ".venv", "node_modules", "__pycache__", "venv", ".tox", ".mypy_cache", ".pytest_cache"}
    nodes = []
    edges = []
    errors = []
    imports = []
    unresolved_imports = []
    python_files = set()
    file_trees = {}
    source_codes = {}
    database_usage = {}
    database_files = set()
    function_definitions = defaultdict(list)
    function_calls = []
    file_function_defs = defaultdict(list)

    for root, dirs, files in os.walk(path):
        dirs[:] = [directory for directory in dirs if directory not in dir_ignore]
        for filename in files:
            if not filename.endswith(".py"):
                continue
            absolute_file = os.path.join(root, filename)
            relative_path = os.path.normpath(os.path.relpath(absolute_file, path))
            try:
                with open(absolute_file, "r", encoding="utf-8") as stream:
                    source_code = stream.read()
                tree = ast.parse(source_code, filename=absolute_file)
            except (SyntaxError, UnicodeDecodeError, OSError) as error:
                errors.append({"file": relative_path, "error": str(error)})
                continue

            python_files.add(relative_path)
            file_trees[relative_path] = tree
            source_codes[relative_path] = source_code
            database_reasons = set()
            database_import_names = set()
            if DATABASE_FILE_PATTERN.search(relative_path):
                database_reasons.add("database_module")

            for item in ast.walk(tree):
                if isinstance(item, ast.Import):
                    for alias in item.names:
                        imports.append({
                            "source": relative_path,
                            "module": alias.name,
                            "names": [],
                            "aliases": [],
                            "level": 0,
                            "line": item.lineno,
                            "kind": "import",
                        })
                        if any(alias.name == name or alias.name.startswith(name + ".") for name in DATABASE_IMPORTS):
                            database_import_names.add(alias.name)
                            database_reasons.add("database_library")
                elif isinstance(item, ast.ImportFrom):
                    aliases = [{"name": alias.name, "asname": alias.asname} for alias in item.names]
                    imports.append({
                        "source": relative_path,
                        "module": item.module,
                        "names": [alias.name for alias in item.names],
                        "aliases": aliases,
                        "level": item.level,
                        "line": item.lineno,
                        "kind": "from",
                    })
                    if item.module and any(item.module == name or item.module.startswith(name + ".") for name in DATABASE_IMPORTS):
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

            if re.search(r"\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b", source_code, re.IGNORECASE):
                database_reasons.add("sql_statement")
            if database_reasons:
                database_files.add(relative_path)
                database_usage[relative_path] = {"reasons": sorted(database_reasons), "libraries": sorted(database_import_names)}

            nodes.append({
                "id": relative_path,
                "label": os.path.basename(relative_path),
                "type": "file",
                "path": relative_path,
                "database_related": bool(database_reasons),
                "database_reasons": sorted(database_reasons),
            })

            for item in ast.walk(tree):
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    function_id = f"{relative_path}::{item.name}"
                    definition = {"id": function_id, "file": relative_path, "line": item.lineno}
                    function_definitions[item.name].append(definition)
                    file_function_defs[relative_path].append({**definition, "name": item.name})
                    nodes.append({"id": function_id, "label": item.name, "type": "function", "path": relative_path, "line": item.lineno})
                elif isinstance(item, ast.ClassDef):
                    nodes.append({"id": f"{relative_path}::{item.name}", "label": item.name, "type": "class", "path": relative_path, "line": item.lineno})

            for item in ast.walk(tree):
                if not isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                for child in ast.walk(item):
                    if not isinstance(child, ast.Call):
                        continue
                    if isinstance(child.func, ast.Name):
                        target_name = child.func.id
                        call_kind = "name"
                    elif isinstance(child.func, ast.Attribute):
                        target_name = child.func.attr
                        call_kind = "attribute"
                    else:
                        continue
                    function_calls.append({
                        "source_file": relative_path,
                        "caller": f"{relative_path}::{item.name}",
                        "target_name": target_name,
                        "line": child.lineno,
                        "call_kind": call_kind,
                    })

    def normalized_candidate(module_path):
        candidate = os.path.normpath(module_path)
        if candidate in python_files:
            return candidate
        for suffix in (candidate + ".py", os.path.join(candidate, "__init__.py")):
            suffix = os.path.normpath(suffix)
            if suffix in python_files:
                return suffix
        return None

    module_index = defaultdict(set)
    for relative_path in python_files:
        no_ext = relative_path[:-3] if relative_path.endswith(".py") else relative_path
        parts = no_ext.replace("\\", "/").split("/")
        if parts[-1] == "__init__":
            parts = parts[:-1]
        for index in range(len(parts)):
            module_index[".".join(parts[index:])].add(relative_path)
        module_index[no_ext.replace("/", ".").replace("\\", ".")].add(relative_path)
        if parts:
            module_index[parts[-1]].add(relative_path)

    def find_module_file(module, source, level=0):
        source_dir = os.path.dirname(source)
        candidates = []
        if level > 0:
            base_parts = source_dir.split(os.sep) if source_dir else []
            for _ in range(max(0, level - 1)):
                if base_parts:
                    base_parts.pop()
            base_dir = os.path.join(*base_parts) if base_parts else ""
            if module:
                candidates.append(os.path.join(base_dir, module.replace(".", os.sep)))
            else:
                candidates.append(base_dir)
        elif module:
            module_path = module.replace(".", os.sep)
            candidates.extend([os.path.join(source_dir, module_path), module_path])

        for base in candidates:
            target = normalized_candidate(base)
            if target:
                return target

        if module:
            matches = module_index.get(module, set())
            if len(matches) == 1:
                return next(iter(matches))
            if len(matches) > 1:
                source_parts = source.split(os.sep)[:-1]
                matches = sorted(matches, key=lambda candidate: _common_prefix_length(source_parts, candidate.split(os.sep)[:-1]), reverse=True)
                if len(matches) == 1 or _common_prefix_length(source_parts, matches[0].split(os.sep)[:-1]) > _common_prefix_length(source_parts, matches[1].split(os.sep)[:-1]):
                    return matches[0]
        return None

    import_targets = defaultdict(list)
    import_edge_pairs = set()
    database_edge_pairs = set()

    for import_info in imports:
        source = import_info["source"]
        module = import_info["module"]
        target = find_module_file(module, source, import_info["level"])
        resolved_name = module

        if target is None and import_info["kind"] == "from":
            for name in import_info["names"]:
                if name == "*":
                    continue
                combined_module = f"{module}.{name}" if module else name
                target = find_module_file(combined_module, source, import_info["level"])
                if target:
                    resolved_name = combined_module
                    break

        if target is None:
            unresolved_imports.append(import_info)
            continue

        import_targets[source].append({**import_info, "target": target, "resolved_module": resolved_name})
        if source != target:
            pair = (source, target)
            if pair not in import_edge_pairs:
                edges.append({"source": source, "target": target, "type": "imports", "module": module, "names": import_info["names"], "line": import_info["line"]})
                import_edge_pairs.add(pair)
            if target in database_files and pair not in database_edge_pairs:
                edges.append({"source": source, "target": target, "type": "database", "reason": "import_to_database_module", "confidence": "detected", "module": module, "line": import_info["line"]})
                database_edge_pairs.add(pair)

    for source_file, usage in database_usage.items():
        if not ({"database_operation", "sql_statement"} & set(usage["reasons"])):
            continue
        candidates = [database_file for database_file in sorted(database_files) if database_file != source_file and "database_module" in database_usage.get(database_file, {}).get("reasons", [])]
        imported_candidates = {item["target"] for item in import_targets.get(source_file, []) if item["target"] in candidates}
        targets = sorted(imported_candidates) if imported_candidates else candidates if len(candidates) == 1 else []
        for target in targets:
            pair = (source_file, target)
            if pair in database_edge_pairs:
                continue
            edges.append({"source": source_file, "target": target, "type": "database", "reason": "database_usage", "confidence": "imported" if target in imported_candidates else "inferred"})
            database_edge_pairs.add(pair)

    for call in function_calls:
        source_file = call["source_file"]
        target_name = call["target_name"]
        possible_targets = function_definitions.get(target_name, [])
        local_targets = [target for target in possible_targets if target["file"] == source_file]
        resolved_targets = local_targets if len(local_targets) == 1 else []

        if not resolved_targets:
            imported_targets = []
            for import_info in import_targets.get(source_file, []):
                if import_info["kind"] != "from":
                    continue
                for alias in import_info.get("aliases", []):
                    local_name = alias.get("asname") or alias["name"]
                    if local_name != target_name:
                        continue
                    original_name = alias["name"]
                    imported_targets.extend(target for target in function_definitions.get(original_name, []) if target["file"] == import_info["target"])
            resolved_targets = list({target["id"]: target for target in imported_targets}.values())

        if len(resolved_targets) == 1 and call["caller"] != resolved_targets[0]["id"]:
            target = resolved_targets[0]
            edges.append({"source": call["caller"], "target": target["id"], "type": "calls", "line": call["line"]})

    return {
        "nodes": nodes,
        "edges": edges,
        "imports": imports,
        "unresolved_imports": unresolved_imports,
        "errors": errors,
        "database_usage": database_usage,
        "statistics": {
            "files_scanned": len(python_files),
            "nodes_found": len(nodes),
            "imports_found": len(imports),
            "edges_found": len(edges),
            "unresolved_imports_count": len(unresolved_imports),
            "errors_count": len(errors),
            "function_calls_found": sum(1 for edge in edges if edge["type"] == "calls"),
            "database_related_files": len(database_usage),
            "database_edges_found": sum(1 for edge in edges if edge["type"] == "database"),
        },
    }


def _common_prefix_length(left, right):
    length = 0
    for left_part, right_part in zip(left, right):
        if left_part != right_part:
            break
        length += 1
    return length
