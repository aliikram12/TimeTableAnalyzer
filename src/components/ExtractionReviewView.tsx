import React from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Edit3, 
  Sparkles,
  ExternalLink
} from "lucide-react";
import { TimetableEntry, ConflictItem } from "../types";

interface ExtractionReviewViewProps {
  entries: TimetableEntry[];
  conflicts: ConflictItem[];
  onEditRecord: (entry: TimetableEntry) => void;
  onOpenPdfPage: (page: number) => void;
}

export const ExtractionReviewView: React.FC<ExtractionReviewViewProps> = ({
  entries,
  conflicts,
  onEditRecord,
  onOpenPdfPage,
}) => {
  const flaggedEntries = entries.filter(e => e.hasConflict || e.needsReview || (e.confidence && e.confidence < 0.8));

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header Diagnostic Card */}
      <div className="skeuo-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white shadow-[0_3px_8px_rgba(0,0,0,0.15)] border-t border-white/50 shrink-0 ${
            conflicts.length > 0 
              ? "bg-gradient-to-br from-red-500 to-rose-700 shadow-red-500/30" 
              : "bg-gradient-to-br from-[#2A9D8F] to-[#21867A] shadow-emerald-500/20"
          }`}>
            {conflicts.length > 0 ? <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" /> : <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" />}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm sm:text-base font-extrabold text-[#3D2B1F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                Timetable Extraction Audit & Conflict Diagnostic
              </h3>
              <span className={`skeuo-badge px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1.5 ${
                conflicts.length > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                {conflicts.length > 0 ? <span className="skeuo-led-red"></span> : <span className="skeuo-led-green"></span>}
                {conflicts.length > 0 ? `${conflicts.length} Overlaps` : "Grid Clean"}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#A0897D] font-medium">
              Automated conflict validation powered by Pandas & NumPy table matrices. Audit flagged entries or apply manual corrections.
            </p>
          </div>
        </div>
      </div>

      {/* Conflicts Section */}
      {conflicts.length > 0 ? (
        <div className="space-y-3.5">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-red-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            Detected Timetable Overlaps ({conflicts.length})
          </h4>

          <div className="space-y-3.5">
            {conflicts.map((conflict, idx) => {
              const matchedEntries = entries.filter(e => conflict.entryIds.includes(e.id));
              return (
                <div
                  key={idx}
                  className="neu-raised p-5 border-l-4 border-l-red-500"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="skeuo-badge text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 bg-red-100 text-red-800 border-red-200 inline-block mb-1">
                        {conflict.type === "TEACHER_CONFLICT" ? "Teacher Double-Booking" : "Room Double-Booking"}
                      </span>
                      <p className="text-xs font-extrabold text-[#3D2B1F] mt-1">
                        {conflict.description}
                      </p>
                    </div>
                    <span className="skeuo-badge text-xs font-bold text-[#7A6559] px-3 py-1">
                      {conflict.day}
                    </span>
                  </div>

                  {/* Conflicting entries side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3">
                    {matchedEntries.map((item) => (
                      <div
                        key={item.id}
                        className="skeuo-card p-3.5 text-xs flex flex-col justify-between border-red-200"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="skeuo-badge px-2 py-0.5 text-[11px] font-bold text-red-800 bg-red-50 border-red-200">
                              {item.time}
                            </span>
                            {item.sourcePage && (
                              <button
                                onClick={() => onOpenPdfPage(item.sourcePage!)}
                                className="skeuo-badge px-1.5 py-0.2 text-[10px] text-[#A0897D] hover:text-[#E76F51] flex items-center gap-1 cursor-pointer"
                              >
                                <span>p.{item.sourcePage}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                          <div className="font-extrabold text-[#3D2B1F] text-xs mt-1 mb-2">
                            {item.subject}
                          </div>
                          <div className="space-y-1 text-[#7A6559] text-[11px]">
                            <div>Teacher: <strong>{item.teacher}</strong></div>
                            <div>Room: <strong className="text-[#21867A]">{item.room}</strong></div>
                            <div>Class: {item.className || item.program}</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onEditRecord(item)}
                          className="skeuo-btn-surface mt-3 w-full py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Resolve / Edit Class
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="neu-raised-sm p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-[#2A9D8F] mx-auto mb-2" />
          <h4 className="text-sm font-extrabold text-[#3D2B1F]">Zero Schedule Conflicts</h4>
          <p className="text-xs text-[#A0897D] mt-1 max-w-sm mx-auto">
            No overlapping rooms or double-booked instructors detected across this academic timetable.
          </p>
        </div>
      )}

      {/* Flagged or Needs Review Entries */}
      <div className="space-y-3.5">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3D2B1F] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#E76F51]" />
          All Flagged Sessions ({flaggedEntries.length})
        </h4>

        {flaggedEntries.length === 0 ? (
          <div className="neu-raised-sm p-5 sm:p-6 text-center text-xs text-[#A0897D] font-medium">
            All timetable entries passed coordinate verification with 100% confidence.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {flaggedEntries.map((e) => (
              <div
                key={e.id}
                className="skeuo-card p-4 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="skeuo-badge px-2 py-0.5 text-[10px] text-[#C05633] font-bold">
                      {e.day} • {e.time}
                    </span>
                    {e.hasConflict && (
                      <span className="skeuo-badge px-1.5 py-0.2 text-[10px] text-red-700 bg-red-50 border-red-200 font-bold">
                        Conflict
                      </span>
                    )}
                  </div>
                  <h5 className="font-extrabold text-[#3D2B1F] text-xs mb-1.5">{e.subject}</h5>
                  <div className="text-[11px] text-[#7A6559] space-y-1">
                    <div>Teacher: {e.teacher || "TBA"}</div>
                    <div>Room: <strong className="text-[#21867A]">{e.room}</strong></div>
                    <div>Class: {e.className || e.program}</div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#D4B8A0]/60 flex items-center justify-between">
                  {e.sourcePage && (
                    <button
                      type="button"
                      onClick={() => onOpenPdfPage(e.sourcePage!)}
                      className="text-[10px] text-[#A0897D] hover:text-[#E76F51] flex items-center gap-1 cursor-pointer"
                    >
                      <span>PDF p.{e.sourcePage}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEditRecord(e)}
                    className="skeuo-btn-surface px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
