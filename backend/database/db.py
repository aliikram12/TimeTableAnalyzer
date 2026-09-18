"""
Database Access Layer (SQLite)
Manages timetables, structured timetable entries, versioning, and persistence.
Preserves full class names, batch, shift, course codes, and relationships.
"""

import sqlite3
import os
import json
from typing import List, Dict, Any, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "timetables.db")

def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Timetables table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS timetables (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 0,
        page_count INTEGER DEFAULT 1,
        stats_json TEXT,
        conflicts_json TEXT
    );
    """)

    # Timetable entries table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS timetable_entries (
        id TEXT PRIMARY KEY,
        timetable_id TEXT NOT NULL,
        day TEXT,
        start_time TEXT,
        end_time TEXT,
        time_str TEXT,
        subject TEXT,
        course_code TEXT,
        teacher TEXT,
        room TEXT,
        class_name TEXT,
        display_name TEXT,
        program TEXT,
        year TEXT,
        semester TEXT,
        section TEXT,
        shift TEXT,
        batch TEXT,
        department TEXT,
        source_page INTEGER DEFAULT 1,
        raw_text TEXT,
        confidence REAL DEFAULT 1.0,
        has_conflict INTEGER DEFAULT 0,
        needs_review INTEGER DEFAULT 0,
        conflict_note TEXT,
        FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE
    );
    """)

    # Migration check for existing tables
    cursor.execute("PRAGMA table_info(timetable_entries)")
    existing_cols = {row["name"] for row in cursor.fetchall()}
    for col_name, col_type in [
        ("class_name", "TEXT"),
        ("display_name", "TEXT"),
        ("course_code", "TEXT"),
        ("shift", "TEXT"),
        ("batch", "TEXT")
    ]:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE timetable_entries ADD COLUMN {col_name} {col_type}")

    conn.commit()
    conn.close()

def save_timetable(
    timetable_id: str,
    filename: str,
    original_name: str,
    entries: List[Dict[str, Any]],
    stats: Dict[str, Any],
    conflicts: List[Dict[str, Any]],
    page_count: int = 1,
    make_active: bool = True
) -> str:
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    if make_active:
        cursor.execute("UPDATE timetables SET is_active = 0")

    cursor.execute("""
    INSERT OR REPLACE INTO timetables (id, filename, original_name, is_active, page_count, stats_json, conflicts_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        timetable_id,
        filename,
        original_name,
        1 if make_active else 0,
        page_count,
        json.dumps(stats),
        json.dumps(conflicts)
    ))

    # Delete existing entries if replacing
    cursor.execute("DELETE FROM timetable_entries WHERE timetable_id = ?", (timetable_id,))

    for e in entries:
        class_str = e.get("className") or e.get("class") or ""
        display_str = e.get("displayName") or class_str
        cursor.execute("""
        INSERT INTO timetable_entries (
            id, timetable_id, day, start_time, end_time, time_str,
            subject, course_code, teacher, room, class_name, display_name,
            program, year, semester, section, shift, batch,
            department, source_page, raw_text, confidence, has_conflict,
            needs_review, conflict_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            e.get("id"),
            timetable_id,
            e.get("day"),
            e.get("startTime"),
            e.get("endTime"),
            e.get("time"),
            e.get("subject"),
            e.get("courseCode", ""),
            e.get("teacher"),
            e.get("room"),
            class_str,
            display_str,
            e.get("program"),
            e.get("year"),
            e.get("semester"),
            e.get("section"),
            e.get("shift"),
            e.get("batch"),
            e.get("department"),
            e.get("sourcePage", 1),
            e.get("rawText", ""),
            float(e.get("confidence", 0.95)),
            1 if e.get("hasConflict") else 0,
            1 if e.get("needsReview") else 0,
            e.get("conflictNote", "")
        ))

    conn.commit()
    conn.close()
    return timetable_id

def get_active_timetable_id() -> Optional[str]:
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM timetables WHERE is_active = 1 ORDER BY upload_date DESC LIMIT 1")
    row = cursor.fetchone()
    if not row:
        cursor.execute("SELECT id FROM timetables ORDER BY upload_date DESC LIMIT 1")
        row = cursor.fetchone()
    conn.close()
    return row["id"] if row else None

def set_active_timetable(timetable_id: str):
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE timetables SET is_active = 0")
    cursor.execute("UPDATE timetables SET is_active = 1 WHERE id = ?", (timetable_id,))
    conn.commit()
    conn.close()

def get_timetable_data(timetable_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    init_db()
    if not timetable_id:
        timetable_id = get_active_timetable_id()
    if not timetable_id:
        return None

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM timetables WHERE id = ?", (timetable_id,))
    tt_row = cursor.fetchone()
    if not tt_row:
        conn.close()
        return None

    cursor.execute("SELECT * FROM timetable_entries WHERE timetable_id = ? ORDER BY day, start_time", (timetable_id,))
    entry_rows = cursor.fetchall()

    entries = []
    for r in entry_rows:
        entries.append({
            "id": r["id"],
            "timetableId": r["timetable_id"],
            "day": r["day"],
            "startTime": r["start_time"],
            "endTime": r["end_time"],
            "time": r["time_str"],
            "subject": r["subject"],
            "courseCode": r["course_code"] if "course_code" in r.keys() else "",
            "teacher": r["teacher"],
            "room": r["room"],
            "className": r["class_name"] if "class_name" in r.keys() and r["class_name"] else (r["program"] or ""),
            "displayName": r["display_name"] if "display_name" in r.keys() and r["display_name"] else (r["class_name"] if "class_name" in r.keys() else (r["program"] or "")),
            "program": r["program"],
            "year": r["year"],
            "semester": r["semester"],
            "section": r["section"],
            "shift": r["shift"] if "shift" in r.keys() else "",
            "batch": r["batch"] if "batch" in r.keys() else "",
            "department": r["department"],
            "sourcePage": r["source_page"],
            "rawText": r["raw_text"],
            "confidence": r["confidence"],
            "hasConflict": bool(r["has_conflict"]),
            "needsReview": bool(r["needs_review"]),
            "conflictNote": r["conflict_note"]
        })

    stats = json.loads(tt_row["stats_json"]) if tt_row["stats_json"] else {}
    conflicts = json.loads(tt_row["conflicts_json"]) if tt_row["conflicts_json"] else []

    result = {
        "id": tt_row["id"],
        "filename": tt_row["filename"],
        "originalName": tt_row["original_name"],
        "uploadDate": tt_row["upload_date"],
        "isActive": bool(tt_row["is_active"]),
        "pageCount": tt_row["page_count"],
        "entries": entries,
        "stats": stats,
        "conflicts": conflicts
    }
    conn.close()
    return result

def list_all_timetables() -> List[Dict[str, Any]]:
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT t.id, t.filename, t.original_name, t.upload_date, t.is_active, t.page_count,
           COUNT(e.id) as entry_count
    FROM timetables t
    LEFT JOIN timetable_entries e ON t.id = e.timetable_id
    GROUP BY t.id
    ORDER BY t.upload_date DESC
    """)
    rows = cursor.fetchall()
    res = []
    for r in rows:
        res.append({
            "id": r["id"],
            "filename": r["filename"],
            "originalName": r["original_name"],
            "uploadDate": r["upload_date"],
            "isActive": bool(r["is_active"]),
            "pageCount": r["page_count"],
            "entryCount": r["entry_count"]
        })
    conn.close()
    return res

def update_entry_record(entry_id: str, fields: Dict[str, Any]) -> bool:
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    mapping = {
        "day": "day",
        "startTime": "start_time",
        "endTime": "end_time",
        "time": "time_str",
        "subject": "subject",
        "courseCode": "course_code",
        "teacher": "teacher",
        "room": "room",
        "className": "class_name",
        "displayName": "display_name",
        "program": "program",
        "year": "year",
        "semester": "semester",
        "section": "section",
        "shift": "shift",
        "batch": "batch",
        "department": "department",
        "needsReview": "needs_review",
        "hasConflict": "has_conflict"
    }

    updates = []
    vals = []
    for k, v in fields.items():
        if k in mapping:
            updates.append(f"{mapping[k]} = ?")
            vals.append(v)

    if not updates:
        conn.close()
        return False

    vals.append(entry_id)
    sql = f"UPDATE timetable_entries SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(sql, vals)
    conn.commit()
    conn.close()
    return True

def delete_entry_record(entry_id: str) -> bool:
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM timetable_entries WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()
    return True

def delete_timetable(timetable_id: str) -> bool:
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if timetable was active
    cursor.execute("SELECT is_active, filename FROM timetables WHERE id = ?", (timetable_id,))
    row = cursor.fetchone()
    was_active = bool(row["is_active"]) if row else False
    filename = row["filename"] if row else None
    
    # Delete child entries and timetable record
    cursor.execute("DELETE FROM timetable_entries WHERE timetable_id = ?", (timetable_id,))
    cursor.execute("DELETE FROM timetables WHERE id = ?", (timetable_id,))
    
    # If deleted timetable was active, activate the latest remaining timetable
    if was_active:
        cursor.execute("SELECT id FROM timetables ORDER BY upload_date DESC LIMIT 1")
        latest = cursor.fetchone()
        if latest:
            cursor.execute("UPDATE timetables SET is_active = 1 WHERE id = ?", (latest["id"],))
            
    conn.commit()
    conn.close()
    return True

