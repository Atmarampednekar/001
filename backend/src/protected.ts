import path from "path";

/**
 * Hardcoded allowlist/blocklist protections.
 * A protected item can NEVER be closed, disabled, or deleted.
 */

export const PROTECTED_PROCESS_NAMES = new Set([
  // Core Windows Kernel & Session
  "system",
  "system idle process",
  "smss.exe",
  "csrss.exe",
  "wininit.exe",
  "services.exe",
  "lsass.exe",
  "svchost.exe",
  "explorer.exe",
  "winlogon.exe",
  "fontdrvhost.exe",
  "dwm.exe",
  "runtimebroker.exe",
  "taskhostw.exe",
  "sihost.exe",
  "ctfmon.exe",
  "conhost.exe",
  "spoolsv.exe",
  "dasHost.exe",
  "searchindexer.exe",
  "searchhost.exe",
  "startmenuexperiencehost.exe",
  "shellexperiencehost.exe",
  "securityhealthservice.exe",
  "smartscreen.exe",
  "msmpeng.exe",
  "nissrv.exe",

  // Audio / Hardware / Display drivers
  "audiodg.exe",
  "nvcontainer.exe",
  "nvdisplay.container.exe",
  "nvidia web helper.exe",
  "igfxcuiservice.exe",
  "igfxem.exe",
  "igfxtray.exe",
  "amdrsserv.exe",

  // Local AI & App Infrastructure
  "ollama.exe",
  "ollama_llama_server.exe",
  "ollama",
  "node.exe",
  "node",
  "featherlight",

  // Terminal & Shell hosts
  "powershell.exe",
  "cmd.exe",
  "windowsterminal.exe",
]);

export const PROTECTED_SUBSTRINGS = [
  "antivirus",
  "windows defender",
  "crowdstrike",
  "sentinelone",
  "kaspersky",
  "malwarebytes",
  "bitdefender",
  "symantec",
  "mcafee",
  "sophos",
  "ollama",
  "featherlight",
];

export const PROTECTED_SYSTEM_PATHS = [
  "c:\\windows",
  "c:\\windows\\system32",
  "c:\\windows\\syswow64",
  "c:\\program files\\windows defender",
  "c:\\programdata\\microsoft\\windows defender",
];

export const PERSONAL_FOLDERS = [
  "downloads",
  "documents",
  "desktop",
  "pictures",
  "videos",
  "music",
];

/**
 * Checks whether a process is strictly protected
 */
export function isProtectedProcess(name: string, execPath?: string): boolean {
  if (!name) return true;
  const lowerName = name.toLowerCase().trim();

  // Exact match
  if (PROTECTED_PROCESS_NAMES.has(lowerName)) {
    return true;
  }
  // Base name without .exe
  const withoutExe = lowerName.endsWith(".exe") ? lowerName.slice(0, -4) : lowerName;
  if (PROTECTED_PROCESS_NAMES.has(withoutExe) || PROTECTED_PROCESS_NAMES.has(withoutExe + ".exe")) {
    return true;
  }

  // Substring match
  for (const sub of PROTECTED_SUBSTRINGS) {
    if (lowerName.includes(sub)) return true;
  }

  // Path check
  if (execPath) {
    const lowerPath = execPath.toLowerCase();
    for (const sysPath of PROTECTED_SYSTEM_PATHS) {
      if (lowerPath.startsWith(sysPath)) return true;
    }
  }

  return false;
}

/**
 * Checks whether a startup entry is protected
 */
export function isProtectedStartup(name: string, command?: string): boolean {
  if (!name) return true;
  const lowerName = name.toLowerCase().trim();

  if (PROTECTED_PROCESS_NAMES.has(lowerName) || PROTECTED_PROCESS_NAMES.has(lowerName + ".exe")) {
    return true;
  }

  for (const sub of PROTECTED_SUBSTRINGS) {
    if (lowerName.includes(sub)) return true;
  }

  if (command) {
    const lowerCmd = command.toLowerCase();
    for (const sysPath of PROTECTED_SYSTEM_PATHS) {
      if (lowerCmd.includes(sysPath)) return true;
    }
    for (const sub of PROTECTED_SUBSTRINGS) {
      if (lowerCmd.includes(sub)) return true;
    }
  }

  return false;
}

/**
 * Checks whether a path is in a personal user folder
 * Personal folders can NEVER be automatically cleaned.
 */
export function isPersonalFolder(filePath: string): boolean {
  if (!filePath) return false;
  const normalized = filePath.toLowerCase().replace(/\\/g, "/");
  const parts = normalized.split("/");
  for (const personal of PERSONAL_FOLDERS) {
    if (parts.includes(personal)) return true;
  }
  return false;
}

/**
 * Checks whether a path points to a protected system location
 */
export function isProtectedPath(filePath: string): boolean {
  if (!filePath) return true;
  const lowerPath = filePath.toLowerCase();
  for (const sysPath of PROTECTED_SYSTEM_PATHS) {
    if (lowerPath.startsWith(sysPath)) return true;
  }
  return false;
}
