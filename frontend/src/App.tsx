import React, { useState, useEffect } from "react";
import { Header, RING_THEMES, RingTheme } from "./components/Header.js";
import { HomeScreen } from "./components/HomeScreen.js";
import { ScanningScreen } from "./components/ScanningScreen.js";
import { ResultScreen } from "./components/ResultScreen.js";
import { HistoryTab } from "./components/HistoryTab.js";
import { MagicRings } from "./components/MagicRings.js";
import { HealthStatus, ScanReport, AIPlanResponse } from "./types.js";
import { fetchHealth, fetchScan, fetchPlan } from "./api.js";
import { DEMO_SCAN_REPORT } from "./demoData.js";
import { AlertCircle } from "lucide-react";

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeTab, setActiveTab] = useState<"main" | "history" | "ask">("main");
  const [screen, setScreen] = useState<"home" | "scanning" | "result">("home");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [plan, setPlan] = useState<AIPlanResponse | null>(null);
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Magic Rings Global Background State
  const [currentTheme, setCurrentTheme] = useState<RingTheme>(RING_THEMES[0]);
  const [currentMotion, setCurrentMotion] = useState<"pulse" | "ripple" | "breathe">("pulse");
  const [followMouse, setFollowMouse] = useState<boolean>(true);

  // Poll health on mount
  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => {
        setHealth({
          ok: false,
          model: "gemma3:4b",
          configuredModel: "gemma3:4b",
          ollamaReachable: false,
          availableModels: [],
          message: "Featherlight backend starting up...",
          dryRun: true,
          platform: "win32",
        });
      });
  }, []);

  // Start Full System Scan
  const handleStartScan = async () => {
    setErrorMessage(null);
    setScreen("scanning");
    setIsDemoActive(false);

    try {
      const scanData = await fetchScan();
      setReport(scanData);

      // Generate AI Plan
      const planData = await fetchPlan(scanData);
      setPlan(planData);

      setScreen("result");
    } catch (err: any) {
      console.error("Scan failed:", err);
      setErrorMessage(err.message || "Failed to scan system. Ensure backend is running on localhost:4000.");
      setScreen("home");
    }
  };

  // Load Demo Data
  const handleLoadDemo = async () => {
    setErrorMessage(null);
    setIsDemoActive(true);
    setReport(DEMO_SCAN_REPORT);

    try {
      const planData = await fetchPlan(DEMO_SCAN_REPORT);
      setPlan(planData);
    } catch {
      // Fallback
    }
    setScreen("result");
  };

  const handleResetToLive = () => {
    setIsDemoActive(false);
    setReport(null);
    setPlan(null);
    setScreen("home");
  };

  return (
    <div className="relative min-h-screen bg-[#2A2A2A] text-[#C0C0C0] flex flex-col justify-between selection:bg-[#E10600] selection:text-white overflow-x-hidden">
      {/* Whole Desktop Application Full-Screen Magic Rings Background */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden z-0"
        aria-hidden="true"
      >
        <MagicRings
          color={currentTheme.color}
          colorTwo={currentTheme.colorTwo}
          motion={screen === "scanning" ? "ripple" : currentMotion}
          ringCount={8}
          speed={screen === "scanning" ? 1.3 : 0.85}
          lineThickness={2}
          glow={1.25}
          hoverScale={1.2}
          hoverIntensity={1.2}
          parallax={0.06}
          followMouse={followMouse}
          mouseInfluence={0.16}
          clickBurst={true}
          theme="dark"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Header with Glassmorphic Backdrop */}
      <Header
        health={health}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDemoActive={isDemoActive}
        onResetToLive={handleResetToLive}
        onHomeClick={() => {
          setActiveTab("main");
          setScreen("home");
        }}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
        currentMotion={currentMotion}
        onSelectMotion={setCurrentMotion}
        followMouse={followMouse}
        onToggleFollowMouse={() => setFollowMouse(!followMouse)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative z-10">
        {errorMessage && (
          <div className="max-w-column mx-auto mt-4 px-4">
            <div className="p-3 rounded bg-[#333333]/90 backdrop-blur-md border border-[#E10600]/50 text-white text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#E10600] shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {activeTab === "history" ? (
          <HistoryTab onBack={() => setActiveTab("main")} />
        ) : (
          <>
            {screen === "home" && (
              <HomeScreen
                onStartScan={handleStartScan}
                onLoadDemo={handleLoadDemo}
                isScanning={false}
              />
            )}

            {screen === "scanning" && <ScanningScreen />}

            {screen === "result" && report && (
              <ResultScreen
                report={report}
                plan={plan}
                onRescan={(newReport) => {
                  setReport(newReport);
                  fetchPlan(newReport).then(setPlan).catch(() => {});
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Minimal Footer with Glassmorphic Backdrop */}
      <footer className="w-full border-t border-[#3D3D3D]/80 py-4 px-4 text-center text-xs text-[#9E9E9E] bg-[#2A2A2A]/80 backdrop-blur-md relative z-10">
        <div className="max-w-column mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Featherlight · Privacy-First Local AI System Optimizer</span>
          <span>Open-source MIT License</span>
        </div>
      </footer>
    </div>
  );
};
export default App;
