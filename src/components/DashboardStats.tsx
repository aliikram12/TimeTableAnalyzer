import React from "react";
import { 
  BookOpen, 
  Users, 
  MapPin, 
  Clock, 
  CalendarDays, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  Layers,
  ArrowRight
} from "lucide-react";
import { TimetableStats, TimetableDoc } from "../types";

interface DashboardStatsProps {
  stats: TimetableStats;
  timetable: TimetableDoc;
  onNavigate: (view: any) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  stats,
  timetable,
  onNavigate,
}) => {
  const cards = [
    {
      label: "Total Classes",
      value: stats.totalEntries || 0,
      icon: BookOpen,
      iconGrad: "from-[#E76F51] to-[#C05633]",
      view: "table",
      desc: "Verified lectures in master grid"
    },
    {
      label: "Degree Programs",
      value: stats.programsCount || (stats.programs?.length || 1),
      icon: Layers,
      iconGrad: "from-[#F4A261] to-[#E76F51]",
      view: "student",
      desc: "Distinct academic tracks"
    },
    {
      label: "Faculty Members",
      value: stats.teachersCount || (stats.teachers?.length || 0),
      icon: Users,
      iconGrad: "from-[#D48B68] to-[#9C4124]",
      view: "teacher",
      desc: "Assigned course instructors"
    },
    {
      label: "Rooms & Labs",
      value: stats.roomsCount || (stats.rooms?.length || 0),
      icon: MapPin,
      iconGrad: "from-[#2A9D8F] to-[#21867A]",
      view: "room",
      desc: "Teaching spaces & labs"
    },
    {
      label: "Weekly Workload",
      value: `${stats.totalHours || 0} hrs`,
      icon: Clock,
      iconGrad: "from-[#F4A261] to-[#D48B68]",
      view: "grid",
      desc: "Cumulative instruction hours"
    },
    {
      label: "Active Days",
      value: `${stats.daysCount || (stats.days?.length || 5)} Days`,
      icon: CalendarDays,
      iconGrad: "from-[#E9C46A] to-[#E76F51]",
      view: "grid",
      desc: "Monday through Saturday"
    },
    {
      label: "Schedule Conflicts",
      value: stats.conflictsCount || 0,
      icon: stats.conflictsCount > 0 ? AlertTriangle : CheckCircle2,
      iconGrad: stats.conflictsCount > 0 ? "from-red-500 to-rose-700" : "from-[#2A9D8F] to-[#21867A]",
      view: "review",
      badge: stats.conflictsCount > 0 ? "Overlap Alert" : "Clean Grid",
      isConflict: stats.conflictsCount > 0,
      desc: stats.conflictsCount > 0 ? "Overlapping bookings detected" : "Zero teacher/room conflicts"
    },
    {
      label: "Review Needed",
      value: stats.reviewNeededCount || 0,
      icon: Sparkles,
      iconGrad: stats.reviewNeededCount > 0 ? "from-[#E76F51] to-[#C05633]" : "from-[#A0897D] to-[#7A6559]",
      view: "review",
      badge: stats.reviewNeededCount > 0 ? "Check Fields" : "Verified",
      desc: stats.reviewNeededCount > 0 ? "Anomalies needing review" : "All fields verified valid"
    }
  ];

  const dayDist = stats.dayDistribution || {};
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const maxDayCount = Math.max(...Object.values(dayDist), 1);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Timetable Header Card (Skeuomorphic Master Header) */}
      <div className="skeuo-card p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="skeuo-badge px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs text-[#C05633] flex items-center gap-1.5 font-bold">
              <span className="skeuo-led-green"></span>
              Active Master Timetable
            </span>
            <span className="text-[11px] sm:text-xs text-[#A0897D] font-medium">
              Uploaded: {new Date(timetable.uploadDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#3D2B1F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] break-words">
            {timetable.originalName || "Master Timetable Dataset"}
          </h2>
          <p className="text-[11px] sm:text-xs text-[#A0897D] mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span>{timetable.pageCount} page(s) analyzed</span>
            <span>•</span>
            <span>{stats.totalEntries || 0} parsed classes</span>
            <span>•</span>
            <span className="hidden sm:inline">SQLite Vector Database & Coordinate Grid Engine</span>
            <span className="sm:hidden">SQLite DB</span>
          </p>
        </div>

        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            onClick={() => onNavigate("student")}
            className="skeuo-btn-primary px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Find Class Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigate("pdf")}
            className="skeuo-btn-surface px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View Source PDF</span>
          </button>
        </div>
      </div>

      {/* 8 Neu-Skeuomorphic KPI Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(card.view)}
              className="neu-raised p-3.5 sm:p-4 transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-[9px_9px_20px_rgba(200,170,145,0.55),-9px_-9px_20px_rgba(255,255,255,0.95)] group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${card.iconGrad} text-white flex items-center justify-center shadow-[0_3px_6px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.5)] border-t border-white/50`}>
                    <Icon className="w-4 h-4 drop-shadow-sm" />
                  </div>
                  {card.badge && (
                    <span className={`skeuo-badge text-[10px] px-2 py-0.5 font-bold flex items-center gap-1 ${
                      card.isConflict
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {card.isConflict ? <span className="skeuo-led-red"></span> : <span className="skeuo-led-green"></span>}
                      {card.badge}
                    </span>
                  )}
                </div>

                <div className="text-xl sm:text-2xl font-extrabold text-[#3D2B1F] group-hover:text-[#E76F51] transition-colors drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                  {card.value}
                </div>
                <div className="text-xs font-bold text-[#7A6559] mt-0.5">
                  {card.label}
                </div>
              </div>

              <div className="text-[10px] text-[#A0897D] font-medium mt-2.5 sm:mt-3 border-t border-[#D4B8A0]/60 pt-1.5">
                {card.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Distribution & Load Balance Ledger */}
      <div className="skeuo-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-extrabold text-[#3D2B1F] flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#E76F51]" />
            Weekly Academic Load & Session Distribution
          </h3>
          <span className="skeuo-badge px-2.5 py-0.5 text-[11px] text-[#7A6559] font-bold self-start sm:self-auto">
            Total Sessions: {stats.totalEntries || 0}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {dayNames.map((d) => {
            const count = dayDist[d] || 0;
            const percentage = Math.round((count / maxDayCount) * 100);
            return (
              <div key={d} className="neu-pressed p-2.5 sm:p-3 rounded-xl">
                <div className="flex items-center justify-between text-xs mb-1.5 sm:mb-2">
                  <span className="font-bold text-[#3D2B1F] text-[11px] sm:text-xs">{d}</span>
                  <span className="skeuo-badge text-[10px] px-1.5 py-0.2 bg-[#FCEFE3] text-[#C05633] font-bold">
                    {count}
                  </span>
                </div>
                {/* Recessed track with 3D gradient fill bar */}
                <div className="w-full bg-[#E5CEBC] rounded-full h-2 overflow-hidden shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
                  <div
                    className="bg-gradient-to-r from-[#F4A261] to-[#E76F51] h-2 rounded-full transition-all duration-500 shadow-[0_1px_2px_rgba(231,111,81,0.4)]"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-[#A0897D] mt-1.5 block">
                  {percentage}% capacity
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
