"""Corpus loading and chunking.

Chunking rule (deterministic):
  - Split a markdown doc into blocks on blank lines.
  - Merge a lone heading block into the following block (headings carry no
    retrieval signal on their own).
  - chunk_id = "<doc_stem>#<index>"  (0-based, per doc)
  - doc_id  = "<doc_stem>"           (filename without .md)

This is intentionally simple — the demo pipeline is not a production RAG stack
(PRD §9). Paragraph granularity is enough to model realistic retrieval/rerank
failures on a 12-doc corpus.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from ..config import CORPUS_DIR

_HEADING_RE = re.compile(r"^#{1,6}\s")


@dataclass
class Chunk:
    doc_id: str
    chunk_id: str
    index: int
    heading: str
    text: str


@dataclass
class Corpus:
    chunks: list[Chunk] = field(default_factory=list)

    def by_id(self, chunk_id: str) -> Optional[Chunk]:
        for c in self.chunks:
            if c.chunk_id == chunk_id:
                return c
        return None

    def doc_ids(self) -> list[str]:
        seen: list[str] = []
        for c in self.chunks:
            if c.doc_id not in seen:
                seen.append(c.doc_id)
        return seen

    def chunks_for_doc(self, doc_id: str) -> list[Chunk]:
        return [c for c in self.chunks if c.doc_id == doc_id]


def _first_heading(text: str) -> str:
    for line in text.splitlines():
        if _HEADING_RE.match(line):
            return line.lstrip("#").strip()
    return ""


def chunk_markdown(text: str) -> list[str]:
    """Split markdown into chunks per the rule above."""
    raw = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
    merged: list[str] = []
    for block in raw:
        if merged and "\n" not in merged[-1] and _HEADING_RE.match(merged[-1]):
            # Previous block is a lone heading -> attach this block to it.
            merged[-1] = merged[-1] + "\n" + block
        else:
            merged.append(block)
    return merged


def load_corpus(corpus_dir: Optional[Path] = None) -> Corpus:
    corpus_dir = corpus_dir or CORPUS_DIR
    chunks: list[Chunk] = []
    if not corpus_dir.exists():
        return Corpus(chunks=chunks)
    for path in sorted(corpus_dir.glob("*.md")):
        doc_id = path.stem
        text = path.read_text(encoding="utf-8")
        for i, block in enumerate(chunk_markdown(text)):
            chunks.append(
                Chunk(
                    doc_id=doc_id,
                    chunk_id=f"{doc_id}#{i}",
                    index=i,
                    heading=_first_heading(block),
                    text=block,
                )
            )
    return Corpus(chunks=chunks)


def dump() -> None:
    """Print every chunk with its id — used to verify needed_chunk_ids in the
    labeled query set before running eval."""
    corpus = load_corpus()
    for c in corpus.chunks:
        preview = " ".join(c.text.split())
        if len(preview) > 120:
            preview = preview[:120] + "…"
        print(f"[{c.chunk_id}] {preview}")


if __name__ == "__main__":
    dump()
