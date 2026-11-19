"""Regenerates overlay/lib/demo-fixtures.json from a checkout of the source repo.

Usage: python3 -I gen_fixtures.py <path-to-enterprise-knowledge-ai>
Parses sample_data/ (md, txt, docx, pdf) with the same section rules as
backend/app/ingestion/parsers.py and packs paragraphs into ~300 token chunks
like backend/app/ingestion/chunking.py. Standard library only.
"""
import base64
import json
import re
import sys
import uuid
import zipfile
import zlib
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(__file__).resolve().parent / "overlay" / "lib" / "demo-fixtures.json"
NS = uuid.UUID("6f1c2a52-6a8e-4c7e-9a43-6a1d2f0b7e11")


def ntok(text):
    return int(len(text.split()) * 1.3) + 1


def looks_like_heading(line):
    s = line.strip()
    if not s or len(s) > 80 or s.endswith((".", ":", ",", ";")):
        return False
    letters = [c for c in s if c.isalpha()]
    return bool(letters) and (s.isupper() or (len(s.split()) <= 6 and s[0].isupper() and not s.endswith(".")))


def parse_md(raw):
    blocks, stack, buf = [], [], []

    def flush():
        if buf:
            blocks.append((" ".join(buf).strip(), " > ".join(t for _, t in stack) or None, None))
            buf.clear()

    for line in raw.splitlines():
        s = line.strip()
        m = re.match(r"^(#{1,6})\s+(.*)$", s)
        if not s:
            flush()
        elif m:
            flush()
            lvl = len(m.group(1))
            stack[:] = [x for x in stack if x[0] < lvl] + [(lvl, m.group(2).strip())]
        elif re.match(r"^([-*]|\d+\.)\s+", s):
            flush()
            buf.append(re.sub(r"^([-*]|\d+\.)\s+", "", s))
            flush()
        elif set(s) <= set("|-: "):
            continue
        else:
            buf.append(s)
    flush()
    return [(re.sub(r"\*\*|`", "", t), sec, p) for t, sec, p in blocks]


def parse_txt(raw):
    blocks, sec = [], None
    for para in re.split(r"\n\s*\n", raw.strip()):
        para = " ".join(para.split())
        if not para:
            continue
        if para.isupper() and len(para) < 80:
            sec = para.title()
            continue
        blocks.append((para, sec, None))
    return blocks


def parse_docx(path):
    xml = zipfile.ZipFile(path).read("word/document.xml").decode("utf-8")
    blocks, sec = [], None
    for p in re.findall(r"<w:p[ >].*?</w:p>", xml, re.S):
        text = "".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", p, re.S)).strip()
        text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'")
        if not text:
            continue
        style = re.search(r'<w:pStyle w:val="([^"]+)"', p)
        style = style.group(1).lower() if style else ""
        if "heading" in style or "title" in style:
            sec = text
            continue
        blocks.append((text, sec, None))
    return blocks


def pdf_unescape(s):
    s = re.sub(r"\\([0-7]{1,3})", lambda m: bytes([int(m.group(1), 8)]).decode("cp1252"), s)
    return re.sub(r"\\(.)", r"\1", s)


def parse_pdf(path):
    data = path.read_bytes()
    blocks, sec, page = [], None, 0
    for m in re.finditer(rb"stream\r?\n(.*?)endstream", data, re.S):
        raw = m.group(1)
        try:
            content = zlib.decompress(raw).decode("latin-1")
        except zlib.error:
            try:
                content = zlib.decompress(base64.a85decode(raw.strip(), adobe=True)).decode("latin-1")
            except (ValueError, zlib.error):
                continue
        if " Tj" not in content:
            continue
        page += 1
        for bt in re.findall(r"BT(.*?)ET", content, re.S):
            font = re.search(r"/(F\d+)\s+([\d.]+)\s+Tf", bt)
            parts = re.findall(r"\(((?:\\.|[^\\)])*)\)\s*Tj", bt)
            text = " ".join(pdf_unescape(x) for x in parts).strip()
            if not text:
                continue
            if font and float(font.group(2)) >= 14:
                if float(font.group(2)) < 18:
                    sec = text
                continue
            blocks.append((text, sec, page))
    return blocks


def chunk(blocks, target=300):
    chunks, cur, cur_sec, cur_page, cur_tok = [], [], None, None, 0

    def flush():
        if cur:
            chunks.append({"content": "\n\n".join(cur), "section": cur_sec, "page_number": cur_page})

    for text, sec, page in blocks:
        t = ntok(text)
        if cur and (sec != cur_sec or cur_tok + t > target):
            flush()
            cur, cur_tok = [], 0
        if not cur:
            cur_sec, cur_page = sec, page
        cur.append(text)
        cur_tok += t
    flush()
    return chunks


def main():
    manifest = json.loads((ROOT / "sample_data" / "manifest.json").read_text())
    docs, chunks = [], []
    for i, spec in enumerate(manifest):
        path = ROOT / "sample_data" / spec["path"]
        fmt = path.suffix.lstrip(".")
        if fmt == "md":
            blocks = parse_md(path.read_text("utf-8"))
        elif fmt == "txt":
            blocks = parse_txt(path.read_text("utf-8"))
        elif fmt == "docx":
            blocks = parse_docx(path)
        else:
            blocks = parse_pdf(path)
        doc_id = str(uuid.uuid5(NS, spec["path"]))
        doc_chunks = chunk(blocks)
        for j, c in enumerate(doc_chunks):
            chunks.append({"chunk_id": str(uuid.uuid5(NS, f"{spec['path']}#{j}")), "document_id": doc_id, **c})
        docs.append({
            "id": doc_id,
            "name": spec["name"],
            "file_format": fmt,
            "document_type": spec["document_type"],
            "department": spec["department"],
            "category": spec["category"],
            "allowed_roles": spec["allowed_roles"],
            "status": "indexed",
            "chunk_count": len(doc_chunks),
            "created_at": f"2026-11-03T09:{i:02d}:00Z",
        })
    qa = json.loads((ROOT / "evals" / "qa_dataset.json").read_text())
    OUT.write_text(json.dumps({"documents": docs, "chunks": chunks, "qa": qa}, ensure_ascii=False, indent=0) + "\n")
    print(f"{len(docs)} documents, {len(chunks)} chunks, {len(qa)} eval items -> {OUT}")


main()
