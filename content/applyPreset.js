/* content/applyPreset.js */
(() => {
    if (window.__ytp_applyPreset) return; // idempotent
  
    async function ensurePlayer() {
      // Wait for the <video> and the main flexy container
      const video = document.querySelector("video");
      const flexy = document.querySelector("ytd-watch-flexy");
      if (!video) throw new Error("No video element found");
      return { video, flexy };
    }
  
    function setSpeed(video, speed) {
      try {
        video.playbackRate = speed; // reliable HTMLMediaElement API
      } catch {}
    }
  
    async function setViewMode({ video, flexy }, mode) {
      const sizeBtn = document.querySelector(".ytp-size-button");
      const fsBtn = document.querySelector(".ytp-fullscreen-button");
  
      if (mode === "default" && flexy?.hasAttribute("theater")) {
        sizeBtn?.click(); // toggles back to default
        return;
      }
      if (mode === "theater" && flexy && !flexy.hasAttribute("theater")) {
        sizeBtn?.click();
        return;
      }
      if (mode === "fullscreen") {
        // Prefer the player button to respect YouTube UI
        fsBtn?.click();
        // Fallback: documentElement.requestFullscreen()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        }
        return;
      }
      if (mode === "pip") {
        if (document.pictureInPictureEnabled && !video.disablePictureInPicture) {
          try {
            await video.requestPictureInPicture();
          } catch (e) {
            // ignore if browser denies
          }
        }
      }
    }
  
    function parseQualityNumber(labelText) {
      // Extract 2160, 1440, 1080, 720 etc from strings like "1080p", "1080p60", "Auto (1080p)"
      const m = labelText.match(/(\d{3,4})p/);
      return m ? parseInt(m[1], 10) : null;
    }
  
    async function setQuality(target) {
      // target: "max" | "auto" | "2160" | "1440" | "1080" | "720" etc
      const settingsBtn = document.querySelector(".ytp-settings-button");
      if (!settingsBtn) return;
  
      // Open main settings
      settingsBtn.click();
      await new Promise(r => setTimeout(r, 80));
  
      // Click "Quality" (works across locales that contain a number + p or "Quality" English)
      let rootItems = [...document.querySelectorAll(".ytp-menuitem")];
      // Find something with "Quality" OR containing a resolution label like "1080p"
      let qualityItem = rootItems.find(i => /Quality/i.test(i.textContent)) ||
                        rootItems.find(i => /\d{3,4}p/.test(i.textContent));
      if (!qualityItem) { document.body.click(); return; }
      qualityItem.click();
      await new Promise(r => setTimeout(r, 80));
  
      // Now in quality submenu
      const options = [...document.querySelectorAll(".ytp-menuitem")];
      // Build candidates with numeric quality where possible; include "Auto"
      const mapped = options.map(opt => {
        const txt = opt.textContent.trim();
        const q = parseQualityNumber(txt);
        return { opt, txt, q, isAuto: /Auto/i.test(txt) };
      });
  
      let chosen;
      if (target === "auto") {
        chosen = mapped.find(m => m.isAuto);
      } else if (target === "max") {
        // pick the highest numeric quality available
        const onlyNum = mapped.filter(m => m.q).sort((a,b)=>b.q-a.q);
        chosen = onlyNum[0] || mapped.find(m => m.isAuto);
      } else {
        const targetNum = parseInt(target, 10);
        // pick exact or next lower (e.g., 1080 if 1440 unavailable)
        const onlyNum = mapped.filter(m => m.q).sort((a,b)=>b.q-a.q);
        chosen = onlyNum.find(m => m.q === targetNum) || onlyNum.find(m => m.q < targetNum) || onlyNum[0];
      }
  
      chosen?.opt.click();
      // Close menu (click outside)
      document.body.click();
    }
  
    function setCaptions(mode) {
      // mode: 'on' | 'off'
      const btn = document.querySelector('.ytp-subtitles-button');
      if (!btn) return; // captions may be unavailable
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      if (mode === 'on' && !pressed) btn.click();
      if (mode === 'off' && pressed) btn.click();
    }

    function maybeDisableAutoplay() {
      // Try to turn off autoplay so playback doesn't continue after end
      const auto = document.querySelector('.ytp-autonav-toggle-button');
      if (!auto) return;
      const checked = auto.getAttribute('aria-checked') === 'true';
      if (checked) auto.click();
    }

    function setupSleepTimer(video, sleepTimer) {
      // sleepTimer: 'off' | 'end' | '5' | '10' | ... minutes as string
      if (window.__ytp_sleepTimerId) {
        clearTimeout(window.__ytp_sleepTimerId);
        window.__ytp_sleepTimerId = null;
      }
      if (!sleepTimer || sleepTimer === 'off') return;

      if (sleepTimer === 'end') {
        // No explicit timer needed; ensure autoplay is off
        try { maybeDisableAutoplay(); } catch {}
        return;
      }
      const minutes = parseFloat(sleepTimer);
      if (!isNaN(minutes) && minutes > 0) {
        window.__ytp_sleepTimerId = setTimeout(() => {
          try {
            // Exit fullscreen/PiP if active
            if (document.pictureInPictureElement) document.exitPictureInPicture?.();
            if (document.fullscreenElement) document.exitFullscreen?.();
          } catch {}
          try { video.pause(); } catch {}
        }, minutes * 60 * 1000);
      }
    }

    window.__ytp_applyPreset = async function applyPreset(preset) {
      const ctx = await ensurePlayer();
      setSpeed(ctx.video, preset.speed);
      try { await setQuality(preset.quality); } catch {}

      // Theater/fullscreen/PiP last so UI state ends where user expects
      try { await setViewMode(ctx, preset.viewMode); } catch {}

      // Captions toggle
      try { setCaptions(preset.captions); } catch {}

      // Sleep timer setup
      try { setupSleepTimer(ctx.video, preset.sleepTimer); } catch {}
    };
  })();