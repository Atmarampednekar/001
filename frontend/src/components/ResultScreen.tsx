import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Check,
  Copy,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  ScanReport,
  FixPlanItem,
  AIPlanResponse,
  CleanPreviewResult,
} from "../types.js";
import {
  previewClean,
  applyClean,
  disableStartup,
  undoStartup,
  closeApp,
  revealPath,
  fetchScan,
} from "../api.js";
import { CleanModal } from "./CleanModal.js";
import { AskPanel } from "./AskPanel.js";
import { BranchedMenu, BranchedMenuItem } from "./BranchedMenu.js";
import {
  Rocket01Icon,
  Download04Icon,
  Settings02Icon,
  CursorPointer01Icon,
  Layers01Icon,
  TextFontIcon,
  Notification03Icon,
} from "@hugeicons/core-free-icons";

const RESULT_MENU_ITEMS: BranchedMenuItem[] = [
  {
    label: "Health & Actions",
    children: [
      { value: "section-overview", label: "Health & Runway", icon: Rocket01Icon },
      { value: "section-clean", label: "Safe Junk Cleaner", icon: Download04Icon },
      { value: "section-plan", label: "AI Recommendations", icon: Settings02Icon },
    ],
  },
  {
    label: "Inspection",
    children: [
      { value: "section-apps", label: "Memory Hoggers", icon: CursorPointer01Icon },
      { value: "section-startup", label: "Startup Programs", icon: Layers01Icon },
      { value: "section-files", label: "Large Files", icon: TextFontIcon },
    ],
  },
  {
    label: "Local Assistant",
    children: [
      { value: "section-ask", label: "Ask Featherlight", icon: Notification03Icon },
    ],
  },
];

interface ResultScreenProps {
  report: ScanReport;
  plan: AIPlanResponse | null;
  onRescan: (newReport: ScanReport) => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  report,
  plan,
  onRescan,
}) => {
  // Modal states
  const [cleanModalOpen, setCleanModalOpen] = useState(false);
  const [cleanPreview, setCleanPreview] = useState<CleanPreviewResult | null>(null);
  const [isApplyingClean, setIsApplyingClean] = useState(false);

  // Before/After state
  const [beforeStats, setBeforeStats] = useState<{
    healthScore: number;
    usedRamPercent: number;
    usedDiskPercent: number;
    mbFreed: number;
  } | null>(null);

  // Completed fix ids (user clicked Done tick or performed action)
  const [doneFixIds, setDoneFixIds] = useState<Set<string>>(new Set());

  // Level 2 fixes selection (checkboxes)
  const [selectedFixIds, setSelectedFixIds] = useState<Set<string>>(new Set());
  const [isApplyingSelected, setIsApplyingSelected] = useState(false);
  const [lastUndos, setLastUndos] = useState<Array<{ id: string; name: string }>>([]);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Collapsible tables
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [tableTab, setTableTab] = useState<"running" | "startup" | "files" | "targets">("running");
  const [searchFilter, setSearchFilter] = useState("");

  // BranchedMenu navigation state
  const [activeMenuSection, setActiveMenuSection] = useState("section-overview");

  const handleMenuSelect = (val: string) => {
    setActiveMenuSection(val);
    if (val === "section-apps") {
      setMoreDetailsOpen(true);
      setTableTab("running");
      document.getElementById("section-inspection")?.scrollIntoView({ behavior: "smooth" });
    } else if (val === "section-startup") {
      setMoreDetailsOpen(true);
      setTableTab("startup");
      document.getElementById("section-inspection")?.scrollIntoView({ behavior: "smooth" });
    } else if (val === "section-files") {
      setMoreDetailsOpen(true);
      setTableTab("files");
      document.getElementById("section-inspection")?.scrollIntoView({ behavior: "smooth" });
    } else {
      document.getElementById(val)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const mainDisk = report.mainDisk;
  const health = report.healthScore;

  // SVG ring parameters
  const ringRadius = 54;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference - (health / 100) * circumference;

  // Trigger silver and red confetti
  const triggerConfetti = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#E10600", "#C0C0C0", "#FFFFFF", "#333333"],
    });
  };

  // Open Clean Modal
  const handleOpenCleanModal = async () => {
    try {
      const allTargetIds = report.cleanableTargets.map((t) => t.id);
      if (allTargetIds.length === 0) return;
      const preview = await previewClean(allTargetIds);
      setCleanPreview(preview);
      setCleanModalOpen(true);
    } catch (err: any) {
      alert(err.message || "Could not preview clean targets.");
    }
  };

  // Apply Clean from Modal
  const handleConfirmClean = async () => {
    if (!cleanPreview) return;
    setIsApplyingClean(true);
    try {
      // Record before stats
      const before = {
        healthScore: report.healthScore,
        usedRamPercent: report.system.usedRamPercent,
        usedDiskPercent: mainDisk.usedPercent,
        mbFreed: cleanPreview.totalSizeMB,
      };

      const result = await applyClean(cleanPreview.previewToken);
      setCleanModalOpen(false);
      setIsApplyingClean(false);

      // Trigger celebration confetti
      triggerConfetti();

      // Mark clean fix as done
      setDoneFixIds((prev) => new Set([...prev, "target_user_temp", "target_system_temp"]));
      setBeforeStats(before);

      // Refresh scan
      const fresh = await fetchScan();
      onRescan(fresh);
    } catch (err: any) {
      setIsApplyingClean(false);
      alert(err.message || "Failed to execute clean.");
    }
  };

  // Copy to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Reveal path in File Explorer
  const handleReveal = async (path: string) => {
    try {
      await revealPath(path);
    } catch (err: any) {
      alert(err.message || "Could not open folder.");
    }
  };

  // Toggle selection for Level 2 items (startup / running apps)
  const toggleSelectFix = (id: string) => {
    setSelectedFixIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Apply Selected Level 2 fixes
  const handleApplySelected = async () => {
    if (selectedFixIds.size === 0) return;
    setIsApplyingSelected(true);
    const undos: Array<{ id: string; name: string }> = [];

    for (const id of Array.from(selectedFixIds)) {
      const fix = plan?.fixes.find((f) => f.id === id);
      if (!fix) continue;

      if (fix.action === "switch off at startup") {
        try {
          await disableStartup(id);
          undos.push({ id, name: fix.title });
          setDoneFixIds((prev) => new Set([...prev, id]));
        } catch {
          // ignore
        }
      } else if (fix.action === "close when not in use") {
        try {
          await closeApp(id);
          setDoneFixIds((prev) => new Set([...prev, id]));
        } catch {
          // ignore
        }
      }
    }

    setLastUndos(undos);
    setSelectedFixIds(new Set());
    setIsApplyingSelected(false);

    // Refresh scan
    try {
      const fresh = await fetchScan();
      onRescan(fresh);
    } catch {
      // ignore
    }
  };

  // Undo startup change
  const handleUndo = async (id: string) => {
    try {
      await undoStartup(id);
      setLastUndos((prev) => prev.filter((u) => u.id !== id));
      setDoneFixIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      const fresh = await fetchScan();
      onRescan(fresh);
    } catch (err: any) {
      alert(err.message || "Failed to undo startup modification.");
    }
  };

  const fixes = plan?.fixes || [];

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 text-left">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sticky Desktop Tree Navigation powered by BranchedMenu */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-24 self-start p-3.5 rounded-xl bg-[#222222]/85 border border-[#3D3D3D] shadow-xl backdrop-blur-md">
          <div className="text-[11px] uppercase tracking-wider text-[#9E9E9E] font-medium mb-3 flex items-center gap-1.5 px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E10600]" />
            <span>Inspection Tree</span>
          </div>
          <BranchedMenu
            items={RESULT_MENU_ITEMS}
            defaultOpen={[0, 1]}
            defaultActive={activeMenuSection}
            onSelect={handleMenuSelect}
            color="#C0C0C0"
            accentColor="#E10600"
            lineColor="#3D3D3D"
            width={200}
            rowHeight={34}
            indent={36}
            trunk={12}
            radius={9}
            fontSize={13}
            drawDuration={350}
            foldDuration={250}
          />
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 w-full min-w-0">
          {/* Before / After Banner after Clean */}
          {beforeStats && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-[#333333] border border-[#E10600]/40 mb-8 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E10600]" />
                  <span className="text-sm font-medium text-white">Laptop made lighter!</span>
                </div>
                <p className="text-xs text-[#9E9E9E] mt-0.5">
                  Safely reclaimed {beforeStats.mbFreed} MB of cached junk.
                </p>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#9E9E9E]">Health</div>
                  <div className="text-sm font-mono text-white">
                    <span className="line-through text-[#6B6B6B]">{beforeStats.healthScore}</span>{" "}
                    <span className="text-[#E10600]">→ {report.healthScore}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#9E9E9E]">Storage</div>
                  <div className="text-sm font-mono text-white">
                    {mainDisk.usedPercent}% used
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Hero Overview: Thin Health Ring & Storage Runway Bar */}
          <div id="section-overview" className="p-6 rounded-lg bg-[#333333] border border-[#3D3D3D] mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Thin Health Score Ring */}
          <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r={ringRadius}
                stroke="#1A1A1A"
                strokeWidth="4"
                fill="transparent"
              />
              <motion.circle
                cx="64"
                cy="64"
                r={ringRadius}
                stroke="#E10600"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-light text-white tracking-tight">{health}</span>
              <span className="text-[10px] uppercase tracking-wider text-[#9E9E9E]">Health</span>
            </div>
          </div>

          {/* Right Summary */}
          <div className="flex-1 w-full text-left">
            <h2 className="text-lg font-medium text-white mb-1 tracking-tight">
              {health >= 80
                ? "Your laptop is in good shape."
                : health >= 60
                ? "Your laptop is carrying moderate background bloat."
                : "Your laptop is under heavy memory and storage pressure."}
            </h2>
            <p className="text-xs text-[#C0C0C0] leading-relaxed mb-4">
              {plan?.summary ||
                "Scanning complete. Review the safe fixes below to reclaim memory and disk space."}
            </p>

            {/* Storage Bar with 80% Target Marker */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#9E9E9E]">
                <span>Main Drive ({mainDisk.mount})</span>
                <span className="text-white font-mono">
                  {mainDisk.usedGB} GB / {mainDisk.sizeGB} GB ({mainDisk.usedPercent}%)
                </span>
              </div>
              <div className="relative w-full h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                <div
                  className="h-full bg-[#C0C0C0] rounded-full transition-all"
                  style={{ width: `${Math.min(100, mainDisk.usedPercent)}%` }}
                />
                {/* 80% Target Indicator */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#E10600]"
                  style={{ left: "80%" }}
                  title="Target: 80% drive capacity"
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#9E9E9E]">
                <span>
                  {mainDisk.gbToFree > 0 ? (
                    <span className="text-white">
                      Free <strong className="text-[#E10600]">{mainDisk.gbToFree} GB</strong> to reach the 80% target.
                    </span>
                  ) : (
                    <span>Storage is comfortably under the 80% ceiling.</span>
                  )}
                </span>
                <span className="text-[#9E9E9E]">Target 80%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Row: Clean Now Button & Safety Line */}
        <div id="section-clean" className="mt-6 pt-5 border-t border-[#3D3D3D] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#9E9E9E] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#C0C0C0]" />
            <span>Only safe junk is cleaned. Your personal files are never touched.</span>
          </div>

          {report.cleanableTargets.length > 0 && (
            <button
              onClick={handleOpenCleanModal}
              className="w-full sm:w-auto px-5 py-2.5 rounded bg-[#E10600] hover:bg-[#C00500] text-white text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>Clean now ({report.potentialSavingsMB} MB safe junk)</span>
            </button>
          )}
        </div>
      </div>

      {/* Undone Startup Notification Bar */}
      {lastUndos.length > 0 && (
        <div className="p-3 rounded bg-[#222222] border border-[#3D3D3D] mb-6 flex items-center justify-between">
          <div className="text-xs text-[#C0C0C0]">
            Switched off {lastUndos.length} startup program(s).
          </div>
          <button
            onClick={() => handleUndo(lastUndos[0].id)}
            className="text-xs text-[#E10600] hover:text-white flex items-center gap-1 font-medium underline underline-offset-2"
          >
            <RotateCcw className="w-3 h-3" />
            Undo last change
          </button>
        </div>
      )}

      {/* Top Fixes Section */}
      <div id="section-plan" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-white tracking-tight">Top Recommended Fixes</h3>
          <span className="text-xs text-[#9E9E9E]">Ordered by impact</span>
        </div>

        {fixes.length === 0 ? (
          <div className="p-6 rounded bg-[#333333] border border-[#3D3D3D] text-center text-sm text-[#9E9E9E]">
            No critical fixes needed right now! Your system is running lean.
          </div>
        ) : (
          <div className="space-y-3.5">
            {fixes.map((fix) => {
              const isDone = doneFixIds.has(fix.id);
              const isSelected = selectedFixIds.has(fix.id);
              const isLevel2 =
                fix.action === "switch off at startup" || fix.action === "close when not in use";
              const isSuggestOnly =
                fix.action === "move to cloud storage" ||
                fix.action === "review and delete" ||
                fix.action === "uninstall if unused";

              return (
                <div
                  key={fix.id}
                  className={`p-4 rounded-lg bg-[#333333] border transition-all ${
                    isDone ? "border-[#3D3D3D] opacity-60" : "border-[#3D3D3D] hover:border-[#6B6B6B]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Checkbox for Level 2 or Tick for Done */}
                    <div className="pt-0.5">
                      {isLevel2 && !isDone ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectFix(fix.id)}
                          className="w-4 h-4 rounded border-[#3D3D3D] bg-[#222222] accent-[#E10600] cursor-pointer"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setDoneFixIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(fix.id)) next.delete(fix.id);
                              else next.add(fix.id);
                              return next;
                            });
                          }}
                          className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                            isDone
                              ? "bg-[#C0C0C0] border-[#C0C0C0] text-[#1A1A1A]"
                              : "border-[#3D3D3D] text-transparent hover:border-[#C0C0C0]"
                          }`}
                          title={isDone ? "Mark as not done" : "Mark as done"}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      )}
                    </div>

                    {/* Middle: Details */}
                    <div className="flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-sm font-medium ${
                            isDone ? "line-through text-[#9E9E9E]" : "text-white"
                          }`}
                        >
                          {fix.title}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#222222] border border-[#3D3D3D] text-[#C0C0C0]">
                          {fix.action}
                        </span>
                        {fix.risk === "medium" ? (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#222222] border border-[#E10600]/40 text-[#E10600]">
                            Review Needed
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#222222] border border-[#3D3D3D] text-[#9E9E9E]">
                            Low Risk
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#C0C0C0] mb-2.5">{fix.reason}</p>

                      {/* Location Box with Copy and Reveal */}
                      {fix.location && (
                        <div className="p-2 rounded bg-[#222222] border border-[#3D3D3D] flex items-center justify-between text-xs font-mono text-[#9E9E9E] mb-2.5">
                          <span className="truncate max-w-[340px] select-all">{fix.location}</span>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => handleCopy(fix.location, fix.id)}
                              className="p-1 rounded hover:bg-[#333333] text-[#C0C0C0] hover:text-white transition-colors"
                              title="Copy path"
                            >
                              {copiedId === fix.id ? (
                                <Check className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleReveal(fix.location)}
                              className="p-1 rounded hover:bg-[#333333] text-[#C0C0C0] hover:text-white transition-colors"
                              title="Show in folder"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* How-to Steps */}
                      {fix.howTo.length > 0 && (
                        <div className="text-[11px] text-[#9E9E9E] space-y-1 pl-1">
                          {fix.howTo.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <span className="text-[#6B6B6B] select-none">{idx + 1}.</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Saving Estimate */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-medium text-white">{fix.estimatedSaving}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Apply Selected Level 2 Button */}
        {selectedFixIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-end gap-3 p-3 rounded bg-[#222222] border border-[#3D3D3D]"
          >
            <span className="text-xs text-[#C0C0C0]">
              {selectedFixIds.size} action(s) selected
            </span>
            <button
              onClick={handleApplySelected}
              disabled={isApplyingSelected}
              className="px-4 py-2 rounded bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-medium transition-colors"
            >
              {isApplyingSelected ? "Applying..." : "Apply selected"}
            </button>
          </motion.div>
        )}
      </div>

      {/* Ask Safety Chat Panel */}
      <div id="section-ask" className="mb-8">
        <AskPanel />
      </div>

      {/* Collapsible More Details Section */}
      <div id="section-inspection" className="mt-8 pt-6 border-t border-[#3D3D3D]">
        <button
          onClick={() => setMoreDetailsOpen(!moreDetailsOpen)}
          className="w-full flex items-center justify-between text-left p-3 rounded bg-[#333333] border border-[#3D3D3D] text-xs font-medium text-[#C0C0C0] hover:text-white transition-colors"
        >
          <span>More details: Inspect all running apps, startup items, and large files</span>
          {moreDetailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {moreDetailsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3 p-4 rounded bg-[#333333] border border-[#3D3D3D]"
            >
              {/* Tab Selector & Filter */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#3D3D3D]">
                <div className="flex gap-2">
                  <button
                    onClick={() => setTableTab("running")}
                    className={`text-xs px-2.5 py-1 rounded transition-colors ${
                      tableTab === "running" ? "bg-[#222222] text-white font-medium" : "text-[#9E9E9E]"
                    }`}
                  >
                    Running Apps ({report.runningApps.length})
                  </button>
                  <button
                    onClick={() => setTableTab("startup")}
                    className={`text-xs px-2.5 py-1 rounded transition-colors ${
                      tableTab === "startup" ? "bg-[#222222] text-white font-medium" : "text-[#9E9E9E]"
                    }`}
                  >
                    Startup Programs ({report.startupApps.length})
                  </button>
                  <button
                    onClick={() => setTableTab("files")}
                    className={`text-xs px-2.5 py-1 rounded transition-colors ${
                      tableTab === "files" ? "bg-[#222222] text-white font-medium" : "text-[#9E9E9E]"
                    }`}
                  >
                    Large Files ({report.bigFiles.length})
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-[#222222] border border-[#3D3D3D] rounded px-2.5 py-1 text-xs text-white placeholder-[#9E9E9E] focus:outline-none"
                />
              </div>

              {/* Running Apps Table */}
              {tableTab === "running" && (
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[#9E9E9E] border-b border-[#3D3D3D]">
                        <th className="pb-2 font-normal">Program</th>
                        <th className="pb-2 font-normal">RAM</th>
                        <th className="pb-2 font-normal">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3D3D3D]/60">
                      {report.runningApps
                        .filter((a) => a.name.toLowerCase().includes(searchFilter.toLowerCase()))
                        .map((app) => (
                          <tr key={app.id} className="hover:bg-[#2A2A2A]">
                            <td className="py-2 text-white font-mono">{app.name}</td>
                            <td className="py-2 text-[#C0C0C0]">{app.memoryMB} MB</td>
                            <td className="py-2">
                              {app.protected ? (
                                <span className="text-[10px] text-[#9E9E9E] uppercase tracking-wider">
                                  System Protected
                                </span>
                              ) : (
                                <span className="text-[10px] text-white uppercase tracking-wider">
                                  User App
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Startup Programs Table */}
              {tableTab === "startup" && (
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[#9E9E9E] border-b border-[#3D3D3D]">
                        <th className="pb-2 font-normal">Name</th>
                        <th className="pb-2 font-normal">Location</th>
                        <th className="pb-2 font-normal">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3D3D3D]/60">
                      {report.startupApps
                        .filter((s) => s.name.toLowerCase().includes(searchFilter.toLowerCase()))
                        .map((s) => (
                          <tr key={s.id} className="hover:bg-[#2A2A2A]">
                            <td className="py-2 text-white font-mono">{s.name}</td>
                            <td className="py-2 text-[#9E9E9E] truncate max-w-[200px]">{s.location}</td>
                            <td className="py-2">
                              {s.protected ? (
                                <span className="text-[10px] text-[#9E9E9E] uppercase tracking-wider">
                                  Protected
                                </span>
                              ) : (
                                <span className="text-[10px] text-white uppercase tracking-wider">
                                  Can Switch Off
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Large Files Table */}
              {tableTab === "files" && (
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[#9E9E9E] border-b border-[#3D3D3D]">
                        <th className="pb-2 font-normal">File Name</th>
                        <th className="pb-2 font-normal">Size</th>
                        <th className="pb-2 font-normal">Path</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3D3D3D]/60">
                      {report.bigFiles
                        .filter((f) => f.name.toLowerCase().includes(searchFilter.toLowerCase()))
                        .map((f) => (
                          <tr key={f.id} className="hover:bg-[#2A2A2A]">
                            <td className="py-2 text-white font-mono truncate max-w-[160px]">{f.name}</td>
                            <td className="py-2 text-[#C0C0C0] font-mono">{f.sizeMB} MB</td>
                            <td className="py-2 text-[#9E9E9E] truncate max-w-[200px]">{f.path}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        </div>
      </div>

      {/* Clean Confirmation Modal */}
      <CleanModal
        isOpen={cleanModalOpen}
        onClose={() => setCleanModalOpen(false)}
        preview={cleanPreview}
        onConfirm={handleConfirmClean}
        isApplying={isApplyingClean}
      />
    </div>
  );
};
