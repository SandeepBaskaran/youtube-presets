/* content/util.js */

/**
 * Wait for a DOM selector to exist.
 */
window.waitForEl = (sel, timeout = 5000) => new Promise((resolve, reject) => {
    const t0 = performance.now();
    const tick = () => {
      const el = document.querySelector(sel);
      if (el) return resolve(el);
      if (performance.now() - t0 > timeout) return reject(new Error("Timeout waiting for " + sel));
      requestAnimationFrame(tick);
    };
    tick();
  });
  
  /**
   * Click a menu item by label in YouTube's settings menu.
   * Robust to A/B changes by fuzzy matching.
   */
  window.__yt_clickSettingsItem = async (labelRegex) => {
    const btn = document.querySelector(".ytp-settings-button");
    if (!btn) throw new Error("Settings button not found");
    btn.click();
  
    // open root menu populated
    await new Promise(r => setTimeout(r, 100));
  
    const items = [...document.querySelectorAll(".ytp-menuitem")];
    const target = items.find(i => labelRegex.test(i.textContent.trim()));
    if (target) {
      target.click();
      await new Promise(r => setTimeout(r, 80));
      return true;
    }
    // close if not found
    document.body.click();
    return false;
  };
  