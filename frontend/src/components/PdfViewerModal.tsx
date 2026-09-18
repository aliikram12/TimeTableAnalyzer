import React from "react";
import { X, Download, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { API_BASE_URL } from "../config";

interface PdfViewerModalProps {
  isOpen: boolean;
  timetableId: string;
  filename: string;
  originalName: string;
  pageNumber: number;
  totalPageCount: number;
  onClose: () => void;
  onPageChange: (page: number) => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  timetableId,
  originalName,
  pageNumber,
  totalPageCount,
  onClose,
  onPageChange,
}) => {
  if (!isOpen) return null;

  const pdfUrl = `${API_BASE_URL}/api/pdf-view/${timetableId}#page=${pageNumber}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#3D2B1F]/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="neu-raised-lg w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-[#D4B8A0]/60 shadow-2xl">
        {/* Header Bar with Terracotta Accent Border */}
        <div className="px-5 py-3.5 bg-[#3D2B1F] text-white flex items-center justify-between border-b-2 border-[#E76F51]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E76F51] to-[#C05633] text-white flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold truncate max-w-sm sm:max-w-md drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                {originalName || "Original Timetable PDF"}
              </h3>
              <p className="text-[11px] text-[#D4B8A0] font-medium">
                Page {pageNumber} of {totalPageCount || 1} • High-Resolution Vector Inspection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {totalPageCount > 1 && (
              <div className="flex items-center neu-pressed p-1 text-xs">
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
                  disabled={pageNumber <= 1}
                  className="p-1 text-[#D4B8A0] hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-[#FFF8F2] font-mono font-bold">
                  {pageNumber} / {totalPageCount}
                </span>
                <button
                  type="button"
                  onClick={() => onPageChange(Math.min(totalPageCount, pageNumber + 1))}
                  disabled={pageNumber >= totalPageCount}
                  className="p-1 text-[#D4B8A0] hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <a
              href={`${API_BASE_URL}/api/pdf-view/${timetableId}`}
              download={originalName || "timetable.pdf"}
              className="skeuo-btn-surface px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#E76F51]" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#D4B8A0] hover:text-white hover:bg-[#573F30] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Frame */}
        <div className="flex-1 bg-[#FCEFE3] relative neu-pressed">
          <iframe
            src={pdfUrl}
            title="Original Timetable PDF"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
