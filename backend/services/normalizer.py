"""
Timetable Data Normalizer Module
Provides string cleaning, standardization, and canonicalization for timetable entities.
Accurately decomposes complex class strings (Program, Semester, Section, Shift, Batch)
and preserves original textual fidelity.
"""

import re
from typing import Dict, Optional, Tuple, List, Any

DAYS_MAP = {
    "mon": "Monday",
    "monday": "Monday",
    "m": "Monday",
    "tue": "Tuesday",
    "tues": "Tuesday",
    "tuesday": "Tuesday",
    "tu": "Tuesday",
    "wed": "Wednesday",
    "wednesday": "Wednesday",
    "w": "Wednesday",
    "thu": "Thursday",
    "thur": "Thursday",
    "thurs": "Thursday",
    "thursday": "Thursday",
    "th": "Thursday",
    "fri": "Friday",
    "friday": "Friday",
    "f": "Friday",
    "sat": "Saturday",
    "saturday": "Saturday",
    "s": "Saturday",
    "sun": "Sunday",
    "sunday": "Sunday",
}

def clean_whitespace(text: Optional[str], preserve_newlines: bool = False) -> str:
    if not text:
        return ""
    # Normalize unicode dashes, non-breaking spaces, replacement chars, and multi-spaces
    text = text.replace("\u00a0", " ").replace("\u2013", "-").replace("\u2014", "-").replace("\u2212", "-")
    # Remove unicode bullet / icons like \uf1f8
    text = re.sub(r"[\uf1f8\uf000-\uffff]", " ", text)
    if not preserve_newlines:
        text = re.sub(r"[\r\n\t]+", " ", text)
    else:
        text = text.replace("\r", "")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()

def normalize_day(day_str: Optional[str]) -> Optional[str]:
    if not day_str:
        return None
    cleaned = clean_whitespace(day_str).lower()
    cleaned = re.sub(r"[^a-z]", "", cleaned)
    return DAYS_MAP.get(cleaned, None)

def parse_time_to_minutes(time_part: str) -> Optional[int]:
    """Converts a single time string like '9:00 AM', '14:30', '9 AM', '09:00', '08:00' to minutes from midnight."""
    cleaned = clean_whitespace(time_part).upper()
    match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?", cleaned)
    if not match:
        return None
    
    hour = int(match.group(1))
    minute = int(match.group(2)) if match.group(2) else 0
    meridiem = match.group(3)

    if meridiem == "PM" and hour < 12:
        hour += 12
    elif meridiem == "AM" and hour == 12:
        hour = 0
    elif not meridiem:
        # Heuristic for university timetables: hours 8 to 12 are morning; 1 to 7 are usually PM
        if 1 <= hour <= 7:
            hour += 12

    return hour * 60 + minute

def format_minutes_to_12h(minutes: int) -> str:
    hour = (minutes // 60) % 24
    minute = minutes % 60
    meridiem = "PM" if hour >= 12 else "AM"
    h12 = hour % 12
    if h12 == 0:
        h12 = 12
    return f"{h12:02d}:{minute:02d} {meridiem}"

def normalize_time(time_str: Optional[str]) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[int], Optional[int]]:
    """
    Returns (normalized_time_range, start_time, end_time, start_minutes, end_minutes).
    Supports formats like '09:00 AM - 10:30 AM', '08:00 - 10:00', '9:00-10:00', '09:00–10:30'.
    """
    if not time_str:
        return None, None, None, None, None
    cleaned = clean_whitespace(time_str)
    parts = re.split(r"\s*(?:-|–|—|to)\s*", cleaned, maxsplit=1)
    if len(parts) == 2:
        start_raw, end_raw = parts[0], parts[1]
        start_min = parse_time_to_minutes(start_raw)
        end_min = parse_time_to_minutes(end_raw)
        
        if start_min is not None and end_min is not None:
            if end_min <= start_min and (end_min + 720) < 1440:
                end_min += 720
            start_fmt = format_minutes_to_12h(start_min)
            end_fmt = format_minutes_to_12h(end_min)
            return f"{start_fmt} - {end_fmt}", start_fmt, end_fmt, start_min, end_min
        
    single_min = parse_time_to_minutes(cleaned)
    if single_min is not None:
        start_fmt = format_minutes_to_12h(single_min)
        end_fmt = format_minutes_to_12h(single_min + 90) # default 90m class slot
        return f"{start_fmt} - {end_fmt}", start_fmt, end_fmt, single_min, single_min + 90

    return cleaned, cleaned, None, None, None

def normalize_teacher(teacher_str: Optional[str]) -> Optional[str]:
    if not teacher_str:
        return "To Be Announced"
    cleaned = clean_whitespace(teacher_str)
    # Strip any residual parentheses or time
    cleaned = re.sub(r"\(.*?\)", "", cleaned).strip(" \t\n\r-—:")
    if not cleaned or cleaned.lower() in ["tbd", "n/a", "none", "null", "-", "staff", "faculty", "unknown"]:
        return "To Be Announced"

    # Normalize titles: Dr., Prof., Engr., Mr., Ms., Mrs.
    cleaned = re.sub(r"^(dr|prof|engr|mr|ms|mrs)\.?\s+", lambda m: m.group(1).capitalize() + ". ", cleaned, flags=re.IGNORECASE)
    
    # Clean multiple spaces and return clean title case
    words = cleaned.split()
    normalized_words = []
    for w in words:
        if w.upper() in ["PH.D", "PHD", "MS", "M.SC", "BS", "CS", "SE", "IT", "DS", "AI"]:
            normalized_words.append(w.upper())
        elif w.isupper() and len(w) > 2:
            normalized_words.append(w.capitalize())
        else:
            normalized_words.append(w)
    return " ".join(normalized_words)

def normalize_room(room_str: Optional[str]) -> str:
    if not room_str:
        return "Room TBA"
    cleaned = clean_whitespace(room_str)
    if not cleaned or cleaned.lower() in ["tbd", "n/a", "none", "-"]:
        return "Room TBA"
    if cleaned.lower() == "online":
        return "Online"
    # If room string has department on first line, split
    lines = [l.strip() for l in room_str.split("\n") if l.strip()]
    if len(lines) > 1:
        cleaned = lines[-1]
    # Standardize prefixes
    cleaned = re.sub(r"^rm\.?\s*", "Room ", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()

def parse_subject_and_code(subject_line: Optional[str]) -> Tuple[str, str]:
    """
    Parses a subject line into subject title and course code.
    Example: 'Programming Fundamentals #CMPC-5201' -> ('Programming Fundamentals', 'CMPC-5201')
    """
    if not subject_line:
        return "General Lecture", ""
    cleaned = clean_whitespace(subject_line)
    if "#" in cleaned:
        parts = cleaned.split("#", 1)
        subj = parts[0].strip()
        code = parts[1].strip()
        return subj if subj else "General Lecture", code
    return cleaned, ""

def parse_class_details(raw_class_str: Optional[str], canonical_catalog: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Decomposes a raw class string into structured components:
    - rawClassName: original string preserved
    - displayName: clean canonical display name
    - program: degree/program name
    - semester: e.g. 'Semester 3'
    - section: e.g. 'Self Support 2', 'Regular 1'
    - shift: 'Self Support', 'Regular', 'Weekend'
    - batch: e.g. '2025-2029'
    
    Uses canonical_catalog for fuzzy repair if cell text was truncated.
    """
    if not raw_class_str:
        return {
            "rawClassName": "General",
            "displayName": "General Class",
            "program": "General",
            "semester": None,
            "section": None,
            "shift": None,
            "batch": None
        }

    raw = clean_whitespace(raw_class_str)
    
    # Try resolving against canonical catalog ONLY if raw is clipped (ends with ellipsis or replacement char)
    resolved_display = raw
    is_clipped = bool(re.search(r"[\ufffd\u2026]|\bSem(?:este)?$", raw))
    if is_clipped and canonical_catalog:
        raw_prefix = re.sub(r"[\ufffd\u2026\s]+$", "", raw)
        for canonical in canonical_catalog:
            if len(canonical) > len(raw_prefix) and canonical.startswith(raw_prefix[:30]):
                resolved_display = canonical
                break

    # Extract batch e.g. '( 2025-2029 )' or '(2025-2029)'
    batch_m = re.search(r"\(\s*(\d{4}\s*[-–—]\s*\d{4})\s*\)", resolved_display)
    batch = batch_m.group(1).replace(" ", "") if batch_m else None

    # Extract semester e.g. 'Semester#3', 'Semester 3', 'Semester#1'
    sem_m = re.search(r"Semester\s*#?\s*(\d+)", resolved_display, re.IGNORECASE)
    semester = f"Semester {sem_m.group(1)}" if sem_m else None

    # Extract shift / category e.g. 'Self Support', 'Self Sport', 'Regular', 'Weekend'
    shift = None
    if re.search(r"Self\s*(?:Support|Sport)", resolved_display, re.IGNORECASE):
        shift = "Self Support"
    elif re.search(r"Regular", resolved_display, re.IGNORECASE):
        shift = "Regular"
    elif re.search(r"Weekend", resolved_display, re.IGNORECASE):
        shift = "Weekend"

    # Extract section e.g. 'Self Support 2', 'Regular 1', 'Section A'
    sec_m = re.search(r"(Self\s*(?:Support|Sport)\s*\d+|Regular\s*\d+|Weekend\s*\d+|Section\s*[A-Za-z0-9]+|Sec\s*[A-Za-z0-9]+)", resolved_display, re.IGNORECASE)
    section = sec_m.group(1) if sec_m else None
    if section and "Sport" in section:
        section = re.sub(r"Sport", "Support", section, flags=re.IGNORECASE)

    # Clean program name by removing batch, semester, section
    prog_clean = resolved_display
    if batch_m:
        prog_clean = prog_clean.replace(batch_m.group(0), "")
    if sem_m:
        prog_clean = prog_clean.replace(sem_m.group(0), "")
    if sec_m:
        prog_clean = prog_clean.replace(sec_m.group(0), "")
    prog_clean = re.sub(r"[\(\)#]", "", prog_clean).strip(" \t\n\r-—:")
    prog_clean = " ".join(prog_clean.split())
    if not prog_clean:
        prog_clean = "BS Software Engineering"

    # Clean up display name (e.g. Self Sport -> Self Support)
    clean_display = re.sub(r"Self\s*Sport", "Self Support", resolved_display, flags=re.IGNORECASE)
    clean_display = " ".join(clean_display.split())

    return {
        "rawClassName": raw_class_str,
        "displayName": clean_display,
        "program": prog_clean,
        "semester": semester,
        "section": section,
        "shift": shift,
        "batch": batch
    }
