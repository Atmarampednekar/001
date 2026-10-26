import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert, Check, Loader2 } from "lucide-react";
import { CleanPreviewResult } from "../types.js";

interface CleanModalProps {
  isOpen: boolean;
  onClose: () => void;
  preview: CleanPreviewResult | null;
  onConfirm: () => void;
  isApplying: boolean;
}

export const CleanModal: React.FC<CleanModalProps> = ({
  isOpen,
  onClose,
  preview,
  onConfirm,
  isApplying,
}) => {
  if (!isOpen || !preview) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-md bg-[#2A2A2A] border border-[#3D3D3D] rounded-lg p-6 shadow-2xl relative text-left"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#3D3D3D]">
            <div>
              <h3 className="text-lg font-medium text-white tracking-tight">
                Remove safe junk
              </h3>
              <p className="text-xs text-[#9E9E9E] mt-0.5">
                Targeting {preview.totalSizeMB} MB across {preview.totalFileCount} cached files
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isApplying}
              className="text-[#9E9E9E] hover:text-white p-1 rounded hover:bg-[#333333] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Target List */}
          <div className="py-4 space-y-2.5 max-h-[280px] overflow-y-auto">
            {preview.targets.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded bg-[#333333] border border-[#3D3D3D] flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-xs text-[#9E9E9E] truncate max-w-[220px]">
                    {t.actionDescription}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-[#C0C0C0]">{t.totalSizeMB} MB</div>
                  <div className="text-[11px] text-[#9E9E9E]">{t.fileCount} files</div>
                </div>
              </div>
            ))}
          </div>

          {/* Safety Reassurance Notice */}
          <div className="p-3 rounded bg-[#222222] border border-[#3D3D3D] flex items-start gap-2.5 my-3">
            <ShieldAlert className="w-4 h-4 text-[#C0C0C0] shrink-0 mt-0.5" />
            <p className="text-xs text-[#9E9E9E] leading-relaxed">
              <strong className="text-white">Strict Safety Guarantee:</strong> Only allowlisted temporary files older than 24 hours and caches are cleaned. Downloads, Documents, Desktop, and browser passwords are never touched.
            </p>
          </div>

          {preview.dryRun && (
            <div className="text-xs text-[#9E9E9E] bg-[#1A1A1A] p-2 rounded border border-[#3D3D3D] mb-4 text-center">
              DRY_RUN is active. This action will safely simulate and record metrics without touching files.
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3D3D3D]">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 rounded text-sm text-[#C0C0C0] hover:text-white hover:bg-[#333333] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isApplying}
              className="px-5 py-2 rounded bg-[#E10600] hover:bg-[#C00500] text-white text-sm font-medium flex items-center gap-2 transition-colors"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-white" />
                  Confirm and clean
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
