"""
Engine Orchestrator Module
Coordinates the entire PDF processing pipeline: Analysis, Extraction, Parsing, Validation, and Storage.
Extracts canonical catalog, chunks multi-lecture cells, associates all relations, and stores clean data.
"""

import os
import sys
import json
import uuid
import re
from typing import Dict, Any, List, Optional
import pdfplumber
import pymupdf

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from services.pdf_analyzer import PDFAnalyzer
from services.timetable_parser import TimetableParser
from services.validator import TimetableValidator
from services.exporter import TimetableExporter
from database.db import save_timetable, get_timetable_data, init_db

class TimetableEngine:
    def __init__(self, uploads_dir: str, exports_dir: str):
        self.uploads_dir = uploads_dir
        self.exports_dir = exports_dir
        os.makedirs(self.uploads_dir, exist_ok=True)
        os.makedirs(self.exports_dir, exist_ok=True)
        init_db()

    def extract_canonical_catalog(self, pdf_path: str) -> Dict[str, List[str]]:
        """
        Extracts unclipped, full canonical class and teacher names from index pages (e.g. Page 1).
        """
        classes = []
        teachers = []
        try:
            with pdfplumber.open(pdf_path) as pdf:
                if len(pdf.pages) > 0:
                    p1 = pdf.pages[0]
                    text = p1.extract_text() or ""
                    
                    if "Show All Classes" in text and "Show All Teachers" in text:
                        classes_part = text.split("Show All Classes")[1].split("Show All Teachers")[0]
                        raw_classes = [c.strip() for c in re.split(r"[\uf1f8\n]{2,}|\b(?=BS\s|MS\s|PhD\s)", classes_part) if c.strip()]
                        for c in raw_classes:
                            cleaned = " ".join(c.split())
                            if len(cleaned) > 10:
                                classes.append(cleaned)

                        teachers_part = text.split("Show All Teachers")[1]
                        raw_teachers = [t.strip() for t in re.split(r"\s{2,}|\n", teachers_part) if t.strip()]
                        for t in raw_teachers:
                            if t not in ["Regular", "Visiting", "Faculty", "Teacher"] and len(t) > 3:
                                teachers.append(t)
        except Exception as e:
            pass

        return {"classes": classes, "teachers": teachers}

    def process_pdf(self, file_path: str, original_name: str, timetable_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes the complete extraction pipeline on the PDF file:
        1. PDF Inspection (PyMuPDF + pdfplumber)
        2. Canonical catalog discovery (classes & teachers from Page 1 if present)
        3. Table grid extraction & time-anchored cell parsing across all pages
        4. Pandas & NumPy validation, duplicate & conflict detection
        5. SQLite persistence
        """
        if not timetable_id:
            timetable_id = str(uuid.uuid4())

        analyzer = PDFAnalyzer(file_path)
        doc_meta = analyzer.inspect_document()
        total_pages = doc_meta.get("pageCount", 1)

        # Step 2: Extract canonical catalog
        catalog = self.extract_canonical_catalog(file_path)
        parser = TimetableParser(canonical_catalog=catalog.get("classes", []))

        all_entries: List[Dict[str, Any]] = []

        # Step 3: Extract tables and parse cells across all pages
        try:
            with pdfplumber.open(file_path) as pdf:
                for page_idx, page in enumerate(pdf.pages):
                    page_num = page_idx + 1
                    tables = page.extract_tables()
                    if not tables:
                        continue

                    for table in tables:
                        if not table or len(table) < 2:
                            continue
                        
                        # Clean cell strings
                        cleaned_table = [[str(cell or "").strip() for cell in row] for row in table]
                        entries = parser.parse_grid_table(cleaned_table, page_num)
                        if entries:
                            all_entries.extend(entries)
        except Exception as e:
            print(f"Extraction exception: {e}", file=sys.stderr)

        # Fallback if no entries found from tables: direct text block parsing
        if not all_entries:
            doc = pymupdf.open(file_path)
            for page_num in range(1, len(doc) + 1):
                page = doc[page_num - 1]
                text = page.get_text()
                entries = parser.parse_cell_lectures(
                    cell_text=text,
                    day="Monday",
                    room="Room 101",
                    department="Academic Department",
                    page_num=page_num
                )
                all_entries.extend(entries)
            doc.close()

        # Step 4: Pandas & NumPy validation
        validator = TimetableValidator(all_entries)
        val_result = validator.validate_dataset()

        # Step 5: Save to SQLite database
        save_timetable(
            timetable_id=timetable_id,
            filename=os.path.basename(file_path),
            original_name=original_name,
            entries=val_result["entries"],
            stats=val_result["stats"],
            conflicts=val_result["conflicts"],
            page_count=total_pages,
            make_active=True
        )

        return {
            "success": True,
            "timetableId": timetable_id,
            "document": doc_meta,
            "stats": val_result["stats"],
            "conflicts": val_result["conflicts"],
            "duplicates": val_result["duplicates"],
            "entriesCount": len(val_result["entries"])
        }

    def create_sample_university_pdf(self, output_path: str) -> str:
        """Generates a realistic sample timetable PDF if user requests sample."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        from reportlab.lib.pagesizes import landscape, letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        doc = SimpleDocTemplate(output_path, pagesize=landscape(letter), rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("SampleTitle", parent=styles["Heading1"], fontSize=14, leading=16, textColor=colors.HexColor("#0F172A"))
        cell_header_style = ParagraphStyle("SampleCellHeader", parent=styles["Normal"], fontSize=8, leading=10, textColor=colors.white, fontName="Helvetica-Bold")
        cell_style = ParagraphStyle("SampleCell", parent=styles["Normal"], fontSize=7.5, leading=9.5, textColor=colors.HexColor("#1E293B"))

        elements = [
            Paragraph("Department of Software Engineering - Sample University Timetable", title_style),
            Spacer(1, 10)
        ]

        data = [
            [
                Paragraph("Room / Lab", cell_header_style),
                Paragraph("Monday", cell_header_style),
                Paragraph("Tuesday", cell_header_style),
                Paragraph("Wednesday", cell_header_style),
                Paragraph("Thursday", cell_header_style),
                Paragraph("Friday", cell_header_style)
            ],
            [
                Paragraph("Department of Software Engineering<br/>NAB CR-224", cell_style),
                Paragraph("Programming Fundamentals #CMPC-5201<br/>BS in Software Engineering Regular 1 ( 2025-2029 ) Semester#3<br/>Saud Bin Tahir (08:00 - 10:00)<br/><br/>Computer Networks #CMPC-5208<br/>BS in Software Engineering Self Support 2 ( 2025-2029 ) Semester#3<br/>Anum Sajjad (10:00 - 11:30)", cell_style),
                Paragraph("Software Quality Engineering #SECC-302<br/>BS in Software Engineering Regular 1 ( 2025-2029 ) Semester#3<br/>Quasira Ramzan (08:30 - 10:00)", cell_style),
                Paragraph("Database Systems #CMPC-5203<br/>BS in Software Engineering Regular 1 ( 2025-2029 ) Semester#3<br/>Saud Bin Tahir (09:00 - 10:30)", cell_style),
                Paragraph("Web Engineering #SECC-304<br/>BS in Software Engineering Self Support 2 ( 2025-2029 ) Semester#3<br/>Mavra Abbas (11:00 - 12:30)", cell_style),
                Paragraph("Linear Algebra #MATH-5102<br/>BS in Software Engineering Regular 1 ( 2025-2029 ) Semester#3<br/>Dr. Saima Naheed (09:00 - 10:30)", cell_style)
            ],
            [
                Paragraph("Department of Software Engineering<br/>NAB CR-225", cell_style),
                Paragraph("Operating Systems #CMPC-6201<br/>BS in Software Engineering Self Support 1 ( 2025-2029 ) Semester#3<br/>Mansoor Ahmad (08:30 - 10:00)", cell_style),
                Paragraph("Computer Networks #CMPC-5208<br/>BS in Software Engineering Regular 1 ( 2025-2029 ) Semester#3<br/>Hadia Abu Bakar (10:00 - 11:30)", cell_style),
                Paragraph("Organization Behaviour #BUSB-401<br/>BS in Software Engineering Self Support 2 ( 2025-2029 ) Semester#3<br/>Anam Rafique (11:30 - 13:00)", cell_style),
                Paragraph("Database Systems #CMPC-5203<br/>BS in Software Engineering Self Support 1 ( 2025-2029 ) Semester#3<br/>Saud Bin Tahir (09:00 - 10:30)", cell_style),
                Paragraph("Mathematics I #URCM-5107<br/>BS in Software Engineering Self Support 2 ( 2025-2029 ) Semester#3<br/>Dr. Saima Naheed (11:00 - 12:30)", cell_style)
            ]
        ]

        t = Table(data, colWidths=[130, 120, 120, 120, 120, 120])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ]))
        elements.append(t)
        doc.build(elements)
        return output_path

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Timetable Engine CLI")
    parser.add_argument("--action", choices=["process", "sample", "export_csv", "export_excel", "export_pdf"], required=True)
    parser.add_argument("--file", help="Path to PDF file")
    parser.add_argument("--name", default="timetable.pdf", help="Original file name")
    parser.add_argument("--out", help="Output path for export")
    parser.add_argument("--id", help="Timetable ID")
    parser.add_argument("--export_type", default="full", help="Export type: class, teacher, room, full")
    parser.add_argument("--filter_val", default="", help="Filter value (e.g. class name, teacher name)")
    parser.add_argument("--filter_json", default="{}", help="Filter JSON")

    args = parser.parse_args()
    engine = TimetableEngine(
        uploads_dir=os.path.join(CURRENT_DIR, "..", "uploads"),
        exports_dir=os.path.join(CURRENT_DIR, "..", "exports")
    )

    if args.action == "sample":
        out_file = args.out or os.path.join(engine.uploads_dir, "sample_university_timetable.pdf")
        created = engine.create_sample_university_pdf(out_file)
        res = engine.process_pdf(created, "sample_university_timetable.pdf", timetable_id="sample-timetable-default")
        print(json.dumps({"samplePdf": created, "result": res}))

    elif args.action == "process":
        if not args.file:
            print(json.dumps({"error": "--file required"}))
            sys.exit(1)
        res = engine.process_pdf(args.file, args.name, timetable_id=args.id)
        print(json.dumps(res))

    elif args.action in ["export_csv", "export_excel", "export_pdf"]:
        tt_data = get_timetable_data(args.id)
        if not tt_data:
            print(json.dumps({"error": "Timetable not found"}))
            sys.exit(1)
        entries = tt_data.get("entries", [])
        
        # Apply filters
        filtered = entries
        filter_type = args.export_type
        filter_val = args.filter_val
        
        if filter_type == "class" and filter_val:
            filtered = [e for e in filtered if (e.get("className") or "").strip().lower() == filter_val.strip().lower()]
        elif filter_type == "teacher" and filter_val:
            filtered = [e for e in filtered if (e.get("teacher") or "").strip().lower() == filter_val.strip().lower()]
        elif filter_type == "room" and filter_val:
            filtered = [e for e in filtered if (e.get("room") or "").strip().lower() == filter_val.strip().lower()]

        if args.filter_json:
            try:
                fj = json.loads(args.filter_json)
                if isinstance(fj, dict):
                    if fj.get("search"):
                        q = str(fj["search"]).strip().lower()
                        filtered = [
                            e for e in filtered
                            if any(q in str(v).lower() for v in e.values())
                        ]
                    if fj.get("program"):
                        p = str(fj["program"]).strip().lower()
                        filtered = [e for e in filtered if p in (e.get("program") or "").lower() or p in (e.get("className") or "").lower()]
                    if fj.get("semester"):
                        s = str(fj["semester"]).strip().lower()
                        filtered = [e for e in filtered if str(e.get("semester", "")).strip().lower() == s]
                    if fj.get("section"):
                        sec = str(fj["section"]).strip().lower()
                        filtered = [e for e in filtered if str(e.get("section", "")).strip().lower() == sec]
                    if fj.get("teacher") and not filter_val:
                        t = str(fj["teacher"]).strip().lower()
                        filtered = [e for e in filtered if str(e.get("teacher", "")).strip().lower() == t]
                    if fj.get("room") and not filter_val:
                        r = str(fj["room"]).strip().lower()
                        filtered = [e for e in filtered if str(e.get("room", "")).strip().lower() == r]
            except Exception:
                pass

        if args.action == "export_csv":
            out_path = args.out or os.path.join(engine.exports_dir, f"export_{args.id or 'active'}.csv")
            TimetableExporter.export_csv(filtered, out_path)
            print(json.dumps({"filePath": out_path}))
        elif args.action == "export_excel":
            out_path = args.out or os.path.join(engine.exports_dir, f"export_{args.id or 'active'}.xlsx")
            TimetableExporter.export_excel(filtered, out_path)
            print(json.dumps({"filePath": out_path}))
        elif args.action == "export_pdf":
            out_path = args.out or os.path.join(engine.exports_dir, f"export_{args.id or 'active'}.pdf")
            TimetableExporter.export_pdf(
                entries=filtered,
                output_path=out_path,
                export_type=filter_type,
                filter_val=filter_val
            )
            print(json.dumps({"filePath": out_path}))
