"""
PDF Analyzer Module
Inspects page structure, extracts text blocks with coordinates, detects tables,
and classifies PDF structure (text-based, table-based, hybrid).
"""

import os
from typing import List, Dict, Any, Optional
import pymupdf  # PyMuPDF
import pdfplumber

class PDFAnalyzer:
    def __init__(self, file_path: str):
        self.file_path = file_path
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at: {file_path}")

    def inspect_document(self) -> Dict[str, Any]:
        """
        Gathers structural metadata about the document:
        Page count, dimensions, text density, table counts.
        """
        doc = pymupdf.open(self.file_path)
        total_pages = len(doc)
        pages_meta = []
        has_text = False

        for page_num in range(total_pages):
            page = doc[page_num]
            text = page.get_text()
            rect = page.rect
            text_len = len(text.strip())
            if text_len > 30:
                has_text = True
            
            pages_meta.append({
                "pageNumber": page_num + 1,
                "width": rect.width,
                "height": rect.height,
                "textLength": text_len,
                "sampleText": text[:200].replace("\n", " ").strip()
            })
        doc.close()

        # Check tables with pdfplumber
        table_count = 0
        try:
            with pdfplumber.open(self.file_path) as pdf:
                for page in pdf.pages:
                    tables = page.find_tables()
                    table_count += len(tables)
        except Exception as e:
            pass

        pdf_type = "table-based" if table_count > 0 else ("text-based" if has_text else "scanned/empty")

        return {
            "pageCount": total_pages,
            "type": pdf_type,
            "tableCount": table_count,
            "pages": pages_meta
        }

    def extract_page_tables_and_text(self, page_number: int) -> Dict[str, Any]:
        """
        Extracts structured tables and text blocks for a specific page (1-indexed).
        """
        tables_data = []
        raw_text_blocks = []

        # 1. Try pdfplumber for table extraction
        try:
            with pdfplumber.open(self.file_path) as pdf:
                if 1 <= page_number <= len(pdf.pages):
                    page = pdf.pages[page_number - 1]
                    extracted_tables = page.extract_tables()
                    for t in extracted_tables:
                        if t and len(t) > 0:
                            tables_data.append(t)
        except Exception:
            pass

        # 2. Extract bounding-box blocks with PyMuPDF
        try:
            doc = pymupdf.open(self.file_path)
            if 1 <= page_number <= len(doc):
                page = doc[page_number - 1]
                # blocks: (x0, y0, x1, y1, "text", block_no, block_type)
                blocks = page.get_text("blocks")
                for b in blocks:
                    if len(b) >= 5 and b[4].strip():
                        raw_text_blocks.append({
                            "x0": b[0],
                            "y0": b[1],
                            "x1": b[2],
                            "y1": b[3],
                            "text": b[4].strip()
                        })
            doc.close()
        except Exception:
            pass

        return {
            "page": page_number,
            "tables": tables_data,
            "blocks": raw_text_blocks
        }
