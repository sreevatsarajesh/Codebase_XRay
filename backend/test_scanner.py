
import os
import tempfile
from scanner import scan_repository


def test_scan_repository():
    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = os.path.join(temp_dir, "example.py")

        with open(file_path, "w", encoding="utf-8") as file:
            file.write(
                "def first():\n"
                "    second()\n"
                "\n"
                "def second():\n"
                "    return 42\n"
            )

        result = scan_repository(temp_dir)

        assert result["statistics"]["files_scanned"] == 1
        assert any(node["type"] == "function" and node["label"] == "first" for node in result["nodes"])
        assert any(node["type"] == "function" and node["label"] == "second" for node in result["nodes"])
        assert any(
            edge["type"] == "calls"
            for edge in result["edges"]
        )
