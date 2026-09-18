import React, { useState, useMemo } from "react";
import { 
  Grid3X3, 
  Clock, 
  Download, 
  X,
  ExternalLink,
  Edit2
} from "lucide-react";
import { TimetableEntry } from "../types";
import { exportScheduleToPDF } from "../lib/pdfExport";

interface WeeklyMatrixViewProps {
  entries: TimetableEntry[];
  onOpenPdfPage: (page: number) => void;
  onEditRecord?: (entry: TimetableEntry) => void;
}

export const WeeklyMatrixView: React.FC<WeeklyMatrixViewProps> = ({
  entries,
  onOpenPdfPage,
  onEditRecord,
}) => {
  const [selectedProgram, setSelectedProgram] = useState<string>("BS Software Engineering");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [activeCellEntry, setActiveCellEntry] = useState<TimetableEntry | null>(null);

  // Extract unique programs & teachers
  const programs = useMemo(() => {
    const s = new Set<string>();
    entries.forEach(e => { if (e.program) s.add(e.program); });
    return Array.from(s).sort();
  }, [entries]);

  const teachers = useMemo(() => {
    const s = new Set<string>();
    entries.forEach(e => { if (e.teacher) s.add(e.teacher); });
    return Array.from(s).sort();
  }, [entries]);

  // Extract unique distinct time slots sorted chronologically
  const timeSlots = useMemo(() => {
    const timeSet = new Set<string>();
    entries.forEach(e => {
      if (e.time) timeSet.add(e.time);
    });
    const list = Array.from(timeSet);
    return list.sort((a, b) => {
      const matchA = a.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      const matchB = b.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!matchA || !matchB) return a.localeCompare(b);
      let hA = parseInt(matchA[1], 10);
      let hB = parseInt(matchB[1], 10);
      const isPMA = (matchA[3] || "").toUpperCase() === "PM";
      const isPMB = (matchB[3] || "").toUpperCase() === "PM";
      if (isPMA && hA < 12) hA += 12;
      if (isPMB && hB < 12) hB += 12;
      const minA = hA * 60 + parseInt(matchA[2], 10);
      const minB = hB * 60 + parseInt(matchB[2], 10);
      return minA - minB;
    });
  }, [entries]);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (selectedProgram && (e.program || "").toLowerCase() !== selectedProgram.toLowerCase()) return false;
      if (selectedTeacher && (e.teacher || "").toLowerCase() !== selectedTeacher.toLowerCase()) return false;
      return true;
    });
  }, [entries, selectedProgram, selectedTeacher]);

  // Map for fast matrix lookup: [day][time] -> TimetableEntry[]
  const gridMap = useMemo(() => {
    const map: Record<string, Record<string, TimetableEntry[]>> = {};
    days.forEach(d => {
      map[d] = {};
      timeSlots.forEach(t => {
        map[d][t] = [];
      });
    });

    filteredEntries.forEach(e => {
      if (e.day && map[e.day] && e.time && map[e.day][e.time]) {
        map[e.day][e.time].push(e);
      }
    });

    return map;
  }, [filteredEntries, days, timeSlots]);

  // Warm tactile color schemes for subjects matching Peach Cream & Terracotta
  const getSubjectColor = (subject: string) => {
    const colors = [
      "from-[#FFF5EE] to-[#FCEFE3] border-[#E76F51]/40 text-[#8B3A20]",
      "from-[#E8F8F5] to-[#D1F2EB] border-[#2A9D8F]/40 text-[#1B6D62]",
      "from-[#FFF9E6] to-[#FCF3CF] border-[#E9C46A]/50 text-[#7D6608]",
      "from-[#FBEEE6] to-[#F5CBA7] border-[#E59866]/50 text-[#873600]",
      "from-[#FADBD8] to-[#F5B7B1] border-[#E74C3C]/40 text-[#78281F]",
      "from-[#F5EBE6] to-[#EDDCD2] border-[#DDBEA9]/50 text-[#6B4D3C]",
    ];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
      hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  };

  const handleExportPDF = () => {
    exportScheduleToPDF(
      filteredEntries,
      "Master Timetable Matrix",
      "Weekly Academic Class Grid Ledger",
      {
        Program: selectedProgram || "All Programs",
        Faculty: selectedTeacher || "All Faculty",
        "Total Classes": `${filteredEntries.length} sessions`
      }
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Matrix Controls & Filters */}
      <div className="skeuo-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#E76F51] to-[#C05633] text-white flex items-center justify-center shadow-[0_3px_8px_rgba(231,111,81,0.4)] border-t border-white/50 shrink-0">
            <Grid3X3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-[#3D2B1F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
              Weekly Master Schedule Matrix
            </h3>
            <p className="text-[11px] sm:text-xs text-[#A0897D] font-medium">Cross-reference days and time slots with interactive tactile cells</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {/* Program filter */}
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="neu-select w-full sm:w-auto text-xs px-3 py-2 font-medium cursor-pointer"
          >
            <option value="">All Programs</option>
            {programs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Teacher filter */}
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="neu-select w-full sm:w-auto text-xs px-3 py-2 font-medium cursor-pointer"
          >
            <option value="">All Faculty</option>
            {teachers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <button
            type="button"
            onClick={handleExportPDF}
            className="skeuo-btn-primary w-full sm:w-auto justify-center px-3.5 py-1.5 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Grid PDF
          </button>
        </div>
      </div>

      {/* Tactile Matrix Ledger Container */}
      <div className="neu-raised overflow-hidden">
        {/* Mobile Swipe Guidance Banner */}
        <div className="px-3 py-1.5 bg-[#FCEFE3] border-b border-[#D4B8A0] text-[11px] font-semibold text-[#7A6559] flex items-center justify-between sm:hidden">
          <span>↔ Swipe sideways to view all times</span>
          <span className="skeuo-badge text-[10px] px-1.5 py-0.2 bg-white text-[#E76F51] font-bold">
            {timeSlots.length} Slots
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-[#3D2B1F] text-white font-bold divide-x divide-[#573F30] border-b-2 border-[#E76F51]">
                <th className="p-3.5 w-32 shrink-0 uppercase tracking-wider text-[11px] bg-[#2E1F16] text-[#F4A261] font-extrabold text-center">
                  Day / Time
                </th>
                {timeSlots.map((time) => (
                  <th key={time} className="p-3 min-w-[210px] font-bold tracking-tight text-center bg-[#3D2B1F]">
                    <div className="flex items-center justify-center gap-1.5 text-[#FFF8F2]">
                      <Clock className="w-3 h-3 text-[#F4A261]" />
                      <span>{time}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4B8A0]/60">
              {days.map((day) => (
                <tr key={day} className="divide-x divide-[#D4B8A0]/40 hover:bg-[#FCEFE3]/30 transition-colors">
                  {/* Day Row Header with 3D Pill styling */}
                  <td className="p-3.5 bg-[#FCEFE3] font-extrabold text-[#3D2B1F] text-xs text-center border-r border-[#D4B8A0]">
                    <span className="skeuo-badge px-2.5 py-1 text-[#3D2B1F] block uppercase tracking-wider">
                      {day}
                    </span>
                  </td>

                  {/* Time Slot Columns */}
                  {timeSlots.map((time) => {
                    const cellEntries = (gridMap[day] && gridMap[day][time]) || [];

                    return (
                      <td key={time} className="p-2.5 align-top min-h-[90px] bg-[#FFF8F2]/40">
                        {cellEntries.length === 0 ? (
                          <div className="h-16 flex items-center justify-center text-[#D4B8A0]">
                            <span className="text-sm select-none">•</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {cellEntries.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => setActiveCellEntry(item)}
                                className={`p-2.5 rounded-xl border bg-gradient-to-b shadow-[0_2px_4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[0_4px_10px_rgba(231,111,81,0.15)] hover:-translate-y-0.5 transition-all cursor-pointer ${getSubjectColor(item.subject || "")}`}
                              >
                                <div className="font-extrabold text-xs line-clamp-2 leading-snug mb-1">
                                  {item.subject}
                                </div>
                                <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-[#7A6559]">
                                  <span className="truncate max-w-[110px]">{item.teacher || "TBA"}</span>
                                  <span className="font-bold text-[#21867A]">{item.room}</span>
                                </div>
                                {item.className && (
                                  <div className="text-[10px] font-medium text-[#A0897D] mt-1 truncate">
                                    {item.className}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cell Detail Modal (Tactile Floating Dialog) */}
      {activeCellEntry && (
        <div className="fixed inset-0 z-50 bg-[#3D2B1F]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="neu-raised-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setActiveCellEntry(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 text-[#A0897D] hover:text-[#3D2B1F] rounded-lg hover:bg-[#FCEFE3] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="skeuo-badge px-2.5 py-0.5 text-xs text-[#C05633] font-bold">
                {activeCellEntry.day} • {activeCellEntry.time}
              </span>
              {activeCellEntry.courseCode && (
                <span className="skeuo-badge px-2 py-0.5 text-xs text-[#8B3A20] font-bold">
                  {activeCellEntry.courseCode}
                </span>
              )}
            </div>

            <h3 className="text-lg font-extrabold text-[#3D2B1F] leading-snug mb-4">
              {activeCellEntry.subject}
            </h3>

            <div className="space-y-2.5 text-xs text-[#3D2B1F] border-t border-b border-[#D4B8A0]/60 py-3 mb-4">
              <div className="flex justify-between">
                <span className="font-semibold text-[#A0897D]">Instructor:</span>
                <span className="font-bold text-[#3D2B1F]">{activeCellEntry.teacher || "TBA"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-[#A0897D]">Room / Laboratory:</span>
                <span className="font-bold text-[#21867A]">{activeCellEntry.room || "TBA"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-[#A0897D]">Class & Section:</span>
                <span className="font-bold text-[#3D2B1F]">
                  {activeCellEntry.className || `${activeCellEntry.program} (Sec ${activeCellEntry.section})`}
                </span>
              </div>
              {activeCellEntry.shift && (
                <div className="flex justify-between">
                  <span className="font-semibold text-[#A0897D]">Shift / Batch:</span>
                  <span className="font-bold text-[#3D2B1F]">{activeCellEntry.shift} ({activeCellEntry.batch})</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              {activeCellEntry.sourcePage && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenPdfPage(activeCellEntry.sourcePage!);
                    setActiveCellEntry(null);
                  }}
                  className="skeuo-btn-surface px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#E76F51]" />
                  Source PDF (p.{activeCellEntry.sourcePage})
                </button>
              )}
              {onEditRecord && (
                <button
                  type="button"
                  onClick={() => {
                    onEditRecord(activeCellEntry);
                    setActiveCellEntry(null);
                  }}
                  className="skeuo-btn-primary px-3 py-1.5 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Entry
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
