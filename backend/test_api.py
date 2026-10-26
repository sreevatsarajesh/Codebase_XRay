import io
import sys
import zipfile
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent))
from app import app

client = TestClient(app)


def make_zip(files):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    buffer.seek(0)
    return buffer


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_upload_zip_scans_python_files():
    archive = make_zip({
        "sample_project/main.py": "def main():\n    return helper()\n",
        "sample_project/utils.py": "def helper():\n    return 42\n",
        "sample_project/README.md": "# sample",
    })
    response = client.post(
        "/api/scan/upload",
        files={"file": ("sample.zip", archive, "application/zip")},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["source"] == "upload"
    assert result["repository_info"]["python_files_extracted"] == 2
    assert result["statistics"]["files_scanned"] == 2


def test_upload_rejects_non_zip_filename():
    response = client.post(
        "/api/scan/upload",
        files={"file": ("project.txt", b"not a zip", "text/plain")},
    )
    assert response.status_code == 400


def test_upload_rejects_invalid_zip():
    response = client.post(
        "/api/scan/upload",
        files={"file": ("project.zip", b"not a zip", "application/zip")},
    )
    assert response.status_code == 400


def test_upload_rejects_traversal_path():
    archive = make_zip({"../outside.py": "print('unsafe')"})
    response = client.post(
        "/api/scan/upload",
        files={"file": ("unsafe.zip", archive, "application/zip")},
    )
    assert response.status_code == 400


def test_cors_preflight_for_production_frontend():
    response = client.options(
        "/api/scan/upload",
        headers={
            "Origin": "https://codebase-xray-1.onrender.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://codebase-xray-1.onrender.com"
