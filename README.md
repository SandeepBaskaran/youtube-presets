# YouTube Presets

A focused Chrome extension for capturing and restoring complete YouTube player setups.

[**Install YouTube Presets from the Chrome Web Store**](https://chromewebstore.google.com/detail/youtube-presets/pkpaeeeaenkiihcebmpfdleiapmofgig)

## What's new in 1.2.0

- Capture the current player's speed, quality, view mode, captions, and volume when creating a preset.
- Apply the first four presets with configurable Chrome keyboard shortcuts.
- Keep preset creation clear at the five-preset limit with a disabled **+** button and tooltip.
- Confirm before deleting a preset, and keep an intentionally empty preset list empty.
- Use a cleaner card layout with **Delete**, **Edit**, and primary **Apply** actions.
- Confirm a successful apply with **Applied**, then close the popup quickly and return focus to YouTube.
- Preserve existing volume for presets saved before volume support.

## What it does

- Capture the active player's settings when creating a preset.
- Save up to five presets.
- Set playback speed, available video quality, and volume.
- Switch between default, theater, fullscreen, and picture-in-picture modes.
- Turn captions on or off when they are available.
- Pause playback after 5–60 minutes, or disable autoplay at the end of a video.
- Apply the first four presets with configurable Chrome keyboard shortcuts.
- Sync presets with `chrome.storage.sync`.
- Close the popup automatically after YouTube confirms a preset was applied.

## Install from source

This repository has no build step or runtime dependencies.

1. Clone or download the repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository root. For an acceptance-test build, choose its `dist` folder instead.

Reload the extension from `chrome://extensions` after changing source files.

## Use

1. Open a video at `https://www.youtube.com/`.
2. Open YouTube Presets.
3. Apply an existing preset, or select **+** to capture the current player settings and create one.

After a successful apply, the popup briefly shows **Applied** and closes. If the YouTube player is unavailable, the popup stays open and shows an error.

When creating a preset, the generated name is selected automatically. Type to replace it, or save it as shown. At five presets, **+** remains disabled until a preset is deleted.

The first four presets can also be applied with `Ctrl+Shift+1` through `Ctrl+Shift+4` (`Command+Shift+1` through `Command+Shift+4` on macOS). Change or remove these shortcuts at `chrome://extensions/shortcuts`. The fifth preset remains available from the popup.

Quality choices depend on the current video. Captions are unchanged when a video has no caption track. Presets created before volume support leave the existing player volume unchanged. YouTube interface changes can affect quality and view-mode controls.

## Project structure

- `manifest.json`: Manifest V3 configuration and permissions.
- `popup.html`, `popup.css`, `popup.js`: Preset management and popup interface.
- `presetCore.js`: Shared storage, capture, and apply operations.
- `background.js`: Keyboard shortcut commands.
- `content/`: YouTube page integration code.
- `icons/`: Extension icons.
- `chrome-store-assets/`: Store listing images; not required at runtime.

## Permissions

- `storage`: Sync saved presets.
- `scripting`: Run preset controls in the active YouTube page.
- `activeTab`: Access the tab when Apply is clicked.
- `https://www.youtube.com/*`: Limit page access to YouTube.

## Release checklist

Load the extension unpacked and verify:

- Apply from a playing YouTube video shows **Applied**, closes the popup, and returns focus to the page.
- Apply from a non-YouTube tab or a YouTube page without a player leaves the popup open with an error.
- Speed, quality, view mode, captions, and each sleep-timer mode work as expected.
- Volume applies correctly, including 0%, while older presets leave volume unchanged.
- Creating a preset captures the current settings and selects its generated name.
- Capture failure falls back to editable defaults without blocking preset creation.
- Shortcuts 1–4 apply the corresponding presets and safely do nothing for empty positions.
- At five presets, **+** is disabled with an explanatory tooltip and re-enables after deletion.
- Creating, editing, and syncing presets still work.
- Delete opens a confirmation dialog and removes the preset only after confirmation.
