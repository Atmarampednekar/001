import React, { useState } from "react";
import { ShieldCheck, History as HistoryIcon, Sparkles, Sliders, Check, Menu } from "lucide-react";
import { HealthStatus } from "../types.js";
import { BranchedMenu, BranchedMenuItem } from "./BranchedMenu.js";
import {
  Rocket01Icon,
  Layers01Icon,
  Settings02Icon,
  TextFontIcon,
} from "@hugeicons/core-free-icons";

export interface RingTheme {
  name: string;
  color: string;
  colorTwo: string;
}

export const RING_THEMES: RingTheme[] = [
  { name: "Featherlight Red", color: "#E10600", colorTwo: "#C0C0C0" },
  { name: "React Bits Purple", color: "#A855F7", colorTwo: "#6366F1" },
  { name: "Moonlight Silver", color: "#E0E0E0", colorTwo: "#6B6B6B" },
  { name: "Cyber Blue", color: "#06B6D4", colorTwo: "#3B82F6" },
];

const HEADER_NAV_ITEMS: BranchedMenuItem[] = [
  {
    label: "Navigation",
    children: [
      { value: "main", label: "Scanner & Report", icon: Rocket01Icon },
      { value: "history", label: "Clean History", icon: TextFontIcon },
    ],
  },
  {
    label: "Resources",
    children: [
      { value: "apps", label: "Memory Apps", icon: Settings02Icon },
      { value: "startup", label: "Startup Keys", icon: Layers01Icon },
    ],
  },
];

interface HeaderProps {
  health: HealthStatus | null;
  activeTab: "main" | "history" | "ask";
  setActiveTab: (tab: "main" | "history" | "ask") => void;
  isDemoActive: boolean;
  onResetToLive: () => void;
  onHomeClick: () => void;
  currentTheme: RingTheme;
  onSelectTheme: (theme: RingTheme) => void;
  currentMotion: "pulse" | "ripple" | "breathe";
  onSelectMotion: (motion: "pulse" | "ripple" | "breathe") => void;
  followMouse: boolean;
  onToggleFollowMouse: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  activeTab,
  setActiveTab,
  isDemoActive,
  onResetToLive,
  onHomeClick,
  currentTheme,
  onSelectTheme,
  currentMotion,
  onSelectMotion,
  followMouse,
  onToggleFollowMouse,
}) => {
  const [showRingsMenu, setShowRingsMenu] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const isOllamaOnline = !!health?.ollamaReachable;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#3D3D3D]/80 py-3.5 px-4 sm:px-6 bg-[#2A2A2A]/80 backdrop-blur-md">
      <div className="max-w-column mx-auto flex items-center justify-between">
        {/* Wordmark Logo */}
        <button
          onClick={onHomeClick}
          className="flex items-center gap-2 group text-left transition-opacity hover:opacity-90"
        >
          <div className="w-6 h-6 rounded-sm bg-[#E10600] flex items-center justify-center text-white shadow-sm">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
              <line x1="16" y1="8" x2="2" y2="22" />
            </svg>
          </div>
          <span className="font-semibold text-lg tracking-tight text-white">
            Featherlight
          </span>
        </button>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {isDemoActive && (
            <button
              onClick={onResetToLive}
              className="text-xs px-2.5 py-1 rounded bg-[#333333]/90 border border-[#3D3D3D] text-[#C0C0C0] hover:text-white flex items-center gap-1.5 transition-colors"
              title="Demo data is active. Click to switch back to live system scan."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E10600]" />
              Demo data (exit)
            </button>
          )}

          {/* Privacy Badge with live dot */}
          <div
            className="hidden sm:flex items-center gap-2 text-xs py-1 px-2.5 rounded bg-[#222222]/90 border border-[#3D3D3D] text-[#C0C0C0]"
            title={
              isOllamaOnline
                ? `Local AI connected (${health?.model}). Data never leaves your machine.`
                : "Local Ollama is offline. Fast code-generated optimization mode is active."
            }
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#C0C0C0]" />
            <span className="tracking-wide">Local AI · stays on this laptop</span>
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                isOllamaOnline ? "bg-emerald-500" : "bg-[#6B6B6B]"
              }`}
            />
          </div>

          {/* Background Customizer Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowRingsMenu(!showRingsMenu)}
              className={`p-1.5 rounded border transition-colors flex items-center gap-1 text-xs ${
                showRingsMenu
                  ? "bg-[#333333] border-[#E10600] text-white"
                  : "border-[#3D3D3D] text-[#C0C0C0] hover:border-[#6B6B6B] hover:text-white"
              }`}
              title="Magic Rings desktop background settings"
            >
              <Sparkles className="w-4 h-4 text-[#E10600]" />
              <span className="hidden md:inline text-[11px] text-[#9E9E9E]">Background</span>
            </button>

            {/* Dropdown Menu */}
            {showRingsMenu && (
              <div className="absolute right-0 mt-2 w-64 p-3 rounded-lg bg-[#222222]/95 border border-[#3D3D3D] shadow-2xl backdrop-blur-xl z-50 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#3D3D3D]">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#E10600]" />
                    Magic Rings Background
                  </span>
                  <button
                    onClick={() => setShowRingsMenu(false)}
                    className="text-[#9E9E9E] hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Color Theme Selector */}
                <div className="mb-3">
                  <div className="text-[11px] text-[#9E9E9E] mb-1.5 uppercase tracking-wider">Palette</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {RING_THEMES.map((theme) => {
                      const active = currentTheme.name === theme.name;
                      return (
                        <button
                          key={theme.name}
                          onClick={() => onSelectTheme(theme)}
                          className={`p-1.5 rounded border text-left flex items-center justify-between transition-colors ${
                            active
                              ? "bg-[#333333] border-[#E10600] text-white"
                              : "border-[#3D3D3D]/60 text-[#C0C0C0] hover:bg-[#2A2A2A]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: theme.color }}
                            />
                            <span className="truncate text-[11px]">{theme.name.split(" ")[0]}</span>
                          </div>
                          {active && <Check className="w-3 h-3 text-[#E10600] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Motion Type */}
                <div className="mb-3">
                  <div className="text-[11px] text-[#9E9E9E] mb-1.5 uppercase tracking-wider">Motion</div>
                  <div className="grid grid-cols-3 gap-1">
                    {(["pulse", "ripple", "breathe"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => onSelectMotion(m)}
                        className={`py-1 px-1.5 rounded border capitalize text-center text-[11px] transition-colors ${
                          currentMotion === m
                            ? "bg-[#333333] border-[#E10600] text-white"
                            : "border-[#3D3D3D]/60 text-[#C0C0C0] hover:bg-[#2A2A2A]"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cursor Following Toggle */}
                <div className="pt-2 border-t border-[#3D3D3D]/80 flex items-center justify-between">
                  <span className="text-[11px] text-[#C0C0C0]">Follow cursor:</span>
                  <button
                    onClick={onToggleFollowMouse}
                    className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                      followMouse
                        ? "bg-[#E10600] border-[#E10600] text-white"
                        : "bg-[#2A2A2A] border-[#3D3D3D] text-[#9E9E9E]"
                    }`}
                  >
                    {followMouse ? "On" : "Off"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tree Navigation Drawer */}
          <div className="relative">
            <button
              onClick={() => setShowNavMenu(!showNavMenu)}
              className={`p-1.5 rounded border transition-colors flex items-center gap-1 ${
                showNavMenu
                  ? "bg-[#333333] border-[#E10600] text-white"
                  : "border-[#3D3D3D] text-[#C0C0C0] hover:border-[#6B6B6B] hover:text-white"
              }`}
              title="Tree Navigation Menu"
            >
              <Menu className="w-4 h-4 text-[#C0C0C0]" />
            </button>

            {showNavMenu && (
              <div className="absolute right-0 mt-2 p-3 rounded-lg bg-[#222222]/95 border border-[#3D3D3D] shadow-2xl backdrop-blur-xl z-50 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#3D3D3D]">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E10600]" />
                    Tree Navigation
                  </span>
                  <button
                    onClick={() => setShowNavMenu(false)}
                    className="text-[#9E9E9E] hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
                <BranchedMenu
                  items={HEADER_NAV_ITEMS}
                  defaultOpen={[0]}
                  defaultActive={activeTab}
                  onSelect={(val) => {
                    setShowNavMenu(false);
                    if (val === "main") {
                      setActiveTab("main");
                    } else if (val === "history") {
                      setActiveTab("history");
                    } else {
                      setActiveTab("main");
                      setTimeout(() => {
                        document.getElementById(`section-${val}`)?.scrollIntoView({ behavior: "smooth" });
                      }, 100);
                    }
                  }}
                  color="#C0C0C0"
                  accentColor="#E10600"
                  lineColor="#3D3D3D"
                  width={210}
                  rowHeight={34}
                  indent={36}
                  trunk={12}
                  radius={9}
                  fontSize={13}
                  drawDuration={350}
                  foldDuration={250}
                />
              </div>
            )}
          </div>

          {/* History Navigation Button */}
          <button
            onClick={() => setActiveTab(activeTab === "history" ? "main" : "history")}
            className={`p-1.5 rounded border transition-colors ${
              activeTab === "history"
                ? "bg-[#333333] border-[#C0C0C0] text-white"
                : "border-[#3D3D3D] text-[#C0C0C0] hover:border-[#6B6B6B] hover:text-white"
            }`}
            title="Clean History"
          >
            <HistoryIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
