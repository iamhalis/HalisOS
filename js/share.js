// =========================================================================
// 8. SHARE.JS — TÍNH NĂNG CHIA SẺ & NHẬP MÃ NHIỆM VỤ
// =========================================================================
let selectedShareTaskIndices = new Set();
let currentShareViewFilter = "week";
let currentGeneratedShareCode = "";
let pendingImportTasks = [];
let expandedShareDays = new Set();

function encodeBytesToShareCode(bytes) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += SHARE_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += SHARE_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output.match(/.{1,4}/g).join("-");
}

function decodeShareCodeToBytes(codeStr) {
  const cleaned = String(codeStr || "")
    .toUpperCase()
    .replace(/[-\s]/g, "");

  if (!cleaned) return null;

  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = SHARE_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

function computeShortHashCode(jsonString) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  let h3 = 0x9e3779b9;

  for (let i = 0; i < jsonString.length; i++) {
    const ch = jsonString.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
    h3 ^= (ch << 3) ^ i;
    h3 = Math.imul(h3, 0xc2b2ae35) >>> 0;
  }

  const pick4 = seed => {
    let s = seed >>> 0;
    let part = "";
    for (let k = 0; k < 4; k++) {
      part += SHARE_ALPHABET[s & 31];
      s = (s >>> 5) ^ (s << 3);
    }
    return part;
  };

  return `${pick4(h1)}-${pick4(h2)}-${pick4(h3)}`;
}

function validateDecodedSharePayload(parsedArray) {
  if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
    return { valid: false, error: "Dữ liệu nhiệm vụ trong mã trống hoặc không đúng cấu trúc!" };
  }

  const sanitizedTasks = [];

  for (let i = 0; i < parsedArray.length; i++) {
    const item = parsedArray[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { valid: false, error: `Nhiệm vụ thứ ${i + 1} trong mã không hợp lệ!` };
    }

    const keys = Object.keys(item);
    if (
      keys.length !== 3 ||
      !keys.includes("name") ||
      !keys.includes("date") ||
      !keys.includes("time")
    ) {
      return {
        valid: false,
        error: "Cấu trúc dữ liệu mã không hợp lệ (mỗi nhiệm vụ chỉ được chứa name, date, time)!"
      };
    }

    const name = String(item.name || "").trim();
    const rawDate = String(item.date || "").trim();
    const rawTime = String(item.time || "").trim();

    if (!name) {
      return { valid: false, error: `Tên nhiệm vụ thứ ${i + 1} không được để trống!` };
    }

    const displayDate = formatDisplayDate(rawDate);
    const isoDate = parseAndValidateDDMMYYYY(displayDate);
    if (!isoDate) {
      return {
        valid: false,
        error: `Ngày "${rawDate}" của nhiệm vụ "${name}" không đúng định dạng DD-MM-YYYY!`
      };
    }

    if (!validateTimeHHMM(rawTime)) {
      return {
        valid: false,
        error: `Thời gian "${rawTime}" của nhiệm vụ "${name}" không đúng định dạng HH:MM!`
      };
    }

    sanitizedTasks.push({
      name,
      date: displayDate,
      time: rawTime
    });
  }

  return { valid: true, data: sanitizedTasks };
}

async function serializeAndCreateShareCode(selectedTaskObjects) {
  const cleanPayload = selectedTaskObjects.map(t => ({
    name: String(t.name).trim(),
    date: formatDisplayDate(t.date),
    time: String(t.time || "00:00").trim()
  }));

  const jsonStr = JSON.stringify(cleanPayload);
  const utf8Bytes = new TextEncoder().encode(jsonStr);
  const selfContainedCode = encodeBytesToShareCode(utf8Bytes);
  const shortCode = computeShortHashCode(jsonStr);

  shareCodeRegistry[shortCode] = cleanPayload;
  localStorage.setItem("studyos_share_codes", JSON.stringify(shareCodeRegistry));

  if (isCloudEnabled()) {
    try {
      await fetch(`${getCloudBase()}/studyos_share_codes/${encodeURIComponent(shortCode)}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload)
      });
      return { code: shortCode, payload: cleanPayload };
    } catch {
      // Fallback sang mã tự giải mã đầy đủ
    }
  }

  return { code: selfContainedCode, payload: cleanPayload };
}

async function decodeAndParseShareCode(rawInputCode) {
  const trimmed = String(rawInputCode || "").trim().toUpperCase();
  if (!trimmed) {
    return { valid: false, error: "Mã chia sẻ không được để trống!" };
  }

  if (!/^[A-Z0-9-]+$/.test(trimmed)) {
    return { valid: false, error: "Mã sai định dạng! Chỉ chấp nhận chữ cái, số và dấu gạch ngang (VD: AB7K-X92P-Q41M)." };
  }

  if (/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(trimmed)) {
    if (shareCodeRegistry[trimmed]) {
      return validateDecodedSharePayload(shareCodeRegistry[trimmed]);
    }
    if (isCloudEnabled()) {
      try {
        const res = await fetch(`${getCloudBase()}/studyos_share_codes/${encodeURIComponent(trimmed)}.json`);
        if (res.ok) {
          const cloudPayload = await res.json();
          if (cloudPayload) {
            shareCodeRegistry[trimmed] = cloudPayload;
            localStorage.setItem("studyos_share_codes", JSON.stringify(shareCodeRegistry));
            return validateDecodedSharePayload(cloudPayload);
          }
        }
      } catch {
        // Thử giải mã trực tiếp bên dưới
      }
    }
  }

  const decodedBytes = decodeShareCodeToBytes(trimmed);
  if (!decodedBytes || decodedBytes.length === 0) {
    return { valid: false, error: "Mã không hợp lệ hoặc không thể giải mã!" };
  }

  try {
    const jsonString = new TextDecoder("utf-8", { fatal: true }).decode(decodedBytes);
    const parsed = JSON.parse(jsonString);
    return validateDecodedSharePayload(parsed);
  } catch {
    return { valid: false, error: "Mã chia sẻ không tồn tại hoặc không thể giải mã!" };
  }
}

function createShareTaskRowElement(task, realIdx, counterEl) {
  const isChecked = selectedShareTaskIndices.has(realIdx);
  const displayDate = formatDisplayDate(task.date);
  const displayTime = task.time || "00:00";

  const row = document.createElement("label");
  row.className = `share-task-row ${isChecked ? "selected" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = isChecked;
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      selectedShareTaskIndices.add(realIdx);
      row.classList.add("selected");
    } else {
      selectedShareTaskIndices.delete(realIdx);
      row.classList.remove("selected");
    }
    counterEl.textContent = `Đã chọn: ${selectedShareTaskIndices.size} nhiệm vụ`;
  });

  const textLine = document.createElement("div");
  textLine.className = "share-task-line";
  textLine.innerHTML = `
    <span>${task.name}</span>
    <span class="share-task-sep">—</span>
    <span class="share-task-datetime">${displayDate}</span>
    <span class="share-task-sep">—</span>
    <span class="share-task-datetime">${displayTime}</span>
  `;

  row.appendChild(checkbox);
  row.appendChild(textLine);
  return row;
}

function createShareDayAccordionGroup(isoDate, titleLabel, dayTasks, showAddBtn, counterEl) {
  const isCollapsed = !expandedShareDays.has(isoDate);

  const groupBox = document.createElement("div");
  groupBox.className = `share-day-group ${isCollapsed ? "collapsed" : ""}`;

  const header = document.createElement("div");
  header.className = "share-day-group-header";

  const leftDiv = document.createElement("div");
  leftDiv.className = "share-day-left";

  const minBtn = document.createElement("button");
  minBtn.type = "button";
  minBtn.className = "share-minimize-btn";
  minBtn.title = isCollapsed ? "Mở rộng ngày này" : "Thu gọn ngày này";
  minBtn.textContent = isCollapsed ? "+" : "−";

  const titleSpan = document.createElement("span");
  titleSpan.className = "share-day-title";
  titleSpan.textContent = titleLabel;

  leftDiv.appendChild(minBtn);
  leftDiv.appendChild(titleSpan);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "share-day-actions";

  if (dayTasks.length > 0) {
    const allInDaySelected = dayTasks.every(t => selectedShareTaskIndices.has(tasks.indexOf(t)));
    const selectDayBtn = document.createElement("button");
    selectDayBtn.type = "button";
    selectDayBtn.className = "action-chip";
    selectDayBtn.textContent = allInDaySelected ? "Bỏ chọn ngày" : "Chọn ngày này";
    selectDayBtn.addEventListener("click", e => {
      e.stopPropagation();
      dayTasks.forEach(t => {
        const idx = tasks.indexOf(t);
        if (allInDaySelected) selectedShareTaskIndices.delete(idx);
        else selectedShareTaskIndices.add(idx);
      });
      renderShareTaskSelector();
    });
    actionsDiv.appendChild(selectDayBtn);
  }

  if (showAddBtn) {
    const addForDayBtn = document.createElement("button");
    addForDayBtn.type = "button";
    addForDayBtn.className = "action-chip";
    addForDayBtn.textContent = "+ Thêm task";
    addForDayBtn.addEventListener("click", e => {
      e.stopPropagation();
      switchTab("tasks");
      resetTaskForm();
      document.getElementById("task-date-input").value = isoDate;
      document.getElementById("task-date-display").value = formatDisplayDate(isoDate);
      renderQuickWeekdayPicker();
      document.getElementById("task-name-input").focus();
    });
    actionsDiv.appendChild(addForDayBtn);
  }

  const toggleCollapse = () => {
    if (expandedShareDays.has(isoDate)) {
      expandedShareDays.delete(isoDate);
    } else {
      expandedShareDays.add(isoDate);
    }
    const nowCollapsed = !expandedShareDays.has(isoDate);
    groupBox.classList.toggle("collapsed", nowCollapsed);
    minBtn.textContent = nowCollapsed ? "+" : "−";
    minBtn.title = nowCollapsed ? "Mở rộng ngày này" : "Thu gọn ngày này";
  };

  header.addEventListener("click", toggleCollapse);

  header.appendChild(leftDiv);
  header.appendChild(actionsDiv);
  groupBox.appendChild(header);

  const body = document.createElement("div");
  body.className = "share-day-body";

  if (dayTasks.length === 0) {
    body.innerHTML = `<div class="share-empty-day"><span>Chưa có nhiệm vụ nào trong ngày ${formatDisplayDate(isoDate)}.</span></div>`;
  } else {
    dayTasks.forEach(task => {
      const realIdx = tasks.indexOf(task);
      body.appendChild(createShareTaskRowElement(task, realIdx, counterEl));
    });
  }

  groupBox.appendChild(body);
  return groupBox;
}

function renderShareTaskSelector() {
  const listEl = document.getElementById("share-task-selector-list");
  const counterEl = document.getElementById("share-selected-counter");
  if (!listEl || !counterEl) return;

  listEl.innerHTML = "";

  Array.from(selectedShareTaskIndices).forEach(idx => {
    if (!tasks[idx]) selectedShareTaskIndices.delete(idx);
  });

  if (currentShareViewFilter === "week") {
    const weekISOList = getUpcoming7DaysISOList();

    weekISOList.forEach((isoDate, i) => {
      const dayName = getVietnameseDayName(isoDate);
      const displayDate = formatDisplayDate(isoDate);
      const tasksOfDay = tasks
        .filter(t => toInputDateStr(t.date) === isoDate)
        .sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));

      const titleLabel = `${i === 0 ? "Hôm nay • " : ""}${dayName} — ${displayDate} (${tasksOfDay.length} nhiệm vụ)`;
      const groupEl = createShareDayAccordionGroup(isoDate, titleLabel, tasksOfDay, true, counterEl);
      listEl.appendChild(groupEl);
    });
  } else {
    if (tasks.length === 0) {
      listEl.innerHTML = `<p class="text-muted">Hiện chưa có nhiệm vụ nào trong lịch. Hãy nhấn "+ Thêm nhiệm vụ" ở góc trên để tạo nhiệm vụ mới!</p>`;
      counterEl.textContent = "Đã chọn: 0 nhiệm vụ";
      return;
    }

    const sorted = getSortedTasks();
    const groupedByDate = {};
    sorted.forEach(t => {
      const iso = toInputDateStr(t.date) || getTodayStr();
      if (!groupedByDate[iso]) groupedByDate[iso] = [];
      groupedByDate[iso].push(t);
    });

    Object.keys(groupedByDate)
      .sort((a, b) => a.localeCompare(b))
      .forEach(isoDate => {
        const dayTasks = groupedByDate[isoDate];
        const dayName = getVietnameseDayName(isoDate);
        const displayDate = formatDisplayDate(isoDate);
        const titleLabel = `${dayName} — ${displayDate} (${dayTasks.length} nhiệm vụ)`;

        const groupEl = createShareDayAccordionGroup(isoDate, titleLabel, dayTasks, true, counterEl);
        listEl.appendChild(groupEl);
      });
  }

  counterEl.textContent = `Đã chọn: ${selectedShareTaskIndices.size} nhiệm vụ`;
}

function renderSharePreviewItems(containerEl, itemsArray) {
  containerEl.innerHTML = "";
  const table = document.createElement("div");
  table.className = "share-preview-table";

  itemsArray.forEach(item => {
    const row = document.createElement("div");
    row.className = "share-preview-item";

    const dateSpan = document.createElement("span");
    dateSpan.className = "share-preview-date";
    dateSpan.textContent = formatDisplayDate(item.date);

    const timeSpan = document.createElement("span");
    timeSpan.className = "share-preview-time";
    timeSpan.textContent = item.time;

    const nameSpan = document.createElement("span");
    nameSpan.className = "share-preview-name";
    nameSpan.textContent = item.name;

    row.appendChild(dateSpan);
    row.appendChild(timeSpan);
    row.appendChild(nameSpan);
    table.appendChild(row);
  });

  containerEl.appendChild(table);
}

function initShareFeature() {
  document.querySelectorAll(".share-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".share-mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.dataset.sharemode;
      document.getElementById("share-pane-export").classList.toggle("hidden", mode !== "export");
      document.getElementById("share-pane-import").classList.toggle("hidden", mode !== "import");
      if (mode === "export") {
        renderShareTaskSelector();
      }
    });
  });

  document.querySelectorAll("[data-sharefilter]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-sharefilter]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentShareViewFilter = btn.dataset.sharefilter;
      renderShareTaskSelector();
    });
  });

  document.getElementById("share-select-week-btn").addEventListener("click", () => {
    const weekSet = new Set(getUpcoming7DaysISOList());
    let count = 0;
    tasks.forEach((t, idx) => {
      if (weekSet.has(toInputDateStr(t.date))) {
        selectedShareTaskIndices.add(idx);
        count++;
      }
    });
    renderShareTaskSelector();
    if (count === 0) {
      showToast("Chưa có nhiệm vụ nào trong 7 ngày tới!", true);
    } else {
      showToast(`Đã chọn ${count} nhiệm vụ trong 7 ngày của tuần!`);
    }
  });

  document.getElementById("share-select-all-btn").addEventListener("click", () => {
    if (tasks.length === 0) {
      showToast("Chưa có nhiệm vụ nào để chọn!", true);
      return;
    }
    tasks.forEach((_, idx) => selectedShareTaskIndices.add(idx));
    renderShareTaskSelector();
  });

  document.getElementById("share-deselect-all-btn").addEventListener("click", () => {
    selectedShareTaskIndices.clear();
    renderShareTaskSelector();
  });

  document.getElementById("generate-share-code-btn").addEventListener("click", async () => {
    if (selectedShareTaskIndices.size === 0) {
      showToast("Vui lòng chọn ít nhất một nhiệm vụ để tạo mã chia sẻ!", true);
      return;
    }

    const chosenTasks = Array.from(selectedShareTaskIndices)
      .map(idx => tasks[idx])
      .filter(Boolean);

    if (chosenTasks.length === 0) {
      showToast("Danh sách nhiệm vụ đã chọn không hợp lệ!", true);
      return;
    }

    const genBtn = document.getElementById("generate-share-code-btn");
    genBtn.disabled = true;
    genBtn.textContent = "Đang tạo mã...";

    try {
      const { code, payload } = await serializeAndCreateShareCode(chosenTasks);
      currentGeneratedShareCode = code;

      const codeOutputEl = document.getElementById("share-code-output");
      codeOutputEl.className = "";
      codeOutputEl.textContent = code;

      document.getElementById("copy-share-code-btn").disabled = false;
      document.getElementById("share-code-status-pill").textContent = `${payload.length} nhiệm vụ`;

      const previewContainer = document.getElementById("share-exported-preview-list");
      renderSharePreviewItems(previewContainer, payload);

      showToast(`Đã tạo mã chia sẻ cho ${payload.length} nhiệm vụ!`);
    } catch {
      showToast("Không thể tạo mã chia sẻ, vui lòng thử lại!", true);
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = "Tạo mã chia sẻ";
    }
  });

  document.getElementById("copy-share-code-btn").addEventListener("click", async () => {
    if (!currentGeneratedShareCode) {
      showToast("Chưa có mã chia sẻ để sao chép!", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(currentGeneratedShareCode);
      showToast("Đã sao chép mã chia sẻ vào bộ nhớ tạm!");
    } catch {
      const tempInput = document.createElement("textarea");
      tempInput.value = currentGeneratedShareCode;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      tempInput.remove();
      showToast("Đã sao chép mã chia sẻ!");
    }
  });

  document.getElementById("import-share-code-form").addEventListener("submit", async e => {
    e.preventDefault();
    const rawCode = document.getElementById("share-code-input").value.trim();

    if (!rawCode) {
      showToast("Vui lòng nhập mã chia sẻ trước khi nhấn Nhập mã!", true);
      document.getElementById("share-code-input").focus();
      return;
    }

    const submitBtn = document.getElementById("decode-share-code-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang kiểm tra...";

    try {
      const result = await decodeAndParseShareCode(rawCode);
      const previewContainer = document.getElementById("import-preview-container");
      const actionsBar = document.getElementById("import-preview-actions");
      const countPill = document.getElementById("import-preview-count-pill");

      if (!result.valid) {
        pendingImportTasks = [];
        countPill.textContent = "0 nhiệm vụ";
        previewContainer.innerHTML = `<p class="text-muted">${result.error}</p>`;
        actionsBar.classList.add("hidden");
        showToast(result.error, true);
        return;
      }

      pendingImportTasks = result.data;
      countPill.textContent = `${pendingImportTasks.length} nhiệm vụ`;
      renderSharePreviewItems(previewContainer, pendingImportTasks);
      actionsBar.classList.remove("hidden");
      showToast(`Đã giải mã thành công ${pendingImportTasks.length} nhiệm vụ!`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Nhập mã";
    }
  });

  document.getElementById("cancel-import-share-btn").addEventListener("click", () => {
    pendingImportTasks = [];
    document.getElementById("share-code-input").value = "";
    document.getElementById("import-preview-count-pill").textContent = "0 nhiệm vụ";
    document.getElementById("import-preview-container").innerHTML =
      `<p class="text-muted">Đã hủy xem trước. Hãy nhập mã chia sẻ hợp lệ ở khung bên trái để hiển thị bản xem trước tại đây.</p>`;
    document.getElementById("import-preview-actions").classList.add("hidden");
    showToast("Đã hủy nhập mã chia sẻ.");
  });

  document.getElementById("confirm-import-share-btn").addEventListener("click", () => {
    if (!Array.isArray(pendingImportTasks) || pendingImportTasks.length === 0) {
      showToast("Không có nhiệm vụ nào để thêm vào lịch!", true);
      return;
    }

    let addedCount = 0;
    let duplicateCount = 0;

    pendingImportTasks.forEach(item => {
      const itemName = String(item.name).trim();
      const itemISO = parseAndValidateDDMMYYYY(formatDisplayDate(item.date));
      const itemTime = String(item.time).trim();

      if (!itemName || !itemISO || !validateTimeHHMM(itemTime)) return;

      const isDuplicate = tasks.some(existing => {
        const existingName = String(existing.name || "").trim();
        const existingISO = toInputDateStr(existing.date);
        const existingTime = String(existing.time || "00:00").trim();
        return existingName === itemName && existingISO === itemISO && existingTime === itemTime;
      });

      if (isDuplicate) {
        duplicateCount++;
      } else {
        tasks.push({
          name: itemName,
          date: itemISO,
          time: itemTime,
          done: false
        });
        addedCount++;
      }
    });

    saveStorage();
    renderAll();

    pendingImportTasks = [];
    document.getElementById("share-code-input").value = "";
    document.getElementById("import-preview-count-pill").textContent = "0 nhiệm vụ";
    document.getElementById("import-preview-container").innerHTML =
      `<p class="text-muted">Đã thêm nhiệm vụ vào lịch! Bạn có thể kiểm tra ngay trong mục Nhiệm vụ hoặc Lịch tuần.</p>`;
    document.getElementById("import-preview-actions").classList.add("hidden");

    if (addedCount > 0 && duplicateCount > 0) {
      showToast(`Đã thêm ${addedCount} nhiệm vụ vào lịch (bỏ qua ${duplicateCount} nhiệm vụ trùng lặp)!`);
    } else if (addedCount > 0) {
      showToast(`Đã thêm thành công ${addedCount} nhiệm vụ vào lịch của bạn!`);
    } else {
      showToast(`Tất cả ${duplicateCount} nhiệm vụ trong mã đều đã có sẵn trong lịch của bạn!`);
    }
  });
}