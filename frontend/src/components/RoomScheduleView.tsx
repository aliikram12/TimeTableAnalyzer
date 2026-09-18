import React, { useState, useMemo } from "react";
import { 
  MapPin, 
  Clock, 
  User, 
  Calendar, 
  Download, 
  ExternalLink
} from "lucide-react";
import { TimetableEntry } from "../types";
import { exportScheduleToPDF } from "../lib/pdfExport";

interface RoomScheduleViewProps {
  entries: TimetableEntry[];
  rooms: string[];
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

export const RoomScheduleView: React.FC<RoomScheduleViewProps> = ({
  entries,
  rooms,
  onOpenPdfPage,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<string>(rooms[0] || "");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRooms = useMemo(() => {
    if (!searchQuery) return rooms;
    return rooms.filter(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [rooms, searchQuery]);

  const roomEntries = useMemo(() => {
    if (!selectedRoom) return [];
    return entries.filter(
      e => (e.room || "").toLowerCase() === selectedRoom.toLowerCase()
    );
  }, [entries, selectedRoom]);

  // Compute room utilization metrics
  const { totalSessions, occupiedDays, totalHours } = useMemo(() => {
    const days = new Set<string>();
    let hours = 0;
    roomEntries.forEach(e => {
      if (e.day) days.add(e.day);
      hours += Number(e.durationHours || 1.5);
    });
    return {
      totalSessions: roomEntries.length,
      occupiedDays: days.size,
      totalHours: Math.round(hours * 10) / 10,
    };
  }, [roomEntries]);

  const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const groupedSchedule = useMemo(() => {
    const map: Record<string, TimetableEntry[]> = {};
    daysOrder.forEach(d => { map[d] = []; });
    roomEntries.forEach(e => {
      const d = e.day || "Other";
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    Object.keys(map).forEach(d => {
      map[d].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    });
    return map;
  }, [roomEntries]);

  const handleExportPDF = () => {
    if (!selectedRoom) return;
    exportScheduleToPDF(
      roomEntries,
      `Room Occupancy Schedule - ${selectedRoom}`,
      "Department of Software Engineering • Facility Utilization Ledger",
      {
        Venue: selectedRoom,
        "Total Sessions": `${totalSessions} classes`,
        "Active Days": `${occupiedDays} days`,
        "Occupied Time": `${totalHours} hrs/wk`
      }
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Room Selector Deck */}
      <div className="skeuo-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 mb-4 sm:mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#2A9D8F] to-[#21867A] text-white flex items-center justify-center shadow-[0_3px_8px_rgba(42,157,143,0.4)] border-t border-white/50 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#3D2B1F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                Room & Lab Occupancy Schedule
              </h3>
              <p className="text-[11px] sm:text-xs text-[#A0897D] font-medium">Track timetable bookings, lab utilization, and free periods for any classroom</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={!selectedRoom || roomEntries.length === 0}
            className="skeuo-btn-primary w-full sm:w-auto justify-center px-3.5 py-1.5 text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Room PDF
          </button>
        </div>

        {/* Dropdown & Fast Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-[#3D2B1F] mb-1.5">
              Select Room / Laboratory
            </label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="neu-select w-full text-xs px-3 py-2.5 font-medium cursor-pointer"
            >
              <option value="">-- Choose Venue ({rooms.length}) --</option>
              {filteredRooms.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#3D2B1F] mb-1.5">
              Quick Filter by Room Name
            </label>
            <input
              type="text"
              placeholder="Type room number / lab..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neu-input w-full text-xs px-3 py-2.5 font-medium"
            />
          </div>
        </div>

        {/* Utilization Metrics Strip (Tactile Cards) */}
        {selectedRoom && (
          <div className="mt-4 sm:mt-5 grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-2.5 sm:gap-3.5 pt-4 border-t border-[#D4B8A0]/60">
            <div className="neu-raised-sm p-3 sm:p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#21867A] block">Total Bookings</span>
              <span className="text-xl sm:text-2xl font-extrabold text-[#3D2B1F] mt-0.5 block drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">{totalSessions}</span>
              <span className="text-[10px] font-semibold text-[#A0897D]">Scheduled sessions</span>
            </div>

            <div className="neu-raised-sm p-3 sm:p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C05633] block">Days Utilized</span>
              <span className="text-xl sm:text-2xl font-extrabold text-[#3D2B1F] mt-0.5 block drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">{occupiedDays} / 6</span>
              <span className="text-[10px] font-semibold text-[#A0897D]">Active teaching days</span>
            </div>

            <div className="neu-raised-sm p-3 sm:p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E76F51] block">Occupied Hours</span>
              <span className="text-xl sm:text-2xl font-extrabold text-[#3D2B1F] mt-0.5 block drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">{totalHours} hrs</span>
              <span className="text-[10px] font-semibold text-[#A0897D]">Weekly utilization load</span>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Schedule by Day */}
      {selectedRoom ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {daysOrder.map((day) => {
            const dayEntries = groupedSchedule[day] || [];
            const theme = DAY_THEMES[day] || DAY_THEMES["Monday"];

            return (
              <div
                key={day}
                className="neu-raised overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-[9px_9px_20px_rgba(200,170,145,0.55),-9px_-9px_20px_rgba(255,255,255,0.95)]"
              >
                <div className="px-4 py-3 bg-gradient-to-r from-[#FFFDF9] to-[#FCEFE3] border-b border-[#D4B8A0] flex items-center justify-between relative">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.bar}`}></div>
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${theme.text}`} />
                    <span className="text-xs font-extrabold text-[#3D2B1F] tracking-wide">{day.toUpperCase()}</span>
                  </div>
                  <span className={`skeuo-badge text-[10px] px-2 py-0.5 font-bold ${theme.badge}`}>
                    {dayEntries.length} {dayEntries.length === 1 ? "session" : "sessions"}
                  </span>
                </div>

                <div className="p-3.5 space-y-3 flex-1">
                  {dayEntries.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center text-[#A0897D] text-xs text-center p-4">
                      <Clock className="w-4 h-4 text-[#C8AA91] mb-1" />
                      <span className="font-medium">Room free on this day</span>
                    </div>
                  ) : (
                    dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="skeuo-card p-3.5 transition-all text-xs hover:border-[#E76F51]/40"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="skeuo-badge px-2.5 py-0.5 text-[11px] text-[#21867A] font-bold flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-[#2A9D8F]" />
                            {entry.time}
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

                        <h4 className="font-extrabold text-[#3D2B1F] text-xs mb-1.5 leading-snug">
                          {entry.subject}
                          {entry.courseCode && (
                            <span className="ml-1.5 text-[10px] font-bold text-[#C05633] bg-[#FCEFE3] px-1.5 py-0.2 rounded border border-[#D4B8A0]">
                              {entry.courseCode}
                            </span>
                          )}
                        </h4>

                        <div className="flex items-center gap-1.5 text-[#7A6559] mt-2.5 pt-2 border-t border-[#D4B8A0]/60">
                          <User className="w-3.5 h-3.5 text-[#A0897D] shrink-0" />
                          <span className="truncate font-semibold text-[#3D2B1F]">{entry.teacher || "Faculty TBA"}</span>
                        </div>

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
      ) : (
        <div className="neu-raised-lg p-12 text-center max-w-md mx-auto">
          <MapPin className="w-12 h-12 text-[#A0897D] mx-auto mb-3" />
          <p className="text-sm font-bold text-[#3D2B1F]">Please select a room above</p>
          <p className="text-xs text-[#A0897D] mt-1">Room reservations and scheduled lectures will load automatically</p>
        </div>
      )}
    </div>
  );
};
