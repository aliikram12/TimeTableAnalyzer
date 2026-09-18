import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import multer from "multer";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

// Robust directory locator that finds the backend root containing engine.py
// Handles: development (tsx server.ts), production (node dist/server.js), 
// Vercel serverless (/var/task/), Docker containers, and api/ subdirectory imports
function getBackendDir(): string {
  if (process.env.BACKEND_ROOT && fs.existsSync(path.join(process.env.BACKEND_ROOT, "engine.py"))) {
    return process.env.BACKEND_ROOT;
  }
  
  // Check multiple candidate directories
  const candidates = [
    path.dirname(__filename),                    // Same dir as this file (tsx server.ts)
    path.dirname(path.dirname(__filename)),       // Parent dir (node dist/server.js or api/index.ts)
    process.cwd(),                               // Current working directory
    path.join(process.cwd(), ".."),               // Parent of cwd
    "/var/task",                                  // Vercel serverless root
  ];

  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, "engine.py"))) {
        return dir;
      }
    } catch { /* ignore permission errors */ }
  }

  return process.cwd();
}

const BACKEND_DIR = getBackendDir();
const IS_VERCEL = process.env.VERCEL === "1";

const app = express();
const PORT = process.env.PORT || 3000;
const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");

// On Vercel, use /tmp for writable storage (serverless has ephemeral filesystem)
// Locally/Docker, use BACKEND_DIR subdirectories
const UPLOADS_DIR = process.env.UPLOADS_DIR || (IS_VERCEL ? "/tmp/uploads" : path.join(BACKEND_DIR, "uploads"));
const EXPORTS_DIR = process.env.EXPORTS_DIR || (IS_VERCEL ? "/tmp/exports" : path.join(BACKEND_DIR, "exports"));
const DATA_DIR = process.env.DATA_DIR || (IS_VERCEL ? "/tmp/data" : path.join(BACKEND_DIR, "data"));

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Configure CORS
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow any Vercel deployment preview / production URL by default if wildcard or pattern
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive CORS for deployed environments
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// Helper to run Python engine script
function runPythonEngine(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(BACKEND_DIR, "engine.py");
    const cmdArgs = [pythonScript, ...args];
    execFile(PYTHON_BIN, cmdArgs, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error("Python engine error:", stderr || err.message);
        return reject(new Error(stderr || err.message));
      }
      try {
        const trimmed = stdout.trim();
        const lines = trimmed.split("\n");
        const lastJsonLine = lines[lines.length - 1];
        const data = JSON.parse(lastJsonLine);
        resolve(data);
      } catch (parseErr) {
        console.error("Failed to parse Python output:", stdout);
        reject(new Error("Invalid engine response format: " + stdout));
      }
    });
  });
}

// Helper to query SQLite database directly via Python script
function queryDb(action: string, payload: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const backendDir = BACKEND_DIR.replace(/\\/g, "/");
    const script = `
import sys, json, os
sys.path.insert(0, '${backendDir}')
from database.db import get_timetable_data, list_all_timetables, set_active_timetable, update_entry_record, delete_entry_record, delete_timetable

action = sys.argv[1]
payload = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}

if action == "get_timetable":
    res = get_timetable_data(payload.get("id"))
    print(json.dumps(res))
elif action == "list_timetables":
    res = list_all_timetables()
    print(json.dumps(res))
elif action == "set_active":
    set_active_timetable(payload.get("id"))
    print(json.dumps({"success": True}))
elif action == "delete_timetable":
    ok = delete_timetable(payload.get("id"))
    print(json.dumps({"success": ok}))
elif action == "update_entry":
    ok = update_entry_record(payload.get("id"), payload.get("fields", {}))
    print(json.dumps({"success": ok}))
elif action == "delete_entry":
    ok = delete_entry_record(payload.get("id"))
    print(json.dumps({"success": ok}))
else:
    print(json.dumps({"error": "Unknown action"}))
`;
    execFile(PYTHON_BIN, ["-c", script, action, JSON.stringify(payload)], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(err);
      try {
        const lines = stdout.trim().split("\n");
        const data = JSON.parse(lines[lines.length - 1]);
        resolve(data);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// -------------------------------------------------------------
// HEALTH CHECKS
// -------------------------------------------------------------
app.get("/", (req, res) => {
  res.json({
    name: "Smart Timetable Analyzer API",
    version: "1.0.0",
    status: "online",
    endpoints: "/api"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    pythonBin: PYTHON_BIN,
    environment: process.env.NODE_ENV || "development"
  });
});

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Upload PDF
app.post("/api/upload", upload.single("pdf"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }
  res.json({
    success: true,
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
    },
  });
});

// Analyze uploaded PDF
app.post("/api/analyze", async (req, res) => {
  try {
    const { filename, originalName } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    const result = await runPythonEngine([
      "--action", "process",
      "--file", filePath,
      "--name", originalName || filename
    ]);

    res.json(result);
  } catch (error: any) {
    console.error("Analysis failed:", error);
    res.status(500).json({ error: error.message || "Failed to analyze timetable PDF" });
  }
});

// Combined Upload + Analyze (convenience endpoint for drag & drop)
app.post("/api/upload-and-analyze", upload.single("pdf"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file provided" });
  }
  try {
    const result = await runPythonEngine([
      "--action", "process",
      "--file", req.file.path,
      "--name", req.file.originalname
    ]);

    // Return the processed dataset
    const timetableData = await queryDb("get_timetable", { id: result.timetableId });
    res.json({
      success: true,
      analysis: result,
      timetable: timetableData
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Extraction pipeline failed" });
  }
});

// Generate & Load Sample University Timetable
app.post("/api/sample-timetable", async (req, res) => {
  try {
    const result = await runPythonEngine(["--action", "sample"]);
    const timetableData = await queryDb("get_timetable", { id: "sample-timetable-default" });
    res.json({
      success: true,
      result,
      timetable: timetableData
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load sample timetable" });
  }
});

// Get Active Timetable or specific by ?id=...
app.get("/api/timetable", async (req, res) => {
  try {
    const timetableId = req.query.id as string | undefined;
    let data = await queryDb("get_timetable", { id: timetableId });
    if (!data) {
      // Auto-load sample if no timetable exists yet
      await runPythonEngine(["--action", "sample"]);
      data = await queryDb("get_timetable", { id: "sample-timetable-default" });
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List all uploaded timetables
app.get("/api/timetables", async (req, res) => {
  try {
    const list = await queryDb("list_timetables");
    res.json(list || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Set active timetable
app.post("/api/timetables/active/:id", async (req, res) => {
  try {
    await queryDb("set_active", { id: req.params.id });
    res.json({ success: true, activeId: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete timetable by ID
app.delete("/api/timetables/:id", async (req, res) => {
  try {
    const result = await queryDb("delete_timetable", { id: req.params.id });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete timetable" });
  }
});

// Dynamic filter options
app.get("/api/programs", async (req, res) => {
  try {
    const data = await queryDb("get_timetable", { id: req.query.id });
    res.json(data?.stats?.programs || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/teachers", async (req, res) => {
  try {
    const data = await queryDb("get_timetable", { id: req.query.id });
    res.json(data?.stats?.teachers || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/rooms", async (req, res) => {
  try {
    const data = await queryDb("get_timetable", { id: req.query.id });
    res.json(data?.stats?.rooms || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/subjects", async (req, res) => {
  try {
    const data = await queryDb("get_timetable", { id: req.query.id });
    res.json(data?.stats?.subjects || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Filter timetable entries with multi-filter and search
app.get("/api/filter", async (req, res) => {
  try {
    const { timetableId, program, year, semester, section, teacher, room, subject, day, q } = req.query;
    const data = await queryDb("get_timetable", { id: timetableId });
    if (!data || !data.entries) {
      return res.json([]);
    }

    let filtered = data.entries;

    if (program) {
      filtered = filtered.filter((e: any) => (e.program || "").toLowerCase() === (program as string).toLowerCase());
    }
    if (year) {
      filtered = filtered.filter((e: any) => (e.year || "").toLowerCase() === (year as string).toLowerCase());
    }
    if (semester) {
      filtered = filtered.filter((e: any) => (e.semester || "").toLowerCase().includes((semester as string).toLowerCase()));
    }
    if (section) {
      filtered = filtered.filter((e: any) => (e.section || "").toLowerCase() === (section as string).toLowerCase());
    }
    if (teacher) {
      filtered = filtered.filter((e: any) => (e.teacher || "").toLowerCase().includes((teacher as string).toLowerCase()));
    }
    if (room) {
      filtered = filtered.filter((e: any) => (e.room || "").toLowerCase().includes((room as string).toLowerCase()));
    }
    if (subject) {
      filtered = filtered.filter((e: any) => (e.subject || "").toLowerCase().includes((subject as string).toLowerCase()));
    }
    if (day) {
      filtered = filtered.filter((e: any) => (e.day || "").toLowerCase() === (day as string).toLowerCase());
    }
    if (q) {
      const query = (q as string).toLowerCase();
      filtered = filtered.filter((e: any) =>
        (e.subject || "").toLowerCase().includes(query) ||
        (e.teacher || "").toLowerCase().includes(query) ||
        (e.room || "").toLowerCase().includes(query) ||
        (e.program || "").toLowerCase().includes(query) ||
        (e.section || "").toLowerCase().includes(query) ||
        (e.day || "").toLowerCase().includes(query) ||
        (e.time || "").toLowerCase().includes(query)
      );
    }

    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated Student Schedule
app.get("/api/student-schedule", async (req, res) => {
  try {
    const { timetableId, program, year, semester, section } = req.query;
    const data = await queryDb("get_timetable", { id: timetableId });
    if (!data || !data.entries) return res.json({ schedule: {}, totalClasses: 0 });

    let entries = data.entries;
    if (program) entries = entries.filter((e: any) => (e.program || "").toLowerCase() === (program as string).toLowerCase());
    if (year) entries = entries.filter((e: any) => (e.year || "").toLowerCase() === (year as string).toLowerCase());
    if (semester) entries = entries.filter((e: any) => (e.semester || "").toLowerCase().includes((semester as string).toLowerCase()));
    if (section) entries = entries.filter((e: any) => (e.section || "").toLowerCase() === (section as string).toLowerCase());

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const schedule: Record<string, any[]> = {};
    days.forEach(d => { schedule[d] = []; });

    entries.forEach((e: any) => {
      const d = e.day || "Unspecified";
      if (!schedule[d]) schedule[d] = [];
      schedule[d].push(e);
    });

    // Sort each day by startTime
    Object.keys(schedule).forEach(d => {
      schedule[d].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    });

    res.json({
      schedule,
      totalClasses: entries.length,
      program,
      semester,
      section
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated Teacher Schedule with stats
app.get("/api/teacher-schedule", async (req, res) => {
  try {
    const { timetableId, teacher } = req.query;
    if (!teacher) return res.status(400).json({ error: "Teacher name required" });

    const data = await queryDb("get_timetable", { id: timetableId });
    if (!data || !data.entries) return res.json({ schedule: {}, totalClasses: 0, totalHours: 0 });

    const entries = data.entries.filter((e: any) =>
      (e.teacher || "").toLowerCase() === (teacher as string).toLowerCase()
    );

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const schedule: Record<string, any[]> = {};
    const teachingDays = new Set<string>();
    let totalHours = 0;

    entries.forEach((e: any) => {
      const d = e.day || "Unspecified";
      if (!schedule[d]) schedule[d] = [];
      schedule[d].push(e);
      if (d !== "Unspecified") teachingDays.add(d);
      totalHours += parseFloat(e.durationHours || 1.5);
    });

    res.json({
      teacher,
      schedule,
      totalClasses: entries.length,
      teachingDays: teachingDays.size,
      totalHours: Math.round(totalHours * 10) / 10
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated Room Schedule
app.get("/api/room-schedule", async (req, res) => {
  try {
    const { timetableId, room } = req.query;
    if (!room) return res.status(400).json({ error: "Room name required" });

    const data = await queryDb("get_timetable", { id: timetableId });
    if (!data || !data.entries) return res.json({ schedule: {}, totalClasses: 0 });

    const entries = data.entries.filter((e: any) =>
      (e.room || "").toLowerCase() === (room as string).toLowerCase()
    );

    const schedule: Record<string, any[]> = {};
    entries.forEach((e: any) => {
      const d = e.day || "Unspecified";
      if (!schedule[d]) schedule[d] = [];
      schedule[d].push(e);
    });

    res.json({
      room,
      schedule,
      totalClasses: entries.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update a single entry record
app.put("/api/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    await queryDb("update_entry", { id, fields });
    res.json({ success: true, updatedId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a single entry record
app.delete("/api/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await queryDb("delete_entry", { id });
    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve original uploaded PDF
app.get("/api/pdf-view/:id", async (req, res) => {
  try {
    const data = await queryDb("get_timetable", { id: req.params.id });
    if (!data || !data.filename) {
      return res.status(404).send("PDF not found");
    }
    const filePath = path.join(UPLOADS_DIR, data.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("PDF file missing from storage");
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${data.originalName || "timetable.pdf"}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    res.status(500).send("Error reading PDF");
  }
});

// Export endpoints (CSV, Excel, PDF)
app.get("/api/export/csv", async (req, res) => {
  try {
    const { timetableId, filterJson, search, type, filter } = req.query;
    const outPath = path.join(EXPORTS_DIR, `timetable_${Date.now()}.csv`);
    const fj = filterJson
      ? (filterJson as string)
      : JSON.stringify({ search: search || "", type: type || "", filter: filter || "" });
    const idArgs = timetableId ? ["--id", timetableId as string] : [];
    await runPythonEngine([
      "--action", "export_csv",
      ...idArgs,
      "--out", outPath,
      "--export_type", (type as string) || "full",
      "--filter_val", (filter as string) || "",
      "--filter_json", fj
    ]);
    res.download(outPath, "timetable_export.csv");
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/export/excel", async (req, res) => {
  try {
    const { timetableId, filterJson, search, type, filter } = req.query;
    const outPath = path.join(EXPORTS_DIR, `timetable_${Date.now()}.xlsx`);
    const fj = filterJson
      ? (filterJson as string)
      : JSON.stringify({ search: search || "", type: type || "", filter: filter || "" });
    const idArgs = timetableId ? ["--id", timetableId as string] : [];
    await runPythonEngine([
      "--action", "export_excel",
      ...idArgs,
      "--out", outPath,
      "--export_type", (type as string) || "full",
      "--filter_val", (filter as string) || "",
      "--filter_json", fj
    ]);
    res.download(outPath, "timetable_export.xlsx");
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/export/pdf", async (req, res) => {
  try {
    const { timetableId, filterJson, search, type, filter } = req.query;
    const outPath = path.join(EXPORTS_DIR, `timetable_${Date.now()}.pdf`);
    const fj = filterJson
      ? (filterJson as string)
      : JSON.stringify({ search: search || "", type: type || "", filter: filter || "" });
    const idArgs = timetableId ? ["--id", timetableId as string] : [];
    await runPythonEngine([
      "--action", "export_pdf",
      ...idArgs,
      "--out", outPath,
      "--export_type", (type as string) || "full",
      "--filter_val", (filter as string) || "",
      "--filter_json", fj
    ]);
    res.download(outPath, "timetable_schedule.pdf");
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// START SERVER (only when running directly, not imported by Vercel)
// -------------------------------------------------------------
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Timetable Analyzer Backend listening on port ${PORT}`);
    console.log(`Backend root: ${BACKEND_DIR}`);
    console.log(`Allowed CORS origins: ${allowedOrigins.join(", ")}`);
  });
}

// Export for Vercel Serverless Functions
export default app;
