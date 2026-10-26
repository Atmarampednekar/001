import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Cpu, HardDrive } from "lucide-react";
import { RotatingText } from "./RotatingText.js";

interface HomeScreenProps {
  onStartScan: () => void;
  onLoadDemo: () => void;
  isScanning: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartScan,
  onLoadDemo,
  isScanning,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[75vh] px-4 text-center max-w-column mx-auto py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full flex flex-col items-center"
      >
        {/* Subtle Icon Badge */}
        <div className="mb-6 p-3 rounded-full bg-[#333333]/90 border border-[#3D3D3D] text-[#C0C0C0] shadow-md backdrop-blur-sm">
          <svg
            className="w-8 h-8 text-[#E10600]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
            <line x1="16" y1="8" x2="2" y2="22" />
          </svg>
        </div>

        {/* Wordmark and Tagline with RotatingText */}
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white mb-3">
          Featherlight
        </h1>
        <div className="text-lg sm:text-xl text-[#C0C0C0] font-normal mb-10 max-w-md flex items-center justify-center gap-1.5 flex-wrap">
          <span>Make your laptop</span>
          <RotatingText
            texts={["light", "fast", "cool", "clean", "quiet"]}
            effect="slide"
            direction="up"
            highlight={true}
            highlightColor="#E10600"
            staggerFrom="last"
            staggerDuration={0.025}
            splitLevelClassName="overflow-hidden pb-0.5"
            rotationInterval={2200}
            mainClassName="px-2 py-0.5 rounded font-medium text-white shadow-sm inline-flex items-center"
          />
          <span>again.</span>
        </div>

        {/* The ONE Large Signal Red Button */}
        <button
          onClick={onStartScan}
          disabled={isScanning}
          className="w-full sm:w-auto min-w-[240px] px-8 py-4 rounded-md bg-[#E10600] hover:bg-[#C00500] text-white font-medium text-lg tracking-wide transition-all flex items-center justify-center gap-3 shadow-lg hover:translate-y-[-1px] active:translate-y-[0px] focus:outline-none"
        >
          <span>{isScanning ? "Scanning..." : "Scan my laptop"}</span>
          <ArrowRight className="w-5 h-5 text-white" />
        </button>

        {/* Quiet Consent Line */}
        <p className="text-xs text-[#9E9E9E] mt-4 max-w-md leading-relaxed tracking-wide">
          Reads your system. Changes nothing until you say so. Nothing is uploaded.
        </p>

        {/* Three Quiet Feature Pillars with glassmorphic backdrop */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-14 pt-10 border-t border-[#3D3D3D]/80">
          <div className="p-4 rounded bg-[#333333]/70 border border-[#3D3D3D] text-left backdrop-blur-xs">
            <Cpu className="w-5 h-5 text-[#C0C0C0] mb-2" />
            <div className="text-sm font-medium text-white mb-1">RAM & CPU Hogging</div>
            <div className="text-xs text-[#9E9E9E] leading-relaxed">
              Finds hidden apps running in the background and at startup.
            </div>
          </div>
          <div className="p-4 rounded bg-[#333333]/70 border border-[#3D3D3D] text-left backdrop-blur-xs">
            <HardDrive className="w-5 h-5 text-[#C0C0C0] mb-2" />
            <div className="text-sm font-medium text-white mb-1">Drive Runway</div>
            <div className="text-xs text-[#9E9E9E] leading-relaxed">
              Identifies accumulated caches to bring your storage back to 80%.
            </div>
          </div>
          <div className="p-4 rounded bg-[#333333]/70 border border-[#3D3D3D] text-left backdrop-blur-xs">
            <Shield className="w-5 h-5 text-[#C0C0C0] mb-2" />
            <div className="text-sm font-medium text-white mb-1">Safe Cleaning</div>
            <div className="text-xs text-[#9E9E9E] leading-relaxed">
              System files and personal documents are strictly protected.
            </div>
          </div>
        </div>

        {/* Try Demo Report Button */}
        <div className="mt-8">
          <button
            onClick={onLoadDemo}
            className="text-xs text-[#9E9E9E] hover:text-white underline underline-offset-4 decoration-[#6B6B6B] transition-colors"
          >
            Try demo report (Demo data)
          </button>
        </div>
      </motion.div>
    </div>
  );
};
export default HomeScreen;
