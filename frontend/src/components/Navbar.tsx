import React, { useState } from "react";
import { 
  Calendar, 
  GraduationCap, 
  Users, 
  MapPin, 
  Grid3X3, 
  Table as TableIcon, 
  AlertTriangle, 
  FileText, 
  UploadCloud, 
  Download, 
  ShieldCheck, 
  UserCheck, 
  BookOpen,
  Trash2,
  Check,
  ChevronDown,
  Sparkles,
  Layers,
  Menu,
  X
} from "lucide-react";
import { UserRole, ActiveView, TimetableDoc, TimetableSummary } from "../types";

interface NavbarProps {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentView: ActiveView;
  setCurrentView: (view: ActiveView) => void;
  timetable: TimetableDoc | null;
  timetablesList: TimetableSummary[];
  onSelectTimetable: (id: string) => void;
  onDeleteTimetable: (id: string) => void;
  onOpenUpload: () => void;
  onExport: (format: "pdf" | "csv" | "excel") => void;
  reviewCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  setCurrentRole,
  currentView,
  setCurrentView,
  timetable,
  timetablesList,
  onSelectTimetable,
  onDeleteTimetable,
  onOpenUpload,
  onExport,
  reviewCount,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const [ttListOpen, setTtListOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteConfirm = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteTimetable(id);
    setConfirmDeleteId(null);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFF8F2] border-b border-[#D4B8A0] shadow-[0_4px_16px_rgba(200,170,145,0.35)]">
      {/* Top Banner & Control Deck */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline with Tactile 3D Emblem */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-2xl bg-gradient-to-b from-[#E76F51] to-[#C05633] flex items-center justify-center text-white shadow-[3px_3px_8px_rgba(231,111,81,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)] border-t border-white/60 border-b border-[#8B3A20]">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-base sm:text-lg text-[#3D2B1F] tracking-tight truncate drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                  Smart Timetable
                </span>
                <span className="skeuo-badge px-2 py-0.5 text-[10px] sm:text-[11px] text-[#C05633] font-bold tracking-wide flex items-center gap-1 shrink-0">
                  <span className="skeuo-led-green"></span>
                  <span className="hidden xs:inline">AI Engine</span>
                  <span className="xs:hidden">AI</span>
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#A0897D] hidden md:block truncate">
                Tactile University Timetable Parsing & Master Schedule Ledger
              </p>
            </div>
          </div>

          {/* Mobile Right Controls: Quick Upload & Hamburger Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={onOpenUpload}
              className="skeuo-btn-primary p-2 text-xs rounded-xl flex items-center justify-center cursor-pointer shadow-sm"
              title="Upload PDF Timetable"
              aria-label="Upload PDF Timetable"
            >
              <UploadCloud className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="skeuo-btn-surface p-2 text-xs rounded-xl flex items-center justify-center cursor-pointer transition-transform active:scale-95"
              title="Toggle Menu"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-[#E76F51]" />
              ) : (
                <Menu className="w-5 h-5 text-[#3D2B1F]" />
              )}
            </button>
          </div>

          {/* Desktop Right Action Controls */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Timetable Version Manager & Deletion Center */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setTtListOpen(!ttListOpen)}
                className="skeuo-btn-surface px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer"
                title="Manage Timetable Versions"
              >
                <Layers className="w-3.5 h-3.5 text-[#E76F51]" />
                <span className="max-w-[130px] truncate">
                  {timetable?.originalName || "Timetables"}
                </span>
                <span className="skeuo-badge text-[10px] px-1.5 py-0.2 bg-[#FCEFE3] text-[#C05633] font-bold">
                  {timetablesList.length}
                </span>
                <ChevronDown className="w-3 h-3 text-[#A0897D]" />
              </button>

              {ttListOpen && (
                <div className="absolute right-0 mt-2 w-80 neu-raised-lg p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D4B8A0]">
                    <span className="text-xs font-bold text-[#3D2B1F] uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#E76F51]" />
                      Uploaded Timetables ({timetablesList.length})
                    </span>
                    <button 
                      onClick={() => setTtListOpen(false)}
                      className="text-[10px] font-semibold text-[#A0897D] hover:text-[#3D2B1F] px-1.5 py-0.5 rounded"
                    >
                      Close
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {timetablesList.length === 0 ? (
                      <p className="text-xs text-[#A0897D] py-3 text-center">No timetables uploaded yet.</p>
                    ) : (
                      timetablesList.map((t) => {
                        const isActive = t.id === timetable?.id;
                        const isConfirming = confirmDeleteId === t.id;

                        return (
                          <div
                            key={t.id}
                            className={`p-2.5 rounded-xl border transition-all ${
                              isActive
                                ? "bg-[#FCEFE3]/80 border-[#E76F51]/40 shadow-[inset_1px_1px_3px_rgba(231,111,81,0.15)]"
                                : "bg-white/70 border-[#D4B8A0] hover:bg-white hover:border-[#C8AA91]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div 
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => {
                                  onSelectTimetable(t.id);
                                  setTtListOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-1.5">
                                  {isActive && <span className="skeuo-led-green"></span>}
                                  <span className={`text-xs font-bold truncate ${isActive ? "text-[#C05633]" : "text-[#3D2B1F]"}`}>
                                    {t.originalName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-[#A0897D]">
                                  <span>{t.entryCount || 0} classes</span>
                                  <span>•</span>
                                  <span>{t.pageCount || 1} pages</span>
                                  <span>•</span>
                                  <span>{t.uploadDate ? t.uploadDate.substring(0, 10) : "Recent"}</span>
                                </div>
                              </div>

                              {/* Action Buttons: Delete */}
                              <div className="flex items-center gap-1 shrink-0">
                                {isConfirming ? (
                                  <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteConfirm(t.id, e)}
                                      className="skeuo-btn-danger text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1"
                                      title="Confirm Permanent Deletion"
                                    >
                                      <Check className="w-3 h-3" />
                                      Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(null);
                                      }}
                                      className="text-[10px] px-1 text-slate-500 hover:text-slate-700"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeleteId(t.id);
                                    }}
                                    className="p-1.5 text-[#A0897D] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete this timetable"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Recessed Role Switcher Deck */}
            <div className="neu-pressed flex items-center p-1 gap-1">
              <button
                type="button"
                onClick={() => setCurrentRole("student")}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentRole === "student"
                    ? "skeuo-btn-primary shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Student
              </button>
              <button
                type="button"
                onClick={() => setCurrentRole("teacher")}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentRole === "teacher"
                    ? "skeuo-btn-primary shadow-sm"
                    : "text-[#7A6559] hover:text-[#3D2B1F]"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Teacher
              </button>
              <button
                type="button"
                onClick={() => setCurrentRole("admin")}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentRole === "admin"
                    ? "skeuo-btn-emerald shadow-sm"
                    : "text-[#7A6559] hover:text-[#3D2B1F]"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>

            {/* Tactile Export Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen(!exportOpen)}
                className="skeuo-btn-surface px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#E76F51]" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-[#A0897D]" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-2 w-56 neu-raised-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[10px] font-bold text-[#A0897D] px-2 py-1 uppercase tracking-wider">
                    Skeuomorphic Formats
                  </div>
                  <button
                    onClick={() => {
                      onExport("pdf");
                      setExportOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-[#3D2B1F] hover:bg-[#FCEFE3] hover:text-[#C05633] rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-red-500" />
                    <span>Download Official PDF (Colorful)</span>
                  </button>
                  <button
                    onClick={() => {
                      onExport("excel");
                      setExportOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-[#3D2B1F] hover:bg-[#FCEFE3] hover:text-emerald-900 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <TableIcon className="w-4 h-4 text-emerald-600" />
                    <span>Download Excel Sheet (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => {
                      onExport("csv");
                      setExportOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-[#3D2B1F] hover:bg-[#FCEFE3] hover:text-[#C05633] rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#E76F51]" />
                    <span>Download CSV Dataset</span>
                  </button>
                </div>
              )}
            </div>

            {/* Glossy 3D Upload Button */}
            <button
              type="button"
              onClick={onOpenUpload}
              className="skeuo-btn-primary px-3.5 py-1.5 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload PDF</span>
            </button>
          </div>
        </div>

        {/* Responsive Mobile Drawer Menu (Expandable with Neumorphic Styling) */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-2 pb-4 border-t border-[#D4B8A0] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="neu-raised-sm p-3.5 space-y-4">
              {/* Role Switcher on Mobile */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0897D] block mb-1.5">
                  Select User Role
                </span>
                <div className="neu-pressed grid grid-cols-3 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRole("student");
                    }}
                    className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                      currentRole === "student"
                        ? "skeuo-btn-primary shadow-sm"
                        : "text-[#7A6559]"
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRole("teacher");
                    }}
                    className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                      currentRole === "teacher"
                        ? "skeuo-btn-primary shadow-sm"
                        : "text-[#7A6559]"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Teacher
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRole("admin");
                    }}
                    className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                      currentRole === "admin"
                        ? "skeuo-btn-emerald shadow-sm"
                        : "text-[#7A6559]"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin
                  </button>
                </div>
              </div>

              {/* Timetable Version Selector on Mobile */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0897D] flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#E76F51]" />
                    Active Timetable ({timetablesList.length})
                  </span>
                  <button
                    onClick={onOpenUpload}
                    className="text-[11px] font-bold text-[#E76F51] flex items-center gap-1"
                  >
                    <UploadCloud className="w-3 h-3" />
                    + New PDF
                  </button>
                </div>
                <div className="neu-pressed p-2 rounded-xl max-h-36 overflow-y-auto space-y-1.5">
                  {timetablesList.length === 0 ? (
                    <p className="text-xs text-[#A0897D] py-1 text-center">No timetables uploaded yet.</p>
                  ) : (
                    timetablesList.map((t) => {
                      const isActive = t.id === timetable?.id;
                      const isConfirming = confirmDeleteId === t.id;

                      return (
                        <div
                          key={t.id}
                          className={`p-2 rounded-lg flex items-center justify-between gap-2 border text-xs ${
                            isActive
                              ? "bg-white border-[#E76F51]/40 shadow-xs font-bold"
                              : "bg-[#FFF8F2]/60 border-transparent hover:bg-white"
                          }`}
                        >
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              onSelectTimetable(t.id);
                              setMobileMenuOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              {isActive && <span className="skeuo-led-green"></span>}
                              <span className={`truncate ${isActive ? "text-[#C05633]" : "text-[#3D2B1F]"}`}>
                                {t.originalName}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#A0897D] mt-0.5">
                              {t.entryCount || 0} classes • {t.pageCount || 1} pgs
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isConfirming ? (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteConfirm(t.id, e)}
                                className="skeuo-btn-danger text-[10px] px-2 py-0.5 rounded"
                              >
                                Del
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(t.id);
                                }}
                                className="p-1 text-[#A0897D] hover:text-red-600 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Navigation Views Grid on Mobile */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0897D] block mb-1.5">
                  Explore Timetable Views
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      setCurrentView("dashboard");
                      setMobileMenuOpen(false);
                    }}
                    className={`p-2 text-xs font-bold rounded-xl text-left flex items-center gap-2 cursor-pointer ${
                      currentView === "dashboard"
                        ? "skeuo-btn-primary shadow-sm"
                        : "neu-raised-sm text-[#7A6559] hover:text-[#3D2B1F]"
                    }`}
                  >
                    <Calendar className="w-4 h-4 shrink-0 text-[#E76F51]" />
                    <span className="truncate">Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView("student");
                      setMobileMenuOpen(false);
                    }}
                    className={`p-2 text-xs font-bold rounded-xl text-left flex items-center gap-2 cursor-pointer ${
                      currentView === "student"
                        ? "skeuo-btn-primary shadow-sm"
                        : "neu-raised-sm text-[#7A6559] hover:text-[#3D2B1F]"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 shrink-0 text-[#E76F51]" />
                    <span className="truncate">Student View</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView("teacher");
                      setMobileMenuOpen(false);
                    }}
                    className={`p-2 text-xs font-bold rounded-xl text-left flex items-center gap-2 cursor-pointer ${
                      currentView === "teacher"
                        ? "skeuo-btn-primary shadow-sm"
                        : "neu-raised-sm text-[#7A6559] hover:text-[#3D2B1F]"
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0 text-[#E76F51]" />
                    <span className="truncate">Teacher View</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView("room");
                      setMobileMenuOpen(false);
                    }}
                    className={`p-2 text-xs font-bold rounded-xl text-left flex items-center gap-2 cursor-pointer ${
                      currentView === "room"
                        ? "skeuo-btn-primary shadow-sm"
                        : "neu-raised-sm text-[#7A6559] hover:text-[#3D2B1F]"
                    }`}
                  >
                    <MapPin className="w-4 h-4 shrink-0 text-[#E76F51]" />
                    <span className="truncate">Room View</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView("grid");
                      setMobileMenuOpen(false);
                    }}
                    className={`p-2 text-xs font-bold rounded-xl text-left flex items-center gap-2 cursor-pointer ${
                      currentView === "grid"
                        ? "skeuo-btn-primary shadow-sm"
                        : "neu-raised-sm text-[#7A6559] hover:text-[#3D2B1F]"
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4 shrink-0 text-[#E76F51]" />
                    <span className="truncate">Weekly Matrix</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView("table");
                      setMobileMenuOpen(false);
                    }}
                    className={`p-2 text-xs font-bold rounded-xl text-left flex items-center gap-2 cursor-pointer ${
                      currentView === "table"
                        ? "skeuo-btn-primary shadow-sm"
                        : "neu-raised-sm text-[#7A6559] hover:text-[#3D2B1F]"
                    }`}
                  >
                    <TableIcon className="w-4 h-4 shrink-0 text-[#E76F51]" />
                    <span className="truncate">Data Table</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView("review");
                      setMobileMenuOpen(false);
                    }}
                    className={`p-2 text-xs font-bold rounded-xl text-left flex items-center gap-2 cursor-pointer ${
                      currentView === "review"
                        ? "skeuo-btn-primary shadow-sm"
                        : "neu-raised-sm text-[#7A6559] hover:text-[#3D2B1F]"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span className="truncate">Audit & Review</span>
                    {reviewCount > 0 && (
                      <span className="ml-auto skeuo-badge px-1.5 py-0.2 bg-amber-500 text-white font-bold text-[9px]">
                        {reviewCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView("pdf");
                      setMobileMenuOpen(false);
                    }}
                    className={`p-2 text-xs font-bold rounded-xl text-left flex items-center gap-2 cursor-pointer ${
                      currentView === "pdf"
                        ? "skeuo-btn-primary shadow-sm"
                        : "neu-raised-sm text-[#7A6559] hover:text-[#3D2B1F]"
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0 text-[#E76F51]" />
                    <span className="truncate">Original PDF</span>
                  </button>
                </div>
              </div>

              {/* Direct Export Options on Mobile */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0897D] block mb-1.5">
                  Export Options
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onExport("pdf");
                      setMobileMenuOpen(false);
                    }}
                    className="skeuo-btn-surface py-2 px-2 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-red-500" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onExport("excel");
                      setMobileMenuOpen(false);
                    }}
                    className="skeuo-btn-surface py-2 px-2 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer"
                  >
                    <TableIcon className="w-4 h-4 text-emerald-600" />
                    <span>Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onExport("csv");
                      setMobileMenuOpen(false);
                    }}
                    className="skeuo-btn-surface py-2 px-2 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#E76F51]" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Primary View Navigation Pills (Recessed Neu-Tray) */}
        <nav className="neu-pressed flex items-center p-1.5 my-2 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCurrentView("dashboard")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === "dashboard"
                ? "skeuo-btn-primary shadow-sm"
                : "text-[#7A6559] hover:text-[#3D2B1F] hover:bg-white/40"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            onClick={() => setCurrentView("student")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === "student"
                ? "skeuo-btn-primary shadow-sm"
                : "text-[#7A6559] hover:text-[#3D2B1F] hover:bg-white/40"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Student View
          </button>

          <button
            onClick={() => setCurrentView("teacher")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === "teacher"
                ? "skeuo-btn-primary shadow-sm"
                : "text-[#7A6559] hover:text-[#3D2B1F] hover:bg-white/40"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Teacher Schedule
          </button>

          <button
            onClick={() => setCurrentView("room")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === "room"
                ? "skeuo-btn-primary shadow-sm"
                : "text-[#7A6559] hover:text-[#3D2B1F] hover:bg-white/40"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Room Schedule
          </button>

          <button
            onClick={() => setCurrentView("grid")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === "grid"
                ? "skeuo-btn-primary shadow-sm"
                : "text-[#7A6559] hover:text-[#3D2B1F] hover:bg-white/40"
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Weekly Matrix
          </button>

          <button
            onClick={() => setCurrentView("table")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === "table"
                ? "skeuo-btn-primary shadow-sm"
                : "text-[#7A6559] hover:text-[#3D2B1F] hover:bg-white/40"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            All Classes (Data Table)
          </button>

          <button
            onClick={() => setCurrentView("review")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === "review"
                ? "skeuo-btn-primary shadow-sm"
                : "text-[#7A6559] hover:text-[#3D2B1F] hover:bg-white/40"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Extraction Review
            {reviewCount > 0 && (
              <span className="skeuo-badge px-1.5 py-0.2 bg-amber-500 text-white font-bold text-[10px]">
                {reviewCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView("pdf")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === "pdf"
                ? "skeuo-btn-primary shadow-sm"
                : "text-[#7A6559] hover:text-[#3D2B1F] hover:bg-white/40"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Original PDF
          </button>
        </nav>
      </div>
    </header>
  );
};
