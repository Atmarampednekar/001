import React, { useEffect, useState } from "react";
import { History, ArrowLeft, Trash2, CheckCircle, Clock } from "lucide-react";
import { CleanHistoryEntry } from "../types.js";
import { fetchHistory } from "../api.js";

interface HistoryTabProps {
  onBack: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ onBack }) => {
  const [history, setHistory] = useState<CleanHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory()
      .then((data) => {
        setHistory(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="w-full max-w-column mx-auto py-8 px-4 text-left">
      <div className="flex items-center justify-between pb-4 border-b border-[#3D3D3D] mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded hover:bg-[#333333] text-[#C0C0C0] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-light text-white tracking-tight">Cleaning History</h2>
            <p className="text-xs text-[#9E9E9E]">Log of past junk cleanups performed on this machine</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-[#9E9E9E]">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#3D3D3D] rounded-lg p-6">
          <Clock className="w-8 h-8 text-[#6B6B6B] mx-auto mb-3" />
          <div className="text-sm font-medium text-white mb-1">No clean actions yet</div>
          <p className="text-xs text-[#9E9E9E] max-w-xs mx-auto">
            When you clean safe temporary files and caches, the records and bytes saved will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const dateStr = new Date(entry.timestamp).toLocaleString();
            return (
              <div
                key={entry.id}
                className="p-4 rounded bg-[#333333] border border-[#3D3D3D] flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#C0C0C0]" />
                    <span className="text-sm font-medium text-white">
                      Freed {entry.mbFreed} MB
                    </span>
                    {entry.dryRun && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#222222] border border-[#3D3D3D] text-[#9E9E9E]">
                        Simulation (Dry Run)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#9E9E9E] mt-1">
                    {entry.filesDeleted} files cleaned · {entry.targetsCleaned.length} target locations
                  </div>
                </div>
                <div className="text-xs text-[#9E9E9E] text-right font-mono">
                  {dateStr}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
