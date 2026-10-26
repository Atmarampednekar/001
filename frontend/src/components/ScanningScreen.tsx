import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RotatingText } from "./RotatingText.js";

const SCAN_STEPS = [
  "memory & background apps",
  "startup entries & launch keys",
  "temporary caches & crash logs",
  "large files in user folders",
  "laptop performance & runway",
];

interface ScanningScreenProps {
  onCancel?: () => void;
}

export const ScanningScreen: React.FC<ScanningScreenProps> = () => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
    }, 900);
    return () => clearInterval(timer);
  }, []);

  const progressPercent = Math.min(95, ((stepIndex + 1) / SCAN_STEPS.length) * 100);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[65vh] px-4 text-center max-w-column mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-md flex flex-col items-center p-8 rounded-xl bg-[#222222]/80 border border-[#3D3D3D] shadow-2xl backdrop-blur-md"
      >
        <div className="w-12 h-12 mb-6 rounded-full border border-[#3D3D3D] flex items-center justify-center bg-[#333333]/90">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
            className="w-5 h-5 border-2 border-t-[#E10600] border-r-transparent border-b-transparent border-l-transparent rounded-full"
          />
        </div>

        <h2 className="text-xl font-light text-white mb-2 tracking-tight">
          Scanning your laptop
        </h2>

        {/* Dynamic Scanning Focus with RotatingText */}
        <div className="text-sm text-[#C0C0C0] min-h-[28px] font-normal tracking-wide flex items-center justify-center gap-1.5 flex-wrap">
          <span>Analyzing</span>
          <RotatingText
            texts={SCAN_STEPS}
            effect="drop"
            staggerFrom="first"
            staggerDuration={0.015}
            splitLevelClassName="overflow-hidden"
            rotationInterval={1600}
            mainClassName="text-[#E10600] font-medium"
          />
        </div>

        {/* One Thin Progress Line */}
        <div className="w-full bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden mt-8 border border-[#3D3D3D]/50">
          <motion.div
            className="bg-[#E10600] h-full"
            initial={{ width: "5%" }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>

        <p className="text-xs text-[#9E9E9E] mt-4 tracking-wider uppercase">
          Read-only inspection · No changes made
        </p>
      </motion.div>
    </div>
  );
};
export default ScanningScreen;
