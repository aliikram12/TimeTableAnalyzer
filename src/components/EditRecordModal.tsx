import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle, Edit3 } from "lucide-react";
import { TimetableEntry } from "../types";

interface EditRecordModalProps {
  isOpen: boolean;
  entry: TimetableEntry | null;
  onClose: () => void;
  onSave: (updated: Partial<TimetableEntry>) => Promise<void>;
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  isOpen,
  entry,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<TimetableEntry>>({
    subject: "",
    teacher: "",
    room: "",
    day: "Monday",
    time: "09:00 AM - 10:30 AM",
    program: "",
    semester: "",
    section: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (entry) {
      setFormData({
        subject: entry.subject || "",
        teacher: entry.teacher || "",
        room: entry.room || "",
        day: entry.day || "Monday",
        time: entry.time || "09:00 AM - 10:30 AM",
        program: entry.program || "",
        semester: entry.semester || "",
        section: entry.section || "",
      });
    } else {
      setFormData({
        subject: "",
        teacher: "",
        room: "",
        day: "Monday",
        time: "09:00 AM - 10:30 AM",
        program: "",
        semester: "",
        section: "",
      });
    }
  }, [entry, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.subject.trim()) {
      setError("Course / Subject name is required");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save record");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#3D2B1F]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="neu-raised-lg max-w-lg w-full p-4 sm:p-7 max-h-[92vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1.5 rounded-lg text-[#A0897D] hover:text-[#3D2B1F] hover:bg-[#FCEFE3] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-1 pr-8">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#E76F51] to-[#C05633] text-white flex items-center justify-center shadow-sm shrink-0">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-[#3D2B1F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
              {entry ? "Edit Class Record" : "Add New Class"}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#A0897D] font-medium">
              Update class schedule attributes and sync across grid & conflict engines.
            </p>
          </div>
        </div>

        {error && (
          <div className="my-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs mt-3 sm:mt-4">
          <div>
            <label className="block font-bold text-[#3D2B1F] mb-1">Course / Subject Title *</label>
            <input
              type="text"
              required
              value={formData.subject || ""}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="neu-input w-full px-3 py-2 sm:py-2.5 font-medium"
              placeholder="e.g. Mobile Application Development"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            <div>
              <label className="block font-bold text-[#3D2B1F] mb-1">Day of Week</label>
              <select
                value={formData.day || "Monday"}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className="neu-select w-full px-3 py-2 sm:py-2.5 font-medium cursor-pointer"
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#3D2B1F] mb-1">Time Slot</label>
              <input
                type="text"
                value={formData.time || ""}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="neu-input w-full px-3 py-2 sm:py-2.5 font-medium"
                placeholder="09:00 AM - 10:30 AM"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            <div>
              <label className="block font-bold text-[#3D2B1F] mb-1">Faculty / Instructor</label>
              <input
                type="text"
                value={formData.teacher || ""}
                onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                className="neu-input w-full px-3 py-2 sm:py-2.5 font-medium"
                placeholder="e.g. Dr. Muhammad Asif"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3D2B1F] mb-1">Room / Lab</label>
              <input
                type="text"
                value={formData.room || ""}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="neu-input w-full px-3 py-2 sm:py-2.5 font-medium"
                placeholder="e.g. Room 204 or Software Lab"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div>
              <label className="block font-bold text-[#3D2B1F] mb-1">Degree Program</label>
              <input
                type="text"
                value={formData.program || ""}
                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                className="neu-input w-full px-3 py-2 font-medium"
                placeholder="BS SE"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3D2B1F] mb-1">Semester</label>
              <input
                type="text"
                value={formData.semester || ""}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                className="neu-input w-full px-3 py-2 font-medium"
                placeholder="e.g. 3"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3D2B1F] mb-1">Section</label>
              <input
                type="text"
                value={formData.section || ""}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="neu-input w-full px-3 py-2 font-medium"
                placeholder="e.g. Sport 1"
              />
            </div>
          </div>

          <div className="mt-5 sm:mt-6 pt-3 border-t border-[#D4B8A0]/60 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="skeuo-btn-surface w-full sm:w-auto text-center px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="skeuo-btn-primary w-full sm:w-auto justify-center px-4 py-2 text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save Record"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
