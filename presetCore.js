/* presetCore.js */
(() => {
  const MAX_PRESETS = 5;

  const DEFAULT_PRESET_DEFINITIONS = [
    {
      name: "Focus 2x + Theater (Max)",
      speed: 2,
      quality: "max",
      viewMode: "theater",
      captions: "off",
      sleepTimer: "off",
      volume: "unchanged"
    },
    {
      name: "Chill 1.25× + Default (1080p)",
      speed: 1.25,
      quality: "1080",
      viewMode: "default",
      captions: "off",
      sleepTimer: "off",
      volume: "unchanged"
    }
  ];

  function normalizeVolume(value) {
    if (value === "unchanged" || value === null || value === undefined || value === "") {
      return "unchanged";
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "unchanged";
    return Math.round(Math.min(100, Math.max(0, numericValue)));
  }

  function normalizePreset(preset = {}) {
    const speed = Number(preset.speed);
    return {
      id: preset.id || crypto.randomUUID(),
      name: String(preset.name || "Preset"),
      speed: Number.isFinite(speed) && speed > 0 ? speed : 1,
      quality: String(preset.quality || "auto"),
      viewMode: String(preset.viewMode || "default"),
      captions: preset.captions === "on" ? "on" : "off",
      sleepTimer: String(preset.sleepTimer || "off"),
      volume: normalizeVolume(preset.volume)
    };
  }

  function createDefaultPresets() {
    return DEFAULT_PRESET_DEFINITIONS.map(definition => normalizePreset(definition));
  }

  async function getPresets() {
    const { presets } = await chrome.storage.sync.get("presets");
    if (Array.isArray(presets)) return presets.map(normalizePreset);

    const defaults = createDefaultPresets();
    await setPresets(defaults);
    return defaults;
  }

  async function setPresets(presets) {
    await chrome.storage.sync.set({
      presets: presets.map(normalizePreset)
    });
  }

  function isYouTubeTab(tab) {
    return Boolean(tab && /^https:\/\/www\.youtube\.com\//.test(tab.url || ""));
  }

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async function runPlayerAction(tab, action, preset) {
    const activeTab = tab || await getActiveTab();
    if (!isYouTubeTab(activeTab)) {
      if (action === "capture") {
        throw new Error("Open a YouTube video to capture its current settings.");
      }
      throw new Error("Open a YouTube video page, then try again.");
    }

    let results;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["content/applyPreset.js"],
        world: "MAIN"
      });

      results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: async (requestedAction, requestedPreset) => {
          const handler = requestedAction === "capture"
            ? window.__ytp_capturePreset
            : window.__ytp_applyPreset;

          if (typeof handler !== "function") {
            return {
              ok: false,
              error: requestedAction === "capture"
                ? "Current player settings are unavailable on this page."
                : "Preset controls are unavailable on this page."
            };
          }

          try {
            return await handler(requestedPreset);
          } catch (error) {
            return {
              ok: false,
              error: error?.message || "The YouTube player was not ready."
            };
          }
        },
        args: [action, preset || null],
        world: "MAIN"
      });
    } catch (error) {
      console.error(`Could not ${action} YouTube player settings`, error);
      throw new Error(
        action === "capture"
          ? "Could not read the YouTube player. Refresh the tab and try again."
          : "Could not access the YouTube player. Refresh the tab and try again."
      );
    }

    const result = results?.[0]?.result;
    if (!result?.ok) {
      throw new Error(
        result?.error ||
        (action === "capture"
          ? "The YouTube player did not return its current settings."
          : "The YouTube player did not confirm the preset.")
      );
    }

    return result;
  }

  async function applyPresetToTab(tab, preset) {
    await runPlayerAction(tab, "apply", normalizePreset(preset));
  }

  async function applyPresetToActiveTab(preset) {
    await applyPresetToTab(null, preset);
  }

  async function capturePresetFromActiveTab() {
    const result = await runPlayerAction(null, "capture");
    return normalizePreset({
      ...result.preset,
      id: crypto.randomUUID(),
      sleepTimer: "off"
    });
  }

  function formatSpeed(speed) {
    return Number.isInteger(speed) ? String(speed) : String(speed).replace(/0+$/, "");
  }

  function formatQuality(quality) {
    if (quality === "max") return "Max";
    if (quality === "auto") return "Auto";
    return `${quality}p`;
  }

  function formatViewMode(viewMode) {
    const labels = {
      default: "Default",
      theater: "Theater",
      fullscreen: "Fullscreen",
      pip: "Picture-in-Picture"
    };
    return labels[viewMode] || "Default";
  }

  function generatePresetName(preset) {
    return [
      formatViewMode(preset.viewMode),
      `${formatSpeed(preset.speed)}×`,
      formatQuality(preset.quality)
    ].join(" · ");
  }

  globalThis.YouTubePresetCore = Object.freeze({
    MAX_PRESETS,
    normalizePreset,
    normalizeVolume,
    getPresets,
    setPresets,
    applyPresetToTab,
    applyPresetToActiveTab,
    capturePresetFromActiveTab,
    generatePresetName,
    formatQuality,
    formatViewMode
  });
})();
