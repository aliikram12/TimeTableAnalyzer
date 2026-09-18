import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, X } from "lucide-react";
import confetti from "canvas-confetti";
import { API_BASE_URL } from "../config";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  onLoadSample: () => Promise<void>;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onLoadSample,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSampleLoading, setIsSampleLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processingSteps = [
    "Uploading document...",
    "Inspecting document coordinate structure...",
    "Reconstructing cell grid & time slots...",
    "Normalizing course codes, subjects & rooms...",
    "Validating conflicts & generating analytics...",
    "Persisting parsed dataset into SQLite..."
  ];

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setErrorMessage(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setSelectedFile(file);
      } else {
        setErrorMessage("Please select a valid PDF file (.pdf)");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setSelectedFile(file);
      } else {
        setErrorMessage("Please select a valid PDF file (.pdf)");
      }
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setStepIndex(0);

    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev < processingSteps.length - 1 ? prev + 1 : prev));
    }, 1200);

    const formData = new FormData();
    formData.append("pdf", selectedFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload-and-analyze`, {
        method: "POST",
        body: formData,
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to process timetable PDF");
      }

      const data = await res.json();
      if (data.timetable) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        onSuccess(data.timetable);
        onClose();
      } else {
        throw new Error("Invalid response received from parser engine");
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setErrorMessage(err.message || "Failed to process timetable");
    } finally {
      setIsProcessing(false);
      setStepIndex(0);
    }
  };

  const handleSampleClick = async () => {
    setIsSampleLoading(true);
    setErrorMessage(null);
    try {
      await onLoadSample();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load sample timetable");
    } finally {
      setIsSampleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#3D2B1F]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="neu-raised-lg max-w-xl w-full p-4 sm:p-7 max-h-[92vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 p-1.5 rounded-lg text-[#A0897D] hover:text-[#3D2B1F] hover:bg-[#FCEFE3] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E76F51] to-[#C05633] text-white flex items-center justify-center mx-auto mb-3 shadow-[0_3px_8px_rgba(231,111,81,0.4)] border-t border-white/50">
            <UploadCloud className="w-6 h-6 drop-shadow-sm" />
          </div>
          <h3 className="text-lg font-extrabold text-[#3D2B1F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            Upload Timetable PDF
          </h3>
          <p className="text-xs text-[#A0897D] font-medium mt-1 max-w-md mx-auto">
            Drag and drop your university timetable or faculty schedule PDF to extract all lectures, rooms, instructors, and conflict analytics.
          </p>
        </div>

        {/* Tactile Inset Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`neu-pressed p-6 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-2 border-[#E76F51] bg-[#FCEFE3]/80"
              : selectedFile
              ? "border-2 border-[#2A9D8F] bg-[#E8F8F5]/60"
              : "border-2 border-dashed border-[#D4B8A0] hover:border-[#E76F51]"
          } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2A9D8F] to-[#21867A] text-white flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#3D2B1F] truncate max-w-xs">{selectedFile.name}</p>
                <p className="text-[11px] text-[#A0897D] font-medium">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="skeuo-btn-surface ml-auto text-[10px] px-2 py-1 rounded-md"
              >
                Change
              </button>
            </div>
          ) : (
            <div>
              <UploadCloud className="w-8 h-8 text-[#E76F51] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#3D2B1F]">
                Click to browse or drop your PDF document here
              </p>
              <p className="text-[10px] text-[#A0897D] font-medium mt-1">Supports multi-page grid and matrix timetable PDFs</p>
            </div>
          )}
        </div>

        {/* Processing State */}
        {isProcessing && (
          <div className="mt-4 p-4 rounded-xl neu-pressed">
            <div className="flex items-center gap-2.5 mb-2">
              <Loader2 className="w-4 h-4 text-[#E76F51] animate-spin" />
              <span className="text-xs font-bold text-[#3D2B1F]">
                {processingSteps[stepIndex]}
              </span>
            </div>
            <div className="w-full bg-[#E5CEBC] rounded-full h-2 overflow-hidden shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
              <div
                className="bg-gradient-to-r from-[#F4A261] to-[#E76F51] h-2 rounded-full transition-all duration-500"
                style={{ width: `${((stepIndex + 1) / processingSteps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <div>
              <p className="font-bold">Analysis Failed</p>
              <p className="mt-0.5 font-medium">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleUploadAndAnalyze}
            disabled={!selectedFile || isProcessing || isSampleLoading}
            className="skeuo-btn-primary w-full sm:flex-1 py-2.5 px-4 text-xs rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Document...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Extract & Parse Timetable</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSampleClick}
            disabled={isProcessing || isSampleLoading}
            className="skeuo-btn-surface w-full sm:w-auto py-2.5 px-4 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isSampleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#E76F51]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#E76F51]" />
            )}
            <span>Load Demo Grid</span>
          </button>
        </div>
      </div>
    </div>
  );
};
