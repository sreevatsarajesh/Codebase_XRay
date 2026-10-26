
import io
import json
import os
import re
import tempfile
import zipfile
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from scanner import scan_repository

app = FastAPI(title="Codebase X-Ray API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://codebase-xray-1.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_ARCHIVE_BYTES = 30 * 1024 * 1024
MAX_FILES = 2000
MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_TOTAL_EXTRACTED_BYTES = 100 * 1024 * 1024
MAX_ZIP_ENTRIES = 5000

GITHUB_URL_PATTERN = re.compile(
    r"^https?://github\.com/([A-Za-z0-9-]+)/([A-Za-z0-9_.-]+)/?$"
)


class ScanRequest(BaseModel):
    path: str = Field(min_length=1, max_length=4096)


class GitHubScanRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


def github_request(url: str, limit: int | None = None) -> bytes:
    request = Request(
        url,
        headers={
            "User-Agent": "Codebase-X-Ray",
            "Accept": "application/vnd.github+json",
        },
    )

    try:
        with urlopen(request, timeout=20) as response:
            data = response.read() if limit is None else response.read(limit + 1)

            if limit is not None and len(data) > limit:
                raise HTTPException(
                    status_code=413,
                    detail="Repository archive exceeds the 30 MB download limit.",
                )

            return data

    except HTTPException:
        raise

    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:500]

        if exc.code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"GitHub repository or archive not found: {body}",
            ) from exc

        if exc.code == 403:
            raise HTTPException(
                status_code=429,
                detail=f"GitHub denied the request or rate limit was reached: {body}",
            ) from exc

        raise HTTPException(
            status_code=502,
            detail=f"GitHub returned HTTP {exc.code}: {body}",
        ) from exc

    except (URLError, TimeoutError, OSError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not retrieve the repository from GitHub: {exc}",
        ) from exc


def download_github_repository(url: str, destination: Path) -> dict:
    match = GITHUB_URL_PATTERN.fullmatch(url.strip())

    if not match:
        raise HTTPException(
            status_code=400,
            detail="Enter a GitHub repository URL such as https://github.com/psf/requests.",
        )

    owner, repository = match.groups()
    repository = repository.removesuffix(".git")

    if repository in {"", ".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid repository name.")

    metadata_url = (
        f"https://api.github.com/repos/{quote(owner, safe='')}/"
        f"{quote(repository, safe='')}"
    )

    try:
        metadata = json.loads(github_request(metadata_url))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail="GitHub returned invalid repository metadata.",
        ) from exc

    if metadata.get("private"):
        raise HTTPException(
            status_code=403,
            detail="Private repositories are not supported.",
        )

    branch = metadata.get("default_branch")

    if not isinstance(branch, str) or not branch:
        raise HTTPException(
            status_code=502,
            detail="Could not determine the repository's default branch.",
        )

    archive_url = (
        f"https://codeload.github.com/{quote(owner, safe='')}/"
        f"{quote(repository, safe='')}/zip/refs/heads/{quote(branch, safe='')}"
    )

    archive_bytes = github_request(archive_url, MAX_ARCHIVE_BYTES)

    try:
        archive = zipfile.ZipFile(io.BytesIO(archive_bytes))
    except zipfile.BadZipFile as exc:
        raise HTTPException(
            status_code=502,
            detail="GitHub returned an invalid repository archive.",
        ) from exc

    extracted_count = 0
    extracted_bytes = 0

    with archive:
        members = archive.infolist()

        if len(members) > MAX_FILES * 4:
            raise HTTPException(
                status_code=413,
                detail="Repository archive contains too many entries.",
            )

        for member in members:
            if member.is_dir():
                continue

            parts = Path(member.filename).parts

            if len(parts) < 2:
                continue

            relative_path = Path(*parts[1:])

            if (
                relative_path.is_absolute()
                or ".." in relative_path.parts
                or relative_path.suffix.lower() != ".py"
            ):
                continue

            if member.file_size > MAX_FILE_BYTES:
                continue

            if extracted_count >= MAX_FILES:
                raise HTTPException(
                    status_code=413,
                    detail="Repository contains more than 2,000 Python files.",
                )

            if extracted_bytes + member.file_size > MAX_TOTAL_EXTRACTED_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail="Python source exceeds the 100 MB extraction limit.",
                )

            target = (destination / relative_path).resolve()

            if not target.is_relative_to(destination.resolve()):
                continue

            target.parent.mkdir(parents=True, exist_ok=True)

            with archive.open(member) as source:
                content = source.read(MAX_FILE_BYTES + 1)

            if len(content) > MAX_FILE_BYTES:
                continue

            target.write_bytes(content)
            extracted_count += 1
            extracted_bytes += len(content)

    if extracted_count == 0:
        raise HTTPException(
            status_code=422,
            detail="No eligible Python files were found in this repository.",
        )

    return {
        "repository": f"{owner}/{repository}",
        "branch": branch,
        "python_files_downloaded": extracted_count,
    }


@app.post("/api/scan/upload")
async def scan_uploaded_zip(file: UploadFile = File(...)):
    filename = (file.filename or "").strip()

    if not filename.lower().endswith(".zip"):
        await file.close()
        raise HTTPException(status_code=400, detail="Upload a ZIP archive.")

    try:
        archive_bytes = await file.read(MAX_ARCHIVE_BYTES + 1)
    finally:
        await file.close()

    if len(archive_bytes) > MAX_ARCHIVE_BYTES:
        raise HTTPException(status_code=413, detail="ZIP upload exceeds the 30 MB limit.")

    try:
        archive = zipfile.ZipFile(io.BytesIO(archive_bytes))
    except (zipfile.BadZipFile, OSError) as exc:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid ZIP archive.") from exc

    with tempfile.TemporaryDirectory(prefix="codebase-xray-upload-") as temp_dir:
        extraction_root = Path(temp_dir).resolve()
        extracted_files = 0
        extracted_bytes = 0

        with archive:
            members = archive.infolist()

            if len(members) > MAX_ZIP_ENTRIES:
                raise HTTPException(status_code=413, detail="ZIP contains too many entries.")

            for member in members:
                if member.is_dir():
                    continue

                raw_name = member.filename
                normalized = raw_name.replace("\\", "/")
                parts = normalized.split("/")

                if (
                    normalized.startswith("/")
                    or any(part in {"", ".", ".."} for part in parts)
                    or (len(normalized) > 1 and normalized[1] == ":")
                ):
                    raise HTTPException(status_code=400, detail="ZIP contains an unsafe file path.")

                unix_mode = (member.external_attr >> 16) & 0o170000
                if unix_mode == 0o120000:
                    raise HTTPException(status_code=400, detail="ZIP symlinks are not allowed.")

                relative_path = Path(*parts)
                if relative_path.suffix.lower() != ".py":
                    continue

                if member.file_size > MAX_FILE_BYTES:
                    continue

                if extracted_files >= MAX_FILES:
                    raise HTTPException(status_code=413, detail="ZIP contains too many Python files.")

                if member.file_size < 0 or extracted_bytes + member.file_size > MAX_TOTAL_EXTRACTED_BYTES:
                    raise HTTPException(status_code=413, detail="Extracted Python source exceeds the 100 MB limit.")

                destination = (extraction_root / relative_path).resolve()
                if not destination.is_relative_to(extraction_root):
                    raise HTTPException(status_code=400, detail="ZIP contains an unsafe file path.")

                destination.parent.mkdir(parents=True, exist_ok=True)

                try:
                    with archive.open(member) as source:
                        content = source.read(MAX_FILE_BYTES + 1)
                except (RuntimeError, zipfile.BadZipFile, OSError) as exc:
                    raise HTTPException(status_code=400, detail="Could not read a file in the ZIP archive.") from exc

                if len(content) > MAX_FILE_BYTES:
                    continue

                destination.write_bytes(content)
                extracted_files += 1
                extracted_bytes += len(content)

        if extracted_files == 0:
            raise HTTPException(
                status_code=422,
                detail="No Python source files were found in the ZIP archive.",
            )

        scan_root = extraction_root
        top_level = list(extraction_root.iterdir())
        if len(top_level) == 1 and top_level[0].is_dir():
            scan_root = top_level[0]

        try:
            result = scan_repository(str(scan_root))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Uploaded repository scan failed: {exc}") from exc

        result["source"] = "upload"
        result["repository_info"] = {
            "filename": Path(filename).name,
            "python_files_extracted": extracted_files,
        }
        return result


@app.get("/")
def root():
    return {"message": "Codebase X-Ray API is running"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/scan")
def scan_local_repository(request: ScanRequest):
    repo_path = Path(os.path.expanduser(request.path)).resolve()

    if not repo_path.exists() or not repo_path.is_dir():
        raise HTTPException(
            status_code=400,
            detail="The supplied path is not an accessible directory.",
        )

    try:
        return scan_repository(str(repo_path))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Repository scan failed: {exc}",
        ) from exc


@app.post("/api/scan/github")
def scan_github_repository(request: GitHubScanRequest):
    with tempfile.TemporaryDirectory(prefix="codebase-xray-") as temp_dir:
        temp_path = Path(temp_dir)

        repository_info = download_github_repository(
            request.url,
            temp_path,
        )

        try:
            result = scan_repository(str(temp_path))
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Downloaded repository scan failed: {exc}",
            ) from exc

        result["source"] = "github"
        result["repository_info"] = repository_info

        return result
