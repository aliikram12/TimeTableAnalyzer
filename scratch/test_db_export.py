import os
import sys
sys.path.insert(0, os.path.abspath("."))
import fitz

from backend.database.db import get_timetable_data, list_all_timetables
from backend.services.exporter import TimetableExporter

tts = list_all_timetables()
print(f"Total timetables in database: {len(tts)}")
if tts:
    active_tt = tts[0]
    tt_id = active_tt["id"]
    tt_data = get_timetable_data(tt_id)
    entries = tt_data.get("entries", [])
    print(f"Loaded timetable '{active_tt.get('originalName', 'TT')}' ({tt_id}) with {len(entries)} entries")

    out_pdf = "exports/full_master_export.pdf"
    TimetableExporter.export_pdf(entries, out_pdf, export_type="full")

    doc = fitz.open(out_pdf)
    print(f"Total pages generated: {len(doc)}")
    
    # Render page 1
    p1 = doc[0].get_pixmap(dpi=150)
    p1.save("scratch/full_export_p1.png")
    print("Page 1 saved to scratch/full_export_p1.png")

    # Render page 2 if exists
    if len(doc) > 1:
        p2 = doc[1].get_pixmap(dpi=150)
        p2.save("scratch/full_export_p2.png")
        print("Page 2 saved to scratch/full_export_p2.png")

    # Also test filtered export for a specific teacher
    teachers = list(set(e.get("teacher") for e in entries if e.get("teacher")))
    if teachers:
        t_name = teachers[0]
        t_entries = [e for e in entries if e.get("teacher") == t_name]
        t_out = "exports/teacher_filtered_export.pdf"
        TimetableExporter.export_pdf(t_entries, t_out, export_type="teacher", filter_val=t_name)
        t_doc = fitz.open(t_out)
        t_p1 = t_doc[0].get_pixmap(dpi=150)
        t_p1.save("scratch/teacher_export_p1.png")
        print(f"Teacher '{t_name}' ({len(t_entries)} entries, {len(t_doc)} pages) exported to scratch/teacher_export_p1.png")

    # Also test class schedule export
    classes = list(set(e.get("className") for e in entries if e.get("className")))
    if classes:
        c_name = classes[0]
        c_entries = [e for e in entries if e.get("className") == c_name]
        c_out = "exports/class_filtered_export.pdf"
        TimetableExporter.export_pdf(c_entries, c_out, export_type="class", filter_val=c_name)
        c_doc = fitz.open(c_out)
        c_p1 = c_doc[0].get_pixmap(dpi=150)
        c_p1.save("scratch/class_export_p1.png")
        print(f"Class '{c_name}' ({len(c_entries)} entries, {len(c_doc)} pages) exported to scratch/class_export_p1.png")
else:
    print("No timetables found in DB")
