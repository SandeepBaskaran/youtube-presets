# YouTube Presets (Chrome Extension)

One‑click presets for YouTube: playback speed, quality, view mode (default/theater/fullscreen/PiP), captions on/off, and a sleep timer. Designed with a clean Material/YouTube‑inspired UI and dark/light theme support.

## Features

- Apply preset instantly to the active YouTube video tab
- Controls saved per preset:
  - Speed
  - Quality (max/auto/exact like 2160/1440/1080/720)
  - View mode (default/theater/fullscreen/PiP)
  - Captions (on/off)
  - Sleep timer (off, 5–60 min, end of video)
- Create, edit, delete presets
- Modern UI that adapts to system dark/light mode
- Sticky header and footer for a polished panel experience

## Install (Developer Mode)

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable "Developer mode" (toggle on the top right).
4. Click "Load unpacked" and select the project folder.
5. Pin the extension for quick access.

## Usage

1. Open a YouTube video page (URL starts with `https://www.youtube.com/`).
2. Click the extension icon to open the popup.
3. Click "Apply" on a preset, or use the + button to create a new preset.
4. When applying:
   - Speed/quality/view mode are set on the player.
   - Captions are toggled if available for the video.
   - Sleep timer pauses playback after the selected time (or disables autoplay for "End of video").

Notes:
- Some videos may not offer captions; the captions toggle will be a no‑op.
- If YouTube experiments change the settings menu structure, quality selection may require tweaks.

## Files of interest

- `manifest.json` — MV3 manifest with permissions and content scripts.
- `popup.html`, `popup.css`, `popup.js` — Popup UI, theming, and preset management.
- `content/applyPreset.js` — Injected into the YouTube page (MAIN world) to apply presets.
- `content/util.js` — Utility helpers for DOM.

## Configuring the footer links

The popup footer contains two links:
- Left: "Vibe coded by Sandeep Baskaran" → LinkedIn.
- Right: "Share feedback" → Notion form (or any feedback URL you choose).

To change the feedback URL, edit `popup.html` and update the `href` of the element with `id="feedbackLink"`.

```html
<a href="https://your-notion-form-url" id="feedbackLink" target="_blank" rel="noopener noreferrer">Share feedback</a>
```

## Development

- The extension uses `chrome.storage.sync` to store presets.
- Applying presets uses `chrome.scripting.executeScript` targeting the page's MAIN world.
- To iterate on styles or behavior:
  1. Make changes in the repo.
  2. Reload the extension from `chrome://extensions` (click Reload on the card).
  3. Refresh the YouTube tab and test again.

## Permissions

- `storage` — store presets across devices.
- `scripting` — inject and execute the apply script on YouTube pages.
- `activeTab` — operate on the active YouTube tab when you click Apply.
- `host_permissions` — limited to `https://www.youtube.com/*`.

## Contributing

Pull requests and suggestions are welcome! Feel free to fork and customize presets or add more options (volume, subtitles language, looping, etc.).

## License

MIT License. See `LICENSE` (add one if you plan to publish).
