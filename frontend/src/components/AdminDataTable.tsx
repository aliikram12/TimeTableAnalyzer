import React, { useState, useMemo } from "react";
import { 
  Table as TableIcon, 
  Search, 
  Edit3, 
  Trash2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown,
  ExternalLink
} from "lucide-react";
import { TimetableEntry } from "../types";
import { exportScheduleToPDF } from "../lib/pdfExport";
import { API_BASE_URL } from "../config";

interface AdminDataTableProps {
  entries: TimetableEntry[];
  onEdit: (entry: TimetableEntry) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  onOpenPdfPage: (page: number) => void;
}

export const AdminDataTable: React.FC<AdminDataTableProps> = ({
  entries,
  onEdit,
  onDelete,
  onAddNew,
  onOpenPdfPage,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [sortField, setSortField] = useState<keyof TimetableEntry>("day");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filter lists
  const teachers = useMemo(() => {
    const s = new Set<string>();
    entries.forEach(e => { if (e.teacher) s.add(e.teacher); });
    return Array.from(s).sort();
  }, [entries]);

  const rooms = useMemo(() => {
    const s = new Set<string>();
    entries.forEach(e => { if (e.room) s.add(e.room); });
    return Array.from(s).sort();
  }, [entries]);

  // Filtered entries
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (dayFilter && (e.day || "").toLowerCase() !== dayFilter.toLowerCase()) return false;
      if (teacherFilter && (e.teacher || "").toLowerCase() !== teacherFilter.toLowerCase()) return false;
      if (roomFilter && (e.room || "").toLowerCase() !== roomFilter.toLowerCase()) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const combined = `${e.subject} ${e.teacher} ${e.room} ${e.day} ${e.time} ${e.program} ${e.section} ${e.className} ${e.courseCode}`.toLowerCase();
        if (!combined.includes(q)) return false;
      }
      return true;
    });
  }, [entries, dayFilter, teacherFilter, roomFilter, searchTerm]);

  // Sorted entries
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let vA = (a[sortField] || "").toString();
      let vB = (b[sortField] || "").toString();
      const comp = vA.localeCompare(vB);
      return sortAsc ? comp : -comp;
    });
  }, [filtered, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pagedEntries = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: keyof TimetableEntry) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExportCSV = () => {
    window.location.href = `${API_BASE_URL}/api/export/csv`;
  };

  const handleExportExcel = () => {
    window.location.href = `${API_BASE_URL}/api/export/excel`;
  };

  const handleExportPDF = () => {
    exportScheduleToPDF(
      sorted,
      "Timetable Database Records",
      "Full Verified SQLite Dataset Ledger",
      {
        "Records Exported": `${sorted.length} classes`,
        "Total Database": `${entries.length} classes`
      }
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Controls Deck (Skeuomorphic Card) */}
      <div className="skeuo-card p-4 sm:p-5 space-y-3.5 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#E76F51] to-[#C05633] text-white flex items-center justify-center shadow-[0_3px_8px_rgba(231,111,81,0.4)] border-t border-white/50 shrink-0">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#3D2B1F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                Database Records Explorer
              </h3>
              <p className="text-[11px] sm:text-xs text-[#A0897D] font-medium">Search, audit extraction confidence, and manage all parsed sessions</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onAddNew}
              className="skeuo-btn-primary flex-1 sm:flex-initial justify-center px-3 py-1.5 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Class
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="skeuo-btn-surface px-2.5 py-1.5 text-xs font-semibold rounded-xl cursor-pointer"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="skeuo-btn-surface px-2.5 py-1.5 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Excel
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="skeuo-btn-primary px-3 py-1.5 text-xs rounded-xl cursor-pointer"
            >
              PDF
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-3 border-t border-[#D4B8A0]/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#A0897D]" />
            <input
              type="text"
              placeholder="Search all columns..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="neu-input w-full text-xs pl-8 pr-3 py-2 font-medium"
            />
          </div>

          <select
            value={dayFilter}
            onChange={(e) => {
              setDayFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="neu-select text-xs px-3 py-2 font-medium cursor-pointer"
          >
            <option value="">All Days</option>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={teacherFilter}
            onChange={(e) => {
              setTeacherFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="neu-select text-xs px-3 py-2 font-medium cursor-pointer"
          >
            <option value="">All Instructors</option>
            {teachers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={roomFilter}
            onChange={(e) => {
              setRoomFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="neu-select text-xs px-3 py-2 font-medium cursor-pointer"
          >
            <option value="">All Rooms</option>
            {rooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Tactile Ledger Table Container */}
      <div className="neu-raised overflow-hidden">
        {/* Mobile Swipe Guidance Banner */}
        <div className="px-3 py-1.5 bg-[#FCEFE3] border-b border-[#D4B8A0] text-[11px] font-semibold text-[#7A6559] flex items-center justify-between sm:hidden">
          <span>↔ Swipe table horizontally</span>
          <span className="skeuo-badge text-[10px] px-1.5 py-0.2 bg-white text-[#E76F51] font-bold">
            {sorted.length} Entries
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#3D2B1F] text-white font-bold divide-x divide-[#573F30] border-b-2 border-[#E76F51]">
                <th
                  onClick={() => handleSort("day")}
                  className="p-3 cursor-pointer hover:text-[#F4A261] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Day</span>
                    <ArrowUpDown className="w-3 h-3 text-[#A0897D]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("startTime")}
                  className="p-3 cursor-pointer hover:text-[#F4A261] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Time Slot</span>
                    <ArrowUpDown className="w-3 h-3 text-[#A0897D]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("subject")}
                  className="p-3 cursor-pointer hover:text-[#F4A261] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Subject / Course</span>
                    <ArrowUpDown className="w-3 h-3 text-[#A0897D]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("teacher")}
                  className="p-3 cursor-pointer hover:text-[#F4A261] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Teacher</span>
                    <ArrowUpDown className="w-3 h-3 text-[#A0897D]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("room")}
                  className="p-3 cursor-pointer hover:text-[#F4A261] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Room</span>
                    <ArrowUpDown className="w-3 h-3 text-[#A0897D]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("className")}
                  className="p-3 cursor-pointer hover:text-[#F4A261] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Class & Section</span>
                    <ArrowUpDown className="w-3 h-3 text-[#A0897D]" />
                  </div>
                </th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4B8A0]/60">
              {pagedEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#A0897D] font-medium">
                    No matching class records found.
                  </td>
                </tr>
              ) : (
                pagedEntries.map((e) => (
                  <tr
                    key={e.id}
                    className={`hover:bg-[#FCEFE3]/50 transition-colors ${
                      e.hasConflict ? "bg-red-50/50" : ""
                    }`}
                  >
                    <td className="p-3 font-bold text-[#3D2B1F] whitespace-nowrap">
                      <span className="skeuo-badge px-2 py-0.5 text-[10px]">
                        {e.day}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-[#C05633] whitespace-nowrap">
                      {e.time || `${e.startTime} - ${e.endTime}`}
                    </td>
                    <td className="p-3 font-extrabold text-[#3D2B1F] max-w-[220px]">
                      <div>{e.subject}</div>
                      {e.courseCode && (
                        <span className="text-[10px] font-bold text-[#C05633] bg-[#FCEFE3] px-1.5 py-0.2 rounded border border-[#D4B8A0] mt-0.5 inline-block">
                          {e.courseCode}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-medium text-[#7A6559] whitespace-nowrap">
                      {e.teacher || "TBA"}
                    </td>
                    <td className="p-3 font-bold text-[#21867A] whitespace-nowrap">
                      {e.room || "TBA"}
                    </td>
                    <td className="p-3 text-[#7A6559] max-w-[180px]">
                      <div className="font-semibold truncate">{e.className || e.program}</div>
                      {e.section && (
                        <span className="text-[10px] text-orange-800 bg-orange-50 px-1 py-0.2 rounded font-bold">
                          Sec {e.section}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {e.hasConflict ? (
                        <span className="skeuo-badge px-2 py-0.5 text-[10px] bg-red-50 text-red-700 border-red-200 flex items-center justify-center gap-1 font-bold">
                          <span className="skeuo-led-red"></span>
                          Conflict
                        </span>
                      ) : e.needsReview ? (
                        <span className="skeuo-badge px-2 py-0.5 text-[10px] bg-amber-50 text-amber-700 border-amber-200 flex items-center justify-center gap-1 font-bold">
                          <span className="skeuo-led-amber"></span>
                          Review
                        </span>
                      ) : (
                        <span className="skeuo-badge px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center justify-center gap-1 font-bold">
                          <span className="skeuo-led-green"></span>
                          Valid
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {e.sourcePage && (
                          <button
                            type="button"
                            onClick={() => onOpenPdfPage(e.sourcePage!)}
                            className="p-1.5 text-[#A0897D] hover:text-[#E76F51] rounded-lg hover:bg-[#FCEFE3] transition-colors cursor-pointer"
                            title="View in source PDF"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEdit(e)}
                          className="skeuo-btn-surface p-1.5 rounded-lg cursor-pointer"
                          title="Edit record"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#7A6559]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete class "${e.subject}"?`)) {
                              onDelete(e.id);
                            }
                          }}
                          className="skeuo-btn-danger p-1.5 rounded-lg cursor-pointer"
                          title="Delete class"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-[#FCEFE3]/60 border-t border-[#D4B8A0]/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-0 text-xs text-[#7A6559]">
          <span className="font-semibold text-center sm:text-left">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} records
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="skeuo-btn-surface p-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="skeuo-badge px-2.5 py-1 text-[#3D2B1F] font-bold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="skeuo-btn-surface p-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
