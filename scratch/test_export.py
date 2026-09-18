import os
import sys
sys.path.insert(0, os.path.abspath("."))
import json
import fitz  # PyMuPDF

from backend.services.exporter import TimetableExporter

sample_entries = [
    {
        "day": "Monday",
        "time": "08:30 - 10:00",
        "startTime": "08:30",
        "endTime": "10:00",
        "subject": "Software Quality Engineering",
        "courseCode": "SE-301",
        "teacher": "Dr. Farhan Ali",
        "room": "Room 101",
        "className": "BS SE Semester 3 Self Sport 1 (2025-2029)",
        "program": "BS SE",
        "semester": "3",
        "section": "Self Sport 1",
        "shift": "Morning",
        "batch": "2025-2029"
    },
    {
        "day": "Tuesday",
        "time": "10:00 - 11:30",
        "startTime": "10:00",
        "endTime": "11:30",
        "subject": "Web Engineering",
        "courseCode": "SE-302",
        "teacher": "Ms. Ayesha Khan",
        "room": "Lab 2",
        "className": "BS SE Semester 3 Self Sport 1 (2025-2029)",
        "program": "BS SE",
        "semester": "3",
        "section": "Self Sport 1",
        "shift": "Morning",
        "batch": "2025-2029"
    }
]

out_pdf = "exports/test_output.pdf"
os.makedirs("exports", exist_ok=True)
TimetableExporter.export_pdf(sample_entries, out_pdf, export_type="full")

doc = fitz.open(out_pdf)
print(f"Total pages: {len(doc)}")
page = doc[0]
text = page.get_text()
print("Extracted text length:", len(text))
pix = page.get_pixmap(dpi=150)
img_path = "scratch/test_output_page1.png"
pix.save(img_path)
print(f"Saved page render to {img_path}")

