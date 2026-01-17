/* popup.js */
const $$ = (sel, root = document) => root.querySelector(sel);
const $$$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const DEFAULT_PRESETS = [
  { id: crypto.randomUUID(), name: "Focus 2x + Theater (Max)", speed: 2, quality: "max", viewMode: "theater", captions: "off", sleepTimer: "off" },
  { id: crypto.randomUUID(), name: "Chill 1.25× + Default (1080p)", speed: 1.25, quality: "1080", viewMode: "default", captions: "off", sleepTimer: "off" }
];

async function getPresets() {
  const { presets } = await chrome.storage.sync.get("presets");
  return presets && presets.length ? presets : DEFAULT_PRESETS;
}
async function setPresets(presets) {
  await chrome.storage.sync.set({ presets });
}

function renderPreset(p) {
  const el = document.createElement("div");
  el.className = "preset";
  el.innerHTML = `
    <div class="meta">
      <div class="name">${p.name}</div>
      <div class="desc">speed ${p.speed}× • quality ${p.quality} • ${p.viewMode} • captions ${p.captions} • sleep timer ${p.sleepTimer}</div>
    </div>
    <div class="actions">
      <button class="apply" title="Apply" aria-label="Apply">Apply</button>
      <button class="icon edit" title="Edit" aria-label="Edit">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82Z"/>
        </svg>
      </button>
      <button class="icon del" title="Delete" aria-label="Delete">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6 7h12v2H6V7Zm2 3h8l-1 10H9L8 10Zm3-6h2l1 1h4v2H6V5h4l1-1Z"/>
        </svg>
      </button>
    </div>
  `;

  el.querySelector(".apply").addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    await applyPresetToActiveTab(p);
    // Show transient Applied state
    btn.textContent = "Applied";
    btn.classList.add("applied");
    // Reset all other apply buttons to default label
    $$$('.actions .apply').forEach(b => {
      if (b !== btn) { b.textContent = "Apply"; b.classList.remove("applied"); }
    });
    setTimeout(() => {
      btn.textContent = "Apply";
      btn.classList.remove("applied");
    }, 1200);
  });
  el.querySelector(".del").addEventListener("click", async () => {
    const all = await getPresets();
    await setPresets(all.filter(x => x.id !== p.id));
    await hydrate();
  });
  el.querySelector(".edit").addEventListener("click", () => openCreateDialog(p));
  return el;
}

async function hydrate() {
  const list = $$("#presets");
  list.innerHTML = "";
  (await getPresets()).forEach(p => list.appendChild(renderPreset(p)));
}

async function applyPresetToActiveTab(preset) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/www\.youtube\.com\//.test(tab.url || "")) {
    alert("Open a YouTube video tab to apply a preset.");
    return;
  }

  // Inject our apply script into the page (MAIN world) and run with args.
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content/applyPreset.js"],
    world: "MAIN"
  });

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (preset) => window.__ytp_applyPreset && window.__ytp_applyPreset(preset),
      args: [preset],
      world: "MAIN"
    });
  } catch (e) {
    console.error("Apply preset failed", e);
    alert("Could not apply preset. If this keeps happening, refresh the YouTube tab and try again.");
    return;
  }

  // Keep popup open to show 'Applied' feedback
}

function openCreateDialog(existing) {
  const dlg = $$("#createDialog");
  const name = $$("#name");
  const speed = $$("#speed");
  const quality = $$("#quality");
  const viewMode = $$("#viewMode");
  const captions = $$("#captions");
  const sleepTimer = $$("#sleepTimer");

  if (existing) {
    name.value = existing.name;
    speed.value = String(existing.speed);
    quality.value = String(existing.quality);
    viewMode.value = existing.viewMode;
    captions.value = existing.captions || "off";
    sleepTimer.value = existing.sleepTimer || "off";
  } else {
    name.value = ""; speed.value = "2"; quality.value = "max"; viewMode.value = "theater"; captions.value = "off"; sleepTimer.value = "off";
  }
  dlg.showModal();

  $$("#saveBtn").onclick = async (e) => {
    e.preventDefault();
    const newPreset = {
      id: existing?.id || crypto.randomUUID(),
      name: name.value.trim() || "Preset",
      speed: parseFloat(speed.value),
      quality: quality.value,
      viewMode: viewMode.value,
      captions: captions.value,
      sleepTimer: sleepTimer.value
    };
    const all = await getPresets();
    const updated = existing ? all.map(p => p.id === existing.id ? newPreset : p) : [...all, newPreset];
    await setPresets(updated);
    dlg.close();
    await hydrate();
  };
  dlg.addEventListener("close", () => {
    // cleanup handler to avoid stacking listeners
    $$("#saveBtn").onclick = null;
  }, { once: true });
}

document.addEventListener("DOMContentLoaded", async () => {
  $$("#createBtn").addEventListener("click", async () => {
    const all = await getPresets();
    if (all.length >= 5) {
      alert("You can have a maximum of 5 presets.");
      return;
    }
    openCreateDialog();
  });
  await hydrate();
});
