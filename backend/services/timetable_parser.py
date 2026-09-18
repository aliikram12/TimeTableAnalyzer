"""
Timetable Parser Module
Identifies table layout patterns, extracts metadata, parses cells, and constructs
structured TimetableEntry records with high fidelity.
Handles multi-lecture cells, time-anchored segmentation, and full class name preservation.
"""

import re
import uuid
from typing import List, Dict, Any, Optional, Tuple
from services.normalizer import (
    normalize_day, normalize_time, normalize_teacher,
    normalize_room, parse_subject_and_code, parse_class_details,
    clean_whitespace, DAYS_MAP
)

class TimetableParser:
    def __init__(self, canonical_catalog: Optional[List[str]] = None):
        self.canonical_catalog = canonical_catalog or []
        self.time_regex = re.compile(r"\(\s*(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s*\)")
        self.standalone_time_regex = re.compile(r"(\b\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[-–—]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?\b)")

    def set_canonical_catalog(self, catalog: List[str]):
        self.canonical_catalog = catalog

    def parse_cell_lectures(
        self,
        cell_text: str,
        day: str,
        room: str,
        department: str,
        page_num: int,
        default_time_range: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Parses all lectures contained inside a single grid cell.
        A cell may contain 1 lecture or 6+ sequential lectures.
        """
        if not cell_text or not cell_text.strip():
            return []

        cleaned_text = cell_text.replace("\r", "")
        lines = [l.strip() for l in cleaned_text.split("\n") if l.strip()]
        if not lines:
            return []

        entries: List[Dict[str, Any]] = []

        # Strategy 1: Time-anchored segmentation (each lecture ends with Teacher (HH:MM - HH:MM))
        time_indices = [i for i, l in enumerate(lines) if self.time_regex.search(l)]

        if time_indices:
            last_idx = 0
            for t_idx in time_indices:
                chunk = lines[last_idx:t_idx + 1]
                last_idx = t_idx + 1

                teacher_time_line = chunk[-1]
                t_match = self.time_regex.search(teacher_time_line)
                start_t = t_match.group(1) if t_match else ""
                end_t = t_match.group(2) if t_match else ""
                time_norm, s_fmt, e_fmt, _, _ = normalize_time(f"{start_t} - {end_t}")

                # Teacher is the text before the parenthesized time
                raw_teacher = teacher_time_line[:t_match.start()].strip(" \t\n\r-—:") if t_match else teacher_time_line
                teacher = normalize_teacher(raw_teacher)

                # Class name is typically chunk[-2]
                raw_class = chunk[-2] if len(chunk) >= 2 else "General"
                # Subject is typically chunk[-3]
                raw_subject = chunk[-3] if len(chunk) >= 3 else (chunk[0] if len(chunk) >= 2 else "Lecture")
                # Any leading lines (e.g. Combined Class (982))
                meta_prefix = " ".join(chunk[:-3]) if len(chunk) > 3 else ""

                class_info = parse_class_details(raw_class, self.canonical_catalog)
                subject_title, course_code = parse_subject_and_code(raw_subject)

                note = meta_prefix if meta_prefix else ""

                entries.append({
                    "id": str(uuid.uuid4()),
                    "day": day,
                    "startTime": s_fmt or start_t,
                    "endTime": e_fmt or end_t,
                    "time": time_norm or f"{start_t} - {end_t}",
                    "subject": subject_title,
                    "courseCode": course_code,
                    "teacher": teacher,
                    "room": normalize_room(room),
                    "className": class_info["displayName"],
                    "displayName": class_info["displayName"],
                    "rawClassName": class_info["rawClassName"],
                    "program": class_info["program"],
                    "semester": class_info["semester"],
                    "section": class_info["section"],
                    "shift": class_info["shift"],
                    "batch": class_info["batch"],
                    "department": department,
                    "sourcePage": page_num,
                    "rawText": "\n".join(chunk),
                    "confidence": 0.95,
                    "conflictNote": note
                })

            return entries

        # Strategy 2: Standalone time pattern in header or within cell
        time_match = self.standalone_time_regex.search(cell_text) or (self.standalone_time_regex.search(default_time_range) if default_time_range else None)
        if time_match:
            time_norm, s_fmt, e_fmt, _, _ = normalize_time(time_match.group(0))
        else:
            time_norm, s_fmt, e_fmt = "09:00 AM - 10:30 AM", "09:00 AM", "10:30 AM"

        # Split icon-separated or double-newline blocks
        blocks = [b.strip() for b in re.split(r"[\uf1f8\uf000-\uffff]|\n{2,}", cell_text) if b.strip()]
        for block in blocks:
            b_lines = [l.strip() for l in block.split("\n") if l.strip()]
            if not b_lines:
                continue

            raw_subject = b_lines[0]
            raw_class = b_lines[1] if len(b_lines) > 1 else "General"
            raw_teacher = b_lines[2] if len(b_lines) > 2 else "To Be Announced"

            # Check if teacher line has embedded time
            t_match = self.time_regex.search(raw_teacher)
            if t_match:
                start_t = t_match.group(1)
                end_t = t_match.group(2)
                time_norm, s_fmt, e_fmt, _, _ = normalize_time(f"{start_t} - {end_t}")
                raw_teacher = raw_teacher[:t_match.start()].strip()

            class_info = parse_class_details(raw_class, self.canonical_catalog)
            subject_title, course_code = parse_subject_and_code(raw_subject)

            entries.append({
                "id": str(uuid.uuid4()),
                "day": day,
                "startTime": s_fmt or "09:00 AM",
                "endTime": e_fmt or "10:30 AM",
                "time": time_norm or "09:00 AM - 10:30 AM",
                "subject": subject_title,
                "courseCode": course_code,
                "teacher": normalize_teacher(raw_teacher),
                "room": normalize_room(room),
                "className": class_info["displayName"],
                "displayName": class_info["displayName"],
                "rawClassName": class_info["rawClassName"],
                "program": class_info["program"],
                "semester": class_info["semester"],
                "section": class_info["section"],
                "shift": class_info["shift"],
                "batch": class_info["batch"],
                "department": department,
                "sourcePage": page_num,
                "rawText": block,
                "confidence": 0.85
            })

        return entries

    def parse_grid_table(self, table: List[List[str]], page_num: int) -> List[Dict[str, Any]]:
        """
        Interprets a 2D matrix representing a timetable page.
        Identifies layout:
        - Layout A: Columns = Days (Monday..Friday), Rows = Rooms
        - Layout B: Columns = Time, Rows = Days
        - Layout C: Columns = Days, Rows = Time
        """
        if not table or len(table) < 2:
            return []

        entries: List[Dict[str, Any]] = []
        headers = [clean_whitespace(c) for c in table[0]]

        # Classify columns
        col_days = [normalize_day(c) for c in headers]
        days_count = sum(1 for d in col_days if d is not None)

        # Check if first column is Room/Lab and others are Days (Layout A - standard for university timetables)
        if days_count >= 3:
            # Columns are Days!
            for r_idx in range(1, len(table)):
                row = table[r_idx]
                if not row or not any(clean_whitespace(c) for c in row):
                    continue

                col0_raw = clean_whitespace(row[0], preserve_newlines=True)
                if not col0_raw or normalize_day(col0_raw) is not None:
                    continue

                col0_lines = [l.strip() for l in col0_raw.split("\n") if l.strip()]
                room_name = col0_lines[-1] if col0_lines else col0_raw
                dept_name = col0_lines[0] if len(col0_lines) > 1 else "Department of Software Engineering"

                for col_idx in range(1, min(len(row), len(headers))):
                    day_name = col_days[col_idx]
                    if not day_name:
                        continue
                    cell_content = row[col_idx]
                    if not cell_content or not clean_whitespace(cell_content):
                        continue

                    cell_entries = self.parse_cell_lectures(
                        cell_text=cell_content,
                        day=day_name,
                        room=room_name,
                        department=dept_name,
                        page_num=page_num
                    )
                    entries.extend(cell_entries)

            return entries

        # Layout B / C: Columns are Times or Rooms, Rows are Days
        for r_idx in range(1, len(table)):
            row = table[r_idx]
            if not row or not any(clean_whitespace(c) for c in row):
                continue

            first_cell = clean_whitespace(row[0])
            row_day = normalize_day(first_cell)
            if not row_day:
                continue

            for col_idx in range(1, min(len(row), len(headers))):
                cell_content = row[col_idx]
                if not cell_content or not clean_whitespace(cell_content):
                    continue

                header_col = headers[col_idx]
                time_col = self.standalone_time_regex.search(header_col)

                room_col = header_col if not time_col else "Room 101"
                time_range = time_col.group(0) if time_col else None

                cell_entries = self.parse_cell_lectures(
                    cell_text=cell_content,
                    day=row_day,
                    room=room_col,
                    department="Software Engineering",
                    page_num=page_num,
                    default_time_range=time_range
                )
                entries.extend(cell_entries)

        return entries
