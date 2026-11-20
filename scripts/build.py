#!/usr/bin/env python3
"""Build the static novel site from Markdown chapters."""

from __future__ import annotations

import html
import json
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHAPTERS_DIR = ROOT / "content" / "chapters"
SITE_DIR = ROOT / "site"
DATA_DIR = ROOT / "data"
DIST_DIR = ROOT / "dist"
MIN_CHAPTER_LENGTH = 2800


def parse_frontmatter(raw: str, source: Path) -> tuple[dict[str, str], str]:
    if not raw.startswith("---\n"):
        raise ValueError(f"{source}: 缺少 YAML frontmatter")
    try:
        header, body = raw[4:].split("\n---\n", 1)
    except ValueError as exc:
        raise ValueError(f"{source}: frontmatter 未正確結束") from exc
    metadata: dict[str, str] = {}
    for line in header.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, separator, value = line.partition(":")
        if not separator:
            raise ValueError(f"{source}: 無法解析 frontmatter 行：{line}")
        metadata[key.strip()] = value.strip().strip('"').strip("'")
    return metadata, body.strip()


def inline_markdown(value: str) -> str:
    escaped = html.escape(value)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"\*(.+?)\*", r"<em>\1</em>", escaped)
    return escaped


def markdown_to_html(markdown: str) -> str:
    blocks: list[str] = []
    paragraph: list[str] = []

    def flush_paragraph() -> None:
        if paragraph:
            blocks.append(f"<p>{inline_markdown(' '.join(paragraph))}</p>")
            paragraph.clear()

    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            flush_paragraph()
        elif line == "---":
            flush_paragraph()
            blocks.append("<hr>")
        elif line.startswith("### "):
            flush_paragraph()
            blocks.append(f"<h3>{inline_markdown(line[4:])}</h3>")
        elif line.startswith("## "):
            flush_paragraph()
            blocks.append(f"<h2>{inline_markdown(line[3:])}</h2>")
        elif line.startswith("> "):
            flush_paragraph()
            blocks.append(f"<blockquote>{inline_markdown(line[2:])}</blockquote>")
        else:
            paragraph.append(line)
    flush_paragraph()
    return "\n".join(blocks)


def plain_text(markdown: str) -> str:
    text = re.sub(r"[#>*_`\-]", "", markdown)
    return re.sub(r"\s+", " ", text).strip()


def load_json(path: Path):
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def load_chapters() -> list[dict]:
    chapters = []
    for path in sorted(CHAPTERS_DIR.glob("*.md")):
        metadata, markdown = parse_frontmatter(path.read_text(encoding="utf-8"), path)
        for required in ("number", "volume", "title"):
            if required not in metadata:
                raise ValueError(f"{path}: 缺少必要欄位 {required}")
        search_text = f"{metadata['title']} {plain_text(markdown)}"
        if len(plain_text(markdown)) < MIN_CHAPTER_LENGTH:
            raise ValueError(
                f"{path}: 正文僅 {len(plain_text(markdown))} 字，正式章節至少需要 {MIN_CHAPTER_LENGTH} 字"
            )
        chapters.append(
            {
                "number": int(metadata["number"]),
                "volume": int(metadata["volume"]),
                "title": metadata["title"],
                "date": metadata.get("date", ""),
                "excerpt": metadata.get("excerpt", plain_text(markdown)[:90]),
                "html": markdown_to_html(markdown),
                "search_text": search_text,
            }
        )
    chapters.sort(key=lambda chapter: chapter["number"])
    if not chapters:
        raise ValueError("content/chapters 內至少需要一篇 Markdown 章節")
    numbers = [chapter["number"] for chapter in chapters]
    expected = list(range(1, max(numbers) + 1))
    if numbers != expected:
        raise ValueError(f"全書章號必須從 1 連續編號；目前為 {numbers}，預期為 {expected}")
    return chapters


def build() -> None:
    chapters = load_chapters()
    volumes = load_json(DATA_DIR / "volumes.json")
    characters = load_json(DATA_DIR / "characters.json")
    volume_lookup = {int(volume["number"]): volume for volume in volumes}
    for chapter in chapters:
        if chapter["volume"] not in volume_lookup:
            raise ValueError(f"第 {chapter['number']} 章引用不存在的卷數 {chapter['volume']}")
        chapter["volume_title"] = volume_lookup[chapter["volume"]]["title"]
    for volume in volumes:
        volume_chapters = [chapter for chapter in chapters if chapter["volume"] == int(volume["number"])]
        volume["chapter_count"] = len(volume_chapters)
        volume["first_chapter"] = volume_chapters[0]["number"] if volume_chapters else None

    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    shutil.copytree(SITE_DIR, DIST_DIR)
    (DIST_DIR / "data").mkdir(parents=True, exist_ok=True)
    payload = {
        "title": "神狐天尊",
        "author": "糖加三勺",
        "latest_chapter": max(chapter["number"] for chapter in chapters),
        "volumes": volumes,
        "chapters": chapters,
        "characters": characters,
    }
    (DIST_DIR / "data" / "site.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DIST_DIR / ".nojekyll").write_text("", encoding="utf-8")
    shutil.copy2(DIST_DIR / "index.html", DIST_DIR / "404.html")
    print(f"建置完成：{len(chapters)} 章、{len(volumes)} 卷；最新章為第 {payload['latest_chapter']} 章")


if __name__ == "__main__":
    build()
