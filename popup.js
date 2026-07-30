/* popup.js */
const $$ = (selector, root = document) => root.querySelector(selector);
const $$$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const APPLY_CLOSE_DELAY_MS = 400;
const {
  MAX_PRESETS,
  normalizePreset,
  getPresets,
  setPresets,
  applyPresetToActiveTab,
  capturePresetFromActiveTab,
  generatePresetName,
  formatQuality,
  formatViewMode
} = YouTubePresetCore;

function setStatus(message = "", isError = false) {
  const status = $$("#status");
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function setDialogHint(message = "", isError = false) {
  const hint = $$("#createHint");
  hint.textContent = message;
  hint.classList.toggle("error", isError);
}

function setApplyButtonsDisabled(disabled) {
  $$$(".actions .apply").forEach(button => {
    button.disabled = disabled;
  });
}

function updateCreateButton(presets, isBusy = false) {
  const button = $$("#createBtn");
  const wrapper = $$("#createBtnWrapper");
  const atLimit = presets.length >= MAX_PRESETS;
  const message = atLimit
    ? "Maximum of 5 presets reached. Delete a preset to create another."
    : isBusy
      ? "Capturing current YouTube settings…"
      : "Create preset";

  button.disabled = atLimit || isBusy;
  button.setAttribute("aria-label", message);
  wrapper.classList.toggle("disabled", atLimit || isBusy);
  wrapper.title = message;
}

function ensureSelectOption(select, value, label) {
  const stringValue = String(value);
  if (![...select.options].some(option => option.value === stringValue)) {
    const option = document.createElement("option");
    option.value = stringValue;
    option.textContent = label;
    select.appendChild(option);
  }
  select.value = stringValue;
}

function formatSpeed(speed) {
  return Number.isInteger(speed) ? String(speed) : String(speed).replace(/0+$/, "");
}

function formatPresetDescription(preset) {
  const details = [
    `${formatSpeed(preset.speed)}× speed`,
    `${formatQuality(preset.quality)} quality`,
    formatViewMode(preset.viewMode),
    `captions ${preset.captions}`,
    `sleep ${preset.sleepTimer}`
  ];

  if (preset.volume !== "unchanged") {
    details.push(`volume ${preset.volume}%`);
  }

  return details.join(" • ");
}

function confirmPresetDeletion(preset) {
  const dialog = $$("#deleteDialog");
  $$("#deletePresetName").textContent = preset.name;
  dialog.returnValue = "";
  dialog.showModal();

  return new Promise(resolve => {
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue === "delete");
    }, { once: true });
  });
}

function renderPreset(rawPreset) {
  const preset = normalizePreset(rawPreset);
  const element = document.createElement("div");
  element.className = "preset";
  element.innerHTML = `
    <div class="meta">
      <div class="name"></div>
      <div class="desc"></div>
    </div>
    <div class="actions">
      <button class="action-button del" type="button">Delete</button>
      <button class="action-button edit" type="button">Edit</button>
      <button class="action-button apply" type="button">Apply</button>
    </div>
  `;
  element.querySelector(".name").textContent = preset.name;
  element.querySelector(".desc").textContent = formatPresetDescription(preset);

  element.querySelector(".apply").addEventListener("click", async event => {
    const button = event.currentTarget;
    $$$(".actions .apply").forEach(applyButton => {
      applyButton.textContent = applyButton === button ? "Applying…" : "Apply";
      applyButton.classList.remove("applied");
    });
    setApplyButtonsDisabled(true);
    setStatus();

    try {
      await applyPresetToActiveTab(preset);
      button.textContent = "Applied";
      button.classList.add("applied");
      setStatus("Preset applied. Returning to YouTube…");
      setTimeout(() => window.close(), APPLY_CLOSE_DELAY_MS);
    } catch (error) {
      console.error("Apply preset failed", error);
      button.textContent = "Try again";
      setApplyButtonsDisabled(false);
      setStatus(error.message || "Could not apply the preset. Refresh YouTube and try again.", true);
    }
  });

  element.querySelector(".del").addEventListener("click", async () => {
    if (!await confirmPresetDeletion(preset)) return;

    const presets = await getPresets();
    await setPresets(presets.filter(item => item.id !== preset.id));
    await hydrate();
  });

  element.querySelector(".edit").addEventListener("click", () => {
    openPresetDialog({ existing: preset });
  });

  return element;
}

async function hydrate() {
  const list = $$("#presets");
  list.innerHTML = "";
  const presets = await getPresets();
  updateCreateButton(presets);

  if (presets.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "No presets yet. Use + to create one.";
    list.appendChild(emptyState);
    return;
  }

  presets.forEach(preset => list.appendChild(renderPreset(preset)));
}

function setPresetFormValues(preset) {
  const speed = $$("#speed");
  const quality = $$("#quality");
  const volume = $$("#volume");

  $$("#name").value = preset.name;
  ensureSelectOption(speed, preset.speed, `${formatSpeed(preset.speed)}×`);
  ensureSelectOption(quality, preset.quality, formatQuality(preset.quality));
  $$("#viewMode").value = preset.viewMode;
  $$("#captions").value = preset.captions;
  $$("#sleepTimer").value = preset.sleepTimer;
  ensureSelectOption(
    volume,
    preset.volume,
    preset.volume === "unchanged" ? "Leave unchanged" : `${preset.volume}%`
  );
}

function readPresetForm(existing) {
  const volumeValue = $$("#volume").value;
  return normalizePreset({
    id: existing?.id || crypto.randomUUID(),
    name: $$("#name").value.trim() || "Preset",
    speed: Number($$("#speed").value),
    quality: $$("#quality").value,
    viewMode: $$("#viewMode").value,
    captions: $$("#captions").value,
    sleepTimer: $$("#sleepTimer").value,
    volume: volumeValue === "unchanged" ? "unchanged" : Number(volumeValue)
  });
}

function openPresetDialog({ existing = null, captured = null, captureError = "" } = {}) {
  const dialog = $$("#createDialog");
  const form = $$("#createForm");
  const name = $$("#name");
  const isEditing = Boolean(existing);
  const initialPreset = normalizePreset(
    existing ||
    captured || {
      name: "Theater · 2× · Max",
      speed: 2,
      quality: "max",
      viewMode: "theater",
      captions: "off",
      sleepTimer: "off",
      volume: "unchanged"
    }
  );

  if (!isEditing && captured) {
    initialPreset.name = generatePresetName(initialPreset);
  }

  $$("#createDialogTitle").textContent = isEditing ? "Edit Preset" : "Create Preset";
  setPresetFormValues(initialPreset);
  setDialogHint(isEditing ? "" : captureError, Boolean(captureError));

  form.onsubmit = async event => {
    event.preventDefault();
    const presets = await getPresets();

    if (!isEditing && presets.length >= MAX_PRESETS) {
      setDialogHint("Maximum of 5 presets reached. Delete a preset to create another.", true);
      updateCreateButton(presets);
      return;
    }

    const newPreset = readPresetForm(existing);
    const updated = isEditing
      ? presets.map(preset => preset.id === existing.id ? newPreset : preset)
      : [...presets, newPreset];

    await setPresets(updated);
    dialog.close();
    await hydrate();
  };

  $$("#cancelCreateBtn").onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    form.onsubmit = null;
    $$("#cancelCreateBtn").onclick = null;
  }, { once: true });

  dialog.showModal();
  requestAnimationFrame(() => {
    name.focus();
    if (!isEditing) name.select();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  $$("#createBtn").addEventListener("click", async () => {
    const presets = await getPresets();
    if (presets.length >= MAX_PRESETS) {
      updateCreateButton(presets);
      return;
    }

    updateCreateButton(presets, true);
    setStatus("Capturing current YouTube settings…");

    try {
      const captured = await capturePresetFromActiveTab();
      setStatus();
      openPresetDialog({ captured });
    } catch (error) {
      setStatus();
      openPresetDialog({
        captureError: `${error.message} You can still create the preset manually.`
      });
    } finally {
      updateCreateButton(presets);
    }
  });

  await hydrate();
});
