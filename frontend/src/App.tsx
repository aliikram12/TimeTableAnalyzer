import React, { useState, useEffect, useCallback } from "react";
import { 
  Loader2, 
  AlertCircle, 
  UploadCloud, 
  Sparkles, 
  Search, 
  FileText, 
  Calendar, 
  GraduationCap, 
  Users, 
  MapPin, 
  Grid3X3, 
  Table as TableIcon, 
  ShieldCheck 
} from "lucide-react";
import { Navbar } from "./components/Navbar";
import { DashboardStats } from "./components/DashboardStats";
import { StudentScheduleView } from "./components/StudentScheduleView";
import { TeacherScheduleView } from "./components/TeacherScheduleView";
import { RoomScheduleView } from "./components/RoomScheduleView";
import { WeeklyMatrixView } from "./components/WeeklyMatrixView";
import { AdminDataTable } from "./components/AdminDataTable";
import { ExtractionReviewView } from "./components/ExtractionReviewView";
import { UploadModal } from "./components/UploadModal";
import { PdfViewerModal } from "./components/PdfViewerModal";
import { EditRecordModal } from "./components/EditRecordModal";
import { 
  UserRole, 
  ActiveView, 
  TimetableDoc, 
  TimetableEntry, 
  TimetableSummary 
} from "./types";
import { exportScheduleToPDF } from "./lib/pdfExport";
import { API_BASE_URL } from "./config";

export default function App() {
  const [timetable, setTimetable] = useState<TimetableDoc | null>(null);
  const [timetablesList, setTimetablesList] = useState<TimetableSummary[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>("student");
  const [currentView, setCurrentView] = useState<ActiveView>("dashboard");

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [pdfPage, setPdfPage] = useState(1);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch timetable data
  const loadTimetable = useCallback(async (id?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = id ? `${API_BASE_URL}/api/timetable?id=${id}` : `${API_BASE_URL}/api/timetable`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to load timetable data");
      }
      const data = await res.json();
      setTimetable(data);

      // Also refresh timetable versions list
      const listRes = await fetch(`${API_BASE_URL}/api/timetables`);
      if (listRes.ok) {
        const list = await listRes.json();
        setTimetablesList(list || []);
      }
    } catch (err: any) {
      setError(err.message || "Could not connect to backend server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const handleSelectTimetable = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/timetables/active/${id}`, { method: "POST" });
      loadTimetable(id);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleLoadSample = async () => {
    const res = await fetch(`${API_BASE_URL}/api/sample-timetable`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to generate sample");
    const data = await res.json();
    setTimetable(data.timetable);
    // Refresh list
    const listRes = await fetch(`${API_BASE_URL}/api/timetables`);
    if (listRes.ok) setTimetablesList(await listRes.json());
  };

  const handleUploadSuccess = (newTimetable: TimetableDoc) => {
    setTimetable(newTimetable);
    setCurrentView("dashboard");
    // Refresh list
    fetch(`${API_BASE_URL}/api/timetables`)
      .then(res => res.json())
      .then(list => setTimetablesList(list || []));
  };

  const handleOpenPdfPage = (page: number) => {
    setPdfPage(page);
    setIsPdfOpen(true);
  };

  const handleSaveRecord = async (updatedFields: Partial<TimetableEntry>) => {
    if (!timetable) return;
    if (editingEntry) {
      // Edit existing
      const res = await fetch(`${API_BASE_URL}/api/records/${editingEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      if (!res.ok) throw new Error("Failed to update record");
    } else {
      // Add new
      const newRecord = {
        ...updatedFields,
        id: `custom-${Date.now()}`,
        timetableId: timetable.id,
      };
      const res = await fetch(`${API_BASE_URL}/api/records/${newRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });
      if (!res.ok) throw new Error("Failed to add new record");
    }
    // Reload active timetable data
    await loadTimetable(timetable.id);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!timetable) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/records/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");
      await loadTimetable(timetable.id);
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleDeleteTimetable = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/timetables/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete timetable");
      }
      await loadTimetable();
    } catch (err: any) {
      alert("Error deleting timetable: " + err.message);
    }
  };

  // Global search filtering if search term provided
  const visibleEntries = React.useMemo(() => {
    if (!timetable?.entries) return [];
    if (!searchQuery.trim()) return timetable.entries;
    const q = searchQuery.toLowerCase();
    return timetable.entries.filter(e =>
      (e.subject || "").toLowerCase().includes(q) ||
      (e.teacher || "").toLowerCase().includes(q) ||
      (e.room || "").toLowerCase().includes(q) ||
      (e.program || "").toLowerCase().includes(q) ||
      (e.className || "").toLowerCase().includes(q) ||
      (e.courseCode || "").toLowerCase().includes(q) ||
      (e.section || "").toLowerCase().includes(q) ||
      (e.shift || "").toLowerCase().includes(q) ||
      (e.batch || "").toLowerCase().includes(q) ||
      (e.day || "").toLowerCase().includes(q) ||
      (e.time || "").toLowerCase().includes(q)
    );
  }, [timetable, searchQuery]);

  const handleExport = (format: "pdf" | "csv" | "excel") => {
    if (!timetable) return;
    const isFiltered = searchQuery.trim().length > 0;
    const entriesToExport = isFiltered ? visibleEntries : (timetable.entries || []);

    if (format === "csv") {
      const searchParam = isFiltered ? `&search=${encodeURIComponent(searchQuery.trim())}` : "";
      window.location.href = `${API_BASE_URL}/api/export/csv?timetableId=${timetable.id}${searchParam}`;
    } else if (format === "excel") {
      const searchParam = isFiltered ? `&search=${encodeURIComponent(searchQuery.trim())}` : "";
      window.location.href = `${API_BASE_URL}/api/export/excel?timetableId=${timetable.id}${searchParam}`;
    } else if (format === "pdf") {
      // Determine dynamic title and metadata reflecting active filter or active view
      let exportTitle = `${timetable.originalName || "Master Timetable"}`;
      let exportSub = "Official Academic Timetable Ledger";
      const metaInfo: Record<string, string> = {};

      if (isFiltered) {
        exportTitle = `Filtered Timetable - "${searchQuery.trim()}"`;
        exportSub = `Custom Filtered Academic Schedule • ${entriesToExport.length} sessions`;
        metaInfo["Search Filter"] = `"${searchQuery.trim()}"`;
        metaInfo["Matching Classes"] = `${entriesToExport.length} sessions`;
        metaInfo["Total Database"] = `${timetable.entries?.length || 0} classes`;
        metaInfo["Department"] = "Software Engineering";
      } else if (currentView === "student") {
        exportTitle = "Student Academic Schedule";
        exportSub = "Program & Section Class Ledger";
        metaInfo["Total Classes"] = `${entriesToExport.length} sessions`;
        metaInfo["Programs"] = `${timetable.stats?.programsCount || (timetable.stats?.programs?.length || 1)}`;
        metaInfo["Department"] = "Software Engineering";
      } else if (currentView === "teacher") {
        exportTitle = "Faculty Teaching Timetable";
        exportSub = "Instructor Academic Roster & Workload Ledger";
        metaInfo["Lectures"] = `${entriesToExport.length} sessions`;
        metaInfo["Faculty Count"] = `${timetable.stats?.teachersCount || (timetable.stats?.teachers?.length || 1)}`;
        metaInfo["Department"] = "Software Engineering";
      } else if (currentView === "room") {
        exportTitle = "Room & Lab Allocation Schedule";
        exportSub = "Facility Occupancy & Utilization Ledger";
        metaInfo["Allocations"] = `${entriesToExport.length} sessions`;
        metaInfo["Active Rooms"] = `${timetable.stats?.roomsCount || (timetable.stats?.rooms?.length || 1)}`;
        metaInfo["Department"] = "Software Engineering";
      } else if (currentView === "grid") {
        exportTitle = "Weekly Master Schedule Matrix";
        exportSub = "Weekly Academic Grid Ledger";
        metaInfo["Total Sessions"] = `${entriesToExport.length} sessions`;
        metaInfo["View"] = "Weekly Matrix";
        metaInfo["Department"] = "Software Engineering";
      } else {
        metaInfo["Total Classes"] = `${entriesToExport.length} sessions`;
        metaInfo["Academic Dept"] = "Software Engineering";
        metaInfo["Programs"] = `${timetable.stats?.programsCount || (timetable.stats?.programs?.length || 1)}`;
        metaInfo["Active Rooms"] = `${timetable.stats?.roomsCount || (timetable.stats?.rooms?.length || 1)}`;
      }

      exportScheduleToPDF(
        entriesToExport,
        exportTitle,
        exportSub,
        metaInfo
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F2] text-[#3D2B1F] flex flex-col font-sans selection:bg-[#FCEFE3] selection:text-[#E76F51]">
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        currentView={currentView}
        setCurrentView={setCurrentView}
        timetable={timetable}
        timetablesList={timetablesList}
        onSelectTimetable={handleSelectTimetable}
        onDeleteTimetable={handleDeleteTimetable}
        onOpenUpload={() => setIsUploadOpen(true)}
        onExport={handleExport}
        reviewCount={
          (timetable?.stats?.conflictsCount || 0) +
          (timetable?.stats?.reviewNeededCount || 0)
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="min-h-[50vh] flex flex-col items-center justify-center">
            <div className="neu-raised-sm p-6 flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-[#E76F51] animate-spin mb-3" />
              <p className="text-sm font-bold text-[#3D2B1F]">Loading Timetable Master...</p>
              <p className="text-xs text-[#A0897D] mt-1">Accessing SQLite database & schedules</p>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && !isLoading && (
          <div className="mb-4 sm:mb-6 p-4 bg-red-50 border border-red-300 rounded-2xl flex items-start gap-3 text-red-900 shadow-[0_4px_12px_rgba(239,68,68,0.15)]">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold">Could not load timetable</h4>
              <p className="text-xs mt-0.5 text-red-700">{error}</p>
            </div>
            <button
              onClick={() => loadTimetable()}
              className="skeuo-btn-surface px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* No Timetables Uploaded Empty State */}
        {!isLoading && !timetable && !error && (
          <div className="neu-raised-lg p-6 sm:p-10 text-center max-w-lg mx-auto my-6 sm:my-12">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#E76F51] to-[#C05633] text-white flex items-center justify-center mx-auto mb-4 shadow-[0_6px_16px_rgba(231,111,81,0.35)]">
              <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#3D2B1F]">No Active Timetable Found</h3>
            <p className="text-xs text-[#A0897D] mt-1 mb-5 sm:mb-6">
              All timetables were deleted or none have been uploaded yet. Upload a university PDF or load our sample schedule.
            </p>
            <div className="flex flex-col xs:flex-row items-center justify-center gap-2.5 sm:gap-3">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="skeuo-btn-primary w-full xs:w-auto px-4 py-2 text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                Upload PDF Timetable
              </button>
              <button
                onClick={handleLoadSample}
                className="skeuo-btn-surface w-full xs:w-auto px-4 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#E76F51]" />
                Load Sample Data
              </button>
            </div>
          </div>
        )}

        {/* Loaded Content */}
        {!isLoading && timetable && (
          <div>
            {/* Global Search Bar (Tactile Recessed Well) */}
            <div className="mb-4 sm:mb-6">
              <div className="neu-pressed relative max-w-2xl p-1 flex items-center">
                <Search className="w-4 h-4 ml-2.5 sm:ml-3 text-[#A0897D] shrink-0" />
                <input
                  type="text"
                  placeholder="Search courses, teachers, rooms, days, time slots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs px-2.5 sm:px-3 py-2 bg-transparent text-[#3D2B1F] placeholder-[#C8AA91] focus:outline-none font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="skeuo-badge mr-2 px-2 py-0.5 text-[11px] text-[#7A6559] hover:text-[#3D2B1F] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="flex items-center gap-2 mt-2 ml-1 text-xs text-[#7A6559]">
                  <span className="skeuo-badge px-2 py-0.5 text-[10px] bg-[#FCEFE3] text-[#C05633]">
                    {visibleEntries.length} results
                  </span>
                  <span>found matching &ldquo;{searchQuery}&rdquo;</span>
                </div>
              )}
            </div>

            {/* View Switcher Container */}
            {currentView === "dashboard" && (
              <DashboardStats
                stats={timetable.stats}
                timetable={timetable}
                onNavigate={(view) => setCurrentView(view)}
              />
            )}

            {currentView === "student" && (
              <StudentScheduleView
                entries={visibleEntries}
                programs={timetable.stats.programs || ["BS Software Engineering"]}
                onOpenPdfPage={handleOpenPdfPage}
              />
            )}

            {currentView === "teacher" && (
              <TeacherScheduleView
                entries={visibleEntries}
                teachers={timetable.stats.teachers || []}
                onOpenPdfPage={handleOpenPdfPage}
              />
            )}

            {currentView === "room" && (
              <RoomScheduleView
                entries={visibleEntries}
                rooms={timetable.stats.rooms || []}
                onOpenPdfPage={handleOpenPdfPage}
              />
            )}

            {currentView === "grid" && (
              <WeeklyMatrixView
                entries={visibleEntries}
                onOpenPdfPage={handleOpenPdfPage}
                onEditRecord={(item) => {
                  setEditingEntry(item);
                  setIsEditOpen(true);
                }}
              />
            )}

            {currentView === "table" && (
              <AdminDataTable
                entries={visibleEntries}
                onEdit={(item) => {
                  setEditingEntry(item);
                  setIsEditOpen(true);
                }}
                onDelete={handleDeleteRecord}
                onAddNew={() => {
                  setEditingEntry(null);
                  setIsEditOpen(true);
                }}
                onOpenPdfPage={handleOpenPdfPage}
              />
            )}

            {currentView === "review" && (
              <ExtractionReviewView
                entries={visibleEntries}
                conflicts={timetable.conflicts || []}
                onEditRecord={(item) => {
                  setEditingEntry(item);
                  setIsEditOpen(true);
                }}
                onOpenPdfPage={handleOpenPdfPage}
              />
            )}

            {currentView === "pdf" && (
              <div className="neu-raised p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl neu-pressed text-[#E76F51] flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#3D2B1F]">
                    Original Timetable PDF
                  </h3>
                  <p className="text-xs text-[#A0897D] mt-1 max-w-md mx-auto">
                    {timetable.originalName} • {timetable.pageCount} Page(s) • Ready for high-resolution viewing
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setPdfPage(1);
                      setIsPdfOpen(true);
                    }}
                    className="skeuo-btn-primary px-4 py-2 text-xs rounded-xl cursor-pointer"
                  >
                    Open In-App PDF Viewer
                  </button>
                  <a
                    href={`${API_BASE_URL}/api/pdf-view/${timetable.id}`}
                    download={timetable.originalName}
                    className="skeuo-btn-surface px-4 py-2 text-xs rounded-xl"
                  >
                    Download File
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#FFF8F2] border-t border-[#D4B8A0] py-4 mt-auto text-xs text-[#A0897D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#3D2B1F]">Smart Timetable Analyzer</span>
            <span>•</span>
            <span>Python & PyMuPDF Extraction Pipeline</span>
          </div>
          <div className="text-[#A0897D]">
            Powered by SQLite & Pandas Grid Engine
          </div>
        </div>
      </footer>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
        onLoadSample={handleLoadSample}
      />

      {timetable && (
        <PdfViewerModal
          isOpen={isPdfOpen}
          timetableId={timetable.id}
          filename={timetable.filename}
          originalName={timetable.originalName}
          pageNumber={pdfPage}
          totalPageCount={timetable.pageCount}
          onClose={() => setIsPdfOpen(false)}
          onPageChange={(p) => setPdfPage(p)}
        />
      )}

      <EditRecordModal
        isOpen={isEditOpen}
        entry={editingEntry}
        onClose={() => {
          setIsEditOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveRecord}
      />
    </div>
  );
}
