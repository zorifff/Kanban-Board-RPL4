"use client";

import { useEffect, useRef } from "react";

type CustomModalProps = {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: "alert" | "confirm";
  confirmText?: string;
  cancelText?: string;
  variant?: "info" | "success" | "warning" | "danger";
  onConfirm: () => void;
  onCancel?: () => void;
};

export default function CustomModal({
  isOpen,
  title,
  message,
  type = "alert",
  confirmText,
  cancelText = "Cancel",
  variant = "info",
  onConfirm,
  onCancel,
}: CustomModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (type === "confirm" && onCancel) onCancel();
        else onConfirm();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, type, onCancel, onConfirm]);

  if (!isOpen) return null;

  const variantConfig = {
    info: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-blue-100 text-blue-600",
      btnClass: "bg-[#0E2F76] hover:bg-[#0b2359] text-white",
      defaultTitle: "Information",
      defaultConfirm: "OK",
    },
    success: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-emerald-100 text-emerald-600",
      btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
      defaultTitle: "Success",
      defaultConfirm: "OK",
    },
    warning: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: "bg-amber-100 text-amber-600",
      btnClass: "bg-amber-500 hover:bg-amber-600 text-white",
      defaultTitle: "Warning",
      defaultConfirm: "OK",
    },
    danger: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: "bg-red-100 text-red-600",
      btnClass: "bg-red-600 hover:bg-red-700 text-white",
      defaultTitle: "Confirmation",
      defaultConfirm: "Yes, Continue",
    },
  };

  const config = variantConfig[variant];
  const displayTitle = title || config.defaultTitle;
  const displayConfirm = confirmText || config.defaultConfirm;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease-out]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          if (type === "confirm" && onCancel) onCancel();
          else onConfirm();
        }}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-[#F5FEFF] to-[#E2EAF4] rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-white/50">

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${config.iconBg}`}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-[#0E2F76] font-['Inter']">{displayTitle}</h3>
              <p className="text-sm text-[#0E2F76]/60 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            {type === "confirm" && onCancel && (
              <button
                onClick={onCancel}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all active:scale-95 font-['Inter']"
              >
                {cancelText}
              </button>
            )}
            <button
              ref={confirmRef}
              onClick={onConfirm}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95 font-['Inter'] ${config.btnClass}`}
            >
              {displayConfirm}
            </button>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
