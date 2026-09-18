import React, { useState, useMemo } from "react";
import { 
  GraduationCap, 
  Clock, 
  User, 
  MapPin, 
  Download, 
  RotateCcw, 
  Calendar, 
  ExternalLink
} from "lucide-react";
import { TimetableEntry } from "../types";
import { exportScheduleToPDF } from "../lib/pdfExport";

interface StudentScheduleViewProps {
  entries: TimetableEntry[];
  programs: string[];
  onOpenPdfPage: (page: number) => void;
}

const DAY_THEMES: Record<string, { bar: string; badge: string; text: string }> = {
  Monday: { bar: "from-[#E76F51] to-[#C05633]", badge: "bg-[#FCEFE3] text-[#C05633] border-[#E76F51]/30", text: "text-[#C05633]" },
  Tuesday: { bar: "from-[#2A9D8F] to-[#21867A]", badge: "bg-emerald-50 text-emerald-800 border-emerald-200", text: "text-emerald-700" },
  Wednesday: { bar: "from-[#F4A261] to-[#E76F51]", badge: "bg-orange-50 text-orange-800 border-orange-200", text: "text-orange-700" },
  Thursday: { bar: "from-[#E9C46A] to-[#D4A373]", badge: "bg-amber-50 text-amber-800 border-amber-200", text: "text-amber-700" },
  Friday: { bar: "from-[#BE123C] to-[#9F1239]", badge: "bg-rose-50 text-rose-800 border-rose-200", text: "text-rose-700" },
  Saturday: { bar: "from-[#9C6644] to-[#7F4F24]", badge: "bg-[#FCEFE3] text-[#7F4F24] border-[#D4B8A0]", text: "text-[#7F4F24]" },
};

export const StudentScheduleView: React.FC<StudentScheduleViewProps> = ({
  entries,
  programs,
  onOpenPdfPage,
}) => {
  // Cascading filter states
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");

  // Extract unique semesters from current program or all entries
  const availableSemesters = useMemo(() => {
    let pool = entries;
    if (selectedProgram) {
      pool = pool.filter(e => (e.program || "").toLowerCase() === selectedProgram.toLowerCase());
    }
    const set = new Set<string>();
    pool.forEach(e => {
      if (e.semester) set.add(e.semester);
    });
    return Array.from(set).sort();
  }, [entries, selectedProgram]);

  // Extract unique sections from current program + semester
  const availableSections = useMemo(() => {
    let pool = entries;
    if (selectedProgram) {
      pool = pool.filter(e => (e.program || "").toLowerCase() === selectedProgram.toLowerCase());
    }
    if (selectedSemester) {
      pool = pool.filter(e => (e.semester || "").toLowerCase() === selectedSemester.toLowerCase());
    }
    const set = new Set<string>();
    pool.forEach(e => {
      if (e.section) set.add(e.section);
    });
    return Array.from(set).sort();
  }, [entries, selectedProgram, selectedSemester]);

  // Filtered schedule
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (selectedProgram && (e.program || "").toLowerCase() !== selectedProgram.toLowerCase()) return false;
      if (selectedSemester && (e.semester || "").toLowerCase() !== selectedSemester.toLowerCase()) return false;
      if (selectedSection && (e.section || "").toLowerCase() !== selectedSection.toLowerCase()) return false;
      return true;
    });
  }, [entries, selectedProgram, selectedSemester, selectedSection]);

  // Group by day
  const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const groupedSchedule = useMemo(() => {
    const map: Record<string, TimetableEntry[]> = {};
    daysOrder.forEach(d => { map[d] = []; });
    filteredEntries.forEach(e => {
      const d = e.day || "Other";
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    // Sort by startTime
    Object.keys(map).forEach(d => {
      map[d].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    });
    return map;
  }, [filteredEntries]);

  const handleReset = () => {
    setSelectedProgram("");
    setSelectedSemester("");
    setSelectedSection("");
  };

  const handleExportPDF = () => {
    const title = selectedProgram 
      ? `${selectedProgram} Schedule` 
      : "Student Weekly Schedule";
    const subtitle = [
      selectedProgram,
      selectedSemester ? `Semester ${selectedSemester}` : "",
      selectedSection ? `Section ${selectedSection}` : ""
    ].filter(Boolean).join(" • ") || "All Degree Programs";

    exportScheduleToPDF(filteredEntries, title, subtitle, {
      Program: selectedProgram || "All Programs",
      Semester: selectedSemester ? `Semester ${selectedSemester}` : "All",
      Section: selectedSection ? `Section ${selectedSection}` : "All",
      "Total Classes": `${filteredEntries.length} sessions`
    });
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Student Filter Control Deck (Skeuomorphic) */}
      <div className="skeuo-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 mb-4 sm:mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#E76F51] to-[#C05633] text-white flex items-center justify-center shadow-[0_3px_8px_rgba(231,111,81,0.4)] border-t border-white/50 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#3D2B1F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                Student Timetable Finder
              </h3>
              <p className="text-[11px] sm:text-xs text-[#A0897D] font-medium">Filter by your degree program, semester, and section</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {(selectedProgram || selectedSemester || selectedSection) && (
              <button
                type="button"
                onClick={handleReset}
                className="skeuo-btn-surface px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={handleExportPDF}
              className="skeuo-btn-primary flex-1 sm:flex-initial justify-center px-3.5 py-1.5 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Official PDF
            </button>
          </div>
        </div>

        {/* Cascading Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
          {/* Program Selector */}
          <div>
            <label className="block text-xs font-bold text-[#3D2B1F] mb-1.5">
              Degree Program
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => {
                setSelectedProgram(e.target.value);
                setSelectedSemester("");
                setSelectedSection("");
              }}
              className="neu-select w-full text-xs px-3 py-2.5 font-medium cursor-pointer"
            >
              <option value="">All Programs ({programs.length})</option>
              {programs.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Semester Selector */}
          <div>
            <label className="block text-xs font-bold text-[#3D2B1F] mb-1.5">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setSelectedSection("");
              }}
              className="neu-select w-full text-xs px-3 py-2.5 font-medium cursor-pointer"
            >
              <option value="">All Semesters</option>
              {availableSemesters.map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div>
            <label className="block text-xs font-bold text-[#3D2B1F] mb-1.5">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="neu-select w-full text-xs px-3 py-2.5 font-medium cursor-pointer"
            >
              <option value="">All Sections</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>Section {sec}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Result Status */}
        <div className="mt-4 pt-3 border-t border-[#D4B8A0]/60 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1.5 text-xs text-[#A0897D]">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="skeuo-badge px-2 py-0.5 text-[10px] bg-[#FCEFE3] text-[#C05633]">
              {filteredEntries.length} classes
            </span>
            <span className="truncate max-w-[200px] xs:max-w-none">
              {selectedProgram && ` in ${selectedProgram}`}
              {selectedSemester && `, Sem ${selectedSemester}`}
              {selectedSection && `, Sec ${selectedSection}`}
            </span>
          </span>
          <span className="text-[11px] text-[#A0897D] font-medium">
            Chronological Order (Monday–Saturday)
          </span>
        </div>
      </div>

      {/* Day by Day Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {daysOrder.map((day) => {
          const dayEntries = groupedSchedule[day] || [];
          const theme = DAY_THEMES[day] || DAY_THEMES["Monday"];

          return (
            <div
              key={day}
              className="neu-raised overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-[9px_9px_20px_rgba(200,170,145,0.55),-9px_-9px_20px_rgba(255,255,255,0.95)]"
            >
              {/* Day Header with 3D Gradient Bar */}
              <div className="px-4 py-3 bg-gradient-to-r from-[#FFFDF9] to-[#FCEFE3] border-b border-[#D4B8A0] flex items-center justify-between relative">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.bar}`}></div>
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${theme.text}`} />
                  <span className="text-xs font-extrabold text-[#3D2B1F] tracking-wide">{day.toUpperCase()}</span>
                </div>
                <span className={`skeuo-badge text-[10px] px-2 py-0.5 font-bold ${theme.badge}`}>
                  {dayEntries.length} {dayEntries.length === 1 ? "class" : "classes"}
                </span>
              </div>

              {/* Day Class List */}
              <div className="p-3.5 space-y-3 flex-1">
                {dayEntries.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-[#A0897D] text-xs text-center p-4">
                    <Clock className="w-5 h-5 text-[#C8AA91] mb-1" />
                    <span className="font-medium">No sessions scheduled</span>
                  </div>
                ) : (
                  dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="skeuo-card p-3.5 transition-all text-xs hover:border-[#E76F51]/40"
                    >
                      {/* Time Slot Badge & Source Page Link */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="skeuo-badge px-2.5 py-0.5 text-[11px] text-[#C05633] font-bold flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#E76F51]" />
                          {entry.time || `${entry.startTime} - ${entry.endTime}`}
                        </span>

                        {entry.sourcePage && (
                          <button
                            type="button"
                            onClick={() => onOpenPdfPage(entry.sourcePage!)}
                            className="skeuo-badge px-1.5 py-0.2 text-[10px] text-[#A0897D] hover:text-[#C05633] flex items-center gap-1 cursor-pointer"
                            title="Verify in Original PDF"
                          >
                            <span>p.{entry.sourcePage}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      {/* Course Subject & Code */}
                      <h4 className="font-extrabold text-[#3D2B1F] text-xs mb-1.5 leading-snug">
                        {entry.subject}
                        {entry.courseCode && (
                          <span className="ml-1.5 text-[10px] font-bold text-[#C05633] bg-[#FCEFE3] px-1.5 py-0.2 rounded border border-[#D4B8A0]">
                            {entry.courseCode}
                          </span>
                        )}
                      </h4>

                      {/* Details: Teacher & Room */}
                      <div className="space-y-1.5 text-[#7A6559] mt-2.5 pt-2 border-t border-[#D4B8A0]/60">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#A0897D] shrink-0" />
                          <span className="truncate font-semibold text-[#3D2B1F]">{entry.teacher || "Faculty TBA"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#2A9D8F] shrink-0" />
                          <span className="truncate text-[#21867A] font-bold">{entry.room || "Room TBA"}</span>
                        </div>
                      </div>

                      {/* Class Name / Program / Section Badges */}
                      {(entry.className || entry.program || entry.section) && (
                        <div className="mt-2.5 pt-2 border-t border-[#D4B8A0]/40 flex flex-wrap gap-1">
                          {entry.className && (
                            <span className="text-[10px] bg-[#FCEFE3] text-[#3D2B1F] border border-[#D4B8A0] px-1.5 py-0.5 rounded font-semibold truncate max-w-full">
                              {entry.className}
                            </span>
                          )}
                          {entry.section && !entry.className?.includes(entry.section) && (
                            <span className="text-[10px] bg-orange-50 text-orange-800 border border-orange-200 px-1.5 py-0.5 rounded font-bold">
                              Sec {entry.section}
                            </span>
                          )}
                          {entry.shift && (
                            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                              {entry.shift}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
