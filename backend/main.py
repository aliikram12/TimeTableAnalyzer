import os
import json
import uuid
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine import TimetableEngine
from database.db import (
    get_timetable_data,
    list_all_timetables,
    set_active_timetable,
    update_entry_record,
    delete_entry_record,
    delete_timetable
)
from services.exporter import TimetableExporter

# Ensure environments
IS_VERCEL = os.environ.get("VERCEL") == "1"
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

if IS_VERCEL:
    UPLOADS_DIR = "/tmp/uploads"
    EXPORTS_DIR = "/tmp/exports"
    DATA_DIR = "/tmp/data"
else:
    UPLOADS_DIR = os.path.join(CURRENT_DIR, "uploads")
    EXPORTS_DIR = os.path.join(CURRENT_DIR, "exports")
    DATA_DIR = os.path.join(CURRENT_DIR, "data")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(EXPORTS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

app = FastAPI(title="Smart Timetable Analyzer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = TimetableEngine(uploads_dir=UPLOADS_DIR, exports_dir=EXPORTS_DIR)

@app.get("/")
def root():
    return {
        "name": "Smart Timetable Analyzer API",
        "version": "1.0.0",
        "status": "online",
        "endpoints": "/api"
    }

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "timestamp": os.popen("date").read().strip() if not IS_VERCEL else "Vercel",
        "environment": "production" if IS_VERCEL else "development"
    }

@app.post("/api/upload")
async def upload_pdf(pdf: UploadFile = File(...)):
    if not pdf.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    unique_name = f"{uuid.uuid4().hex}_{pdf.filename}"
    file_path = os.path.join(UPLOADS_DIR, unique_name)
    
    with open(file_path, "wb") as f:
        f.write(await pdf.read())
        
    return {
        "success": True,
        "file": {
            "filename": unique_name,
            "originalName": pdf.filename,
            "path": file_path
        }
    }

class AnalyzeRequest(BaseModel):
    filename: str
    originalName: Optional[str] = None

@app.post("/api/analyze")
def analyze_pdf(req: AnalyzeRequest):
    file_path = os.path.join(UPLOADS_DIR, req.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    try:
        result = engine.process_pdf(file_path, req.originalName or req.filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-and-analyze")
async def upload_and_analyze(pdf: UploadFile = File(...)):
    if not pdf.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    unique_name = f"{uuid.uuid4().hex}_{pdf.filename}"
    file_path = os.path.join(UPLOADS_DIR, unique_name)
    
    with open(file_path, "wb") as f:
        f.write(await pdf.read())
        
    try:
        result = engine.process_pdf(file_path, pdf.filename)
        timetable_data = get_timetable_data(result.get("timetableId"))
        return {
            "success": True,
            "analysis": result,
            "timetable": timetable_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sample-timetable")
def generate_sample_timetable():
    try:
        out_file = os.path.join(UPLOADS_DIR, "sample_university_timetable.pdf")
        created = engine.create_sample_university_pdf(out_file)
        result = engine.process_pdf(created, "sample_university_timetable.pdf", timetable_id="sample-timetable-default")
        timetable_data = get_timetable_data("sample-timetable-default")
        return {
            "success": True,
            "result": result,
            "timetable": timetable_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/timetable")
def get_timetable(id: Optional[str] = None):
    try:
        data = get_timetable_data(id)
        if not data:
            # Auto-load sample
            generate_sample_timetable()
            data = get_timetable_data("sample-timetable-default")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/timetables")
def list_timetables():
    return list_all_timetables() or []

@app.post("/api/timetables/active/{id}")
def set_active(id: str):
    set_active_timetable(id)
    return {"success": True, "activeId": id}

@app.delete("/api/timetables/{id}")
def del_timetable(id: str):
    result = delete_timetable(id)
    return {"success": True, "result": result}

@app.get("/api/programs")
def get_programs(id: Optional[str] = None):
    data = get_timetable_data(id)
    return data.get("stats", {}).get("programs", []) if data else []

@app.get("/api/teachers")
def get_teachers(id: Optional[str] = None):
    data = get_timetable_data(id)
    return data.get("stats", {}).get("teachers", []) if data else []

@app.get("/api/rooms")
def get_rooms(id: Optional[str] = None):
    data = get_timetable_data(id)
    return data.get("stats", {}).get("rooms", []) if data else []

@app.get("/api/subjects")
def get_subjects(id: Optional[str] = None):
    data = get_timetable_data(id)
    return data.get("stats", {}).get("subjects", []) if data else []

@app.get("/api/filter")
def filter_timetable(
    timetableId: Optional[str] = None,
    program: Optional[str] = None,
    year: Optional[str] = None,
    semester: Optional[str] = None,
    section: Optional[str] = None,
    teacher: Optional[str] = None,
    room: Optional[str] = None,
    subject: Optional[str] = None,
    day: Optional[str] = None,
    q: Optional[str] = None
):
    data = get_timetable_data(timetableId)
    if not data or not data.get("entries"):
        return []
    
    filtered = data["entries"]
    
    if program: filtered = [e for e in filtered if (e.get("program") or "").lower() == program.lower()]
    if year: filtered = [e for e in filtered if (e.get("year") or "").lower() == year.lower()]
    if semester: filtered = [e for e in filtered if semester.lower() in (e.get("semester") or "").lower()]
    if section: filtered = [e for e in filtered if (e.get("section") or "").lower() == section.lower()]
    if teacher: filtered = [e for e in filtered if teacher.lower() in (e.get("teacher") or "").lower()]
    if room: filtered = [e for e in filtered if room.lower() in (e.get("room") or "").lower()]
    if subject: filtered = [e for e in filtered if subject.lower() in (e.get("subject") or "").lower()]
    if day: filtered = [e for e in filtered if (e.get("day") or "").lower() == day.lower()]
    if q:
        q_lower = q.lower()
        filtered = [e for e in filtered if 
            q_lower in (e.get("subject") or "").lower() or
            q_lower in (e.get("teacher") or "").lower() or
            q_lower in (e.get("room") or "").lower() or
            q_lower in (e.get("program") or "").lower() or
            q_lower in (e.get("section") or "").lower() or
            q_lower in (e.get("day") or "").lower() or
            q_lower in (e.get("time") or "").lower()
        ]
        
    return filtered

@app.get("/api/student-schedule")
def get_student_schedule(
    timetableId: Optional[str] = None,
    program: Optional[str] = None,
    year: Optional[str] = None,
    semester: Optional[str] = None,
    section: Optional[str] = None
):
    data = get_timetable_data(timetableId)
    if not data or not data.get("entries"):
        return {"schedule": {}, "totalClasses": 0}
        
    entries = data["entries"]
    if program: entries = [e for e in entries if (e.get("program") or "").lower() == program.lower()]
    if year: entries = [e for e in entries if (e.get("year") or "").lower() == year.lower()]
    if semester: entries = [e for e in entries if semester.lower() in (e.get("semester") or "").lower()]
    if section: entries = [e for e in entries if (e.get("section") or "").lower() == section.lower()]
    
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    schedule = {d: [] for d in days}
    
    for e in entries:
        d = e.get("day") or "Unspecified"
        if d not in schedule: schedule[d] = []
        schedule[d].append(e)
        
    for d in schedule:
        schedule[d].sort(key=lambda x: x.get("startTime") or "")
        
    return {
        "schedule": schedule,
        "totalClasses": len(entries),
        "program": program,
        "semester": semester,
        "section": section
    }

@app.get("/api/teacher-schedule")
def get_teacher_schedule(
    timetableId: Optional[str] = None,
    teacher: Optional[str] = None
):
    if not teacher:
        raise HTTPException(status_code=400, detail="Teacher name required")
        
    data = get_timetable_data(timetableId)
    if not data or not data.get("entries"):
        return {"schedule": {}, "totalClasses": 0, "totalHours": 0}
        
    entries = [e for e in data["entries"] if (e.get("teacher") or "").lower() == teacher.lower()]
    
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    schedule = {d: [] for d in days}
    teaching_days = set()
    total_hours = 0
    
    for e in entries:
        d = e.get("day") or "Unspecified"
        if d not in schedule: schedule[d] = []
        schedule[d].append(e)
        if d != "Unspecified": teaching_days.add(d)
        try:
            total_hours += float(e.get("durationHours", 1.5))
        except:
            total_hours += 1.5
            
    return {
        "teacher": teacher,
        "schedule": schedule,
        "totalClasses": len(entries),
        "teachingDays": len(teaching_days),
        "totalHours": round(total_hours, 1)
    }

@app.get("/api/room-schedule")
def get_room_schedule(
    timetableId: Optional[str] = None,
    room: Optional[str] = None
):
    if not room:
        raise HTTPException(status_code=400, detail="Room name required")
        
    data = get_timetable_data(timetableId)
    if not data or not data.get("entries"):
        return {"schedule": {}, "totalClasses": 0}
        
    entries = [e for e in data["entries"] if (e.get("room") or "").lower() == room.lower()]
    schedule = {}
    for e in entries:
        d = e.get("day") or "Unspecified"
        if d not in schedule: schedule[d] = []
        schedule[d].append(e)
        
    return {
        "room": room,
        "schedule": schedule,
        "totalClasses": len(entries)
    }

@app.put("/api/records/{id}")
def update_record(id: str, fields: Dict[str, Any]):
    update_entry_record(id, fields)
    return {"success": True, "updatedId": id}

@app.delete("/api/records/{id}")
def delete_record(id: str):
    delete_entry_record(id)
    return {"success": True, "deletedId": id}

@app.get("/api/pdf-view/{id}")
def view_pdf(id: str):
    data = get_timetable_data(id)
    if not data or not data.get("filename"):
        raise HTTPException(status_code=404, detail="PDF not found")
        
    file_path = os.path.join(UPLOADS_DIR, data["filename"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file missing from storage")
        
    return FileResponse(
        file_path, 
        media_type="application/pdf", 
        filename=data.get("originalName", "timetable.pdf"), 
        content_disposition_type="inline"
    )

def _export_filtered_entries(timetableId, filterJson, search, type, filter_val):
    data = get_timetable_data(timetableId)
    if not data:
        raise HTTPException(status_code=404, detail="Timetable not found")
        
    entries = data.get("entries", [])
    filtered = entries
    
    if type == "class" and filter_val:
        filtered = [e for e in filtered if (e.get("className") or "").strip().lower() == filter_val.strip().lower()]
    elif type == "teacher" and filter_val:
        filtered = [e for e in filtered if (e.get("teacher") or "").strip().lower() == filter_val.strip().lower()]
    elif type == "room" and filter_val:
        filtered = [e for e in filtered if (e.get("room") or "").strip().lower() == filter_val.strip().lower()]

    if filterJson:
        try:
            fj = json.loads(filterJson)
            if fj.get("search"):
                q = str(fj["search"]).strip().lower()
                filtered = [e for e in filtered if any(q in str(v).lower() for v in e.values())]
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
        except:
            pass
            
    return filtered

@app.get("/api/export/csv")
def export_csv(
    timetableId: Optional[str] = None,
    filterJson: Optional[str] = None,
    search: Optional[str] = None,
    type: Optional[str] = None,
    filter: Optional[str] = None
):
    filtered = _export_filtered_entries(timetableId, filterJson, search, type, filter)
    out_path = os.path.join(EXPORTS_DIR, f"timetable_{uuid.uuid4().hex[:8]}.csv")
    TimetableExporter.export_csv(filtered, out_path)
    return FileResponse(out_path, filename="timetable_export.csv")

@app.get("/api/export/excel")
def export_excel(
    timetableId: Optional[str] = None,
    filterJson: Optional[str] = None,
    search: Optional[str] = None,
    type: Optional[str] = None,
    filter: Optional[str] = None
):
    filtered = _export_filtered_entries(timetableId, filterJson, search, type, filter)
    out_path = os.path.join(EXPORTS_DIR, f"timetable_{uuid.uuid4().hex[:8]}.xlsx")
    TimetableExporter.export_excel(filtered, out_path)
    return FileResponse(out_path, filename="timetable_export.xlsx")

@app.get("/api/export/pdf")
def export_pdf(
    timetableId: Optional[str] = None,
    filterJson: Optional[str] = None,
    search: Optional[str] = None,
    type: Optional[str] = None,
    filter: Optional[str] = None
):
    filtered = _export_filtered_entries(timetableId, filterJson, search, type, filter)
    out_path = os.path.join(EXPORTS_DIR, f"timetable_{uuid.uuid4().hex[:8]}.pdf")
    TimetableExporter.export_pdf(filtered, out_path, type or "full", filter or "")
    return FileResponse(out_path, filename="timetable_schedule.pdf")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
