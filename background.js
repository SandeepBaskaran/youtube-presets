/* background.js */
importScripts("presetCore.js");

chrome.commands.onCommand.addListener((command, tab) => {
  const match = /^apply-preset-([1-4])$/.exec(command);
  if (!match) return;

  const presetIndex = Number(match[1]) - 1;
  void (async () => {
    try {
      const presets = await YouTubePresetCore.getPresets();
      const preset = presets[presetIndex];
      if (!preset) return;

      await YouTubePresetCore.applyPresetToTab(tab, preset);
    } catch (error) {
      console.error(`Could not apply preset ${presetIndex + 1}`, error);
    }
  })();
});
