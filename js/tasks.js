// =========================================================================
// 3. TASKS.JS — TÍNH NĂNG QUẢN LÝ NHIỆM VỤ (THÊM, SỬA, XOÁ, BỘ LỌC)
// =========================================================================
let currentFilter = "all";
let searchQuery = "";
let currentPage = 1;

function renderQuickWeekdayPicker() {
  const bar = document.getElementById("quick-weekday-picker");
  if (!bar) return;
  bar.innerHTML = `<span class="quick-weekday-label">Chọn nhanh ngày trong tuần:</span>`;

  const weekISOList = getUpcoming7DaysISOList();
  const currentSelectedISO = document.getElementById("task-date-input").value || getTodayStr();

  weekISOList.forEach((iso, idx) => {
    const dayName = getVietnameseDayName(iso);
    const shortDisplay = formatDisplayDate(iso).slice(0, 5);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `weekday-chip ${currentSelectedISO === iso ? "active" : ""}`;
    btn.textContent = idx === 0 ? `Hôm nay (${shortDisplay})` : `${dayName} (${shortDisplay})`;
    btn.addEventListener("click", () => {
      document.getElementById("task-date-input").value = iso;
      document.getElementById("task-date-display").value = formatDisplayDate(iso);
      renderQuickWeekdayPicker();
    });
    bar.appendChild(btn);
  });
}

function createTaskRowElement(task, realIdx) {
  const row = document.createElement("div");
  row.className = `task-item ${task.done ? "done" : ""}`;

  const left = document.createElement("div");
  left.className = "task-left";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.done;
  checkbox.addEventListener("change", () => {
    tasks[realIdx].done = checkbox.checked;
    saveStorage();
    renderAll();
    showToast(checkbox.checked ? `Đã hoàn thành: ${task.name}` : `Đã mở lại: ${task.name}`);
  });

  const info = document.createElement("div");
  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = task.name;

  const meta = document.createElement("div");
  meta.className = "task-meta";
  meta.textContent = `Ngày: ${formatDisplayDate(task.date)} • Giờ: ${task.time}`;

  info.appendChild(title);
  info.appendChild(meta);
  left.appendChild(checkbox);
  left.appendChild(info);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const focusBtn = document.createElement("button");
  focusBtn.className = "action-chip";
  focusBtn.textContent = "Focus";
  focusBtn.addEventListener("click", () => {
    switchTab("focus");
    document.getElementById("focus-task-select").value = String(realIdx);
    updateFocusPreviewName();
  });

  const editBtn = document.createElement("button");
  editBtn.className = "action-chip";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", () => startEditTask(realIdx));

  const delBtn = document.createElement("button");
  delBtn.className = "action-chip delete";
  delBtn.textContent = "Xoá";
  delBtn.addEventListener("click", () => {
    if (confirm(`Xoá nhiệm vụ "${task.name}"?`)) {
      tasks.splice(realIdx, 1);
      if (typeof selectedShareTaskIndices !== "undefined") selectedShareTaskIndices.clear();
      saveStorage();
      renderAll();
      showToast("Đã xoá nhiệm vụ.");
    }
  });

  actions.appendChild(focusBtn);
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  row.appendChild(left);
  row.appendChild(actions);
  return row;
}

function renderTasksTab() {
  const listEl = document.getElementById("main-task-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const filtered = getSortedTasks().filter(t => {
    if (currentFilter === "pending" && t.done) return false;
    if (currentFilter === "done" && !t.done) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  if (pageItems.length === 0) {
    listEl.innerHTML = `<p class="text-muted">Không tìm thấy nhiệm vụ nào phù hợp.</p>`;
  } else {
    pageItems.forEach(task => {
      const realIdx = tasks.indexOf(task);
      listEl.appendChild(createTaskRowElement(task, realIdx));
    });
  }

  document.getElementById("page-indicator").textContent = `Trang ${currentPage} / ${totalPages}`;
  document.getElementById("prev-page-btn").disabled = currentPage <= 1;
  document.getElementById("next-page-btn").disabled = currentPage >= totalPages;
}

function startEditTask(realIdx) {
  switchTab("tasks");
  const task = tasks[realIdx];
  const isoDate = toInputDateStr(task.date) || getTodayStr();
  document.getElementById("edit-task-index").value = realIdx;
  document.getElementById("task-name-input").value = task.name;
  document.getElementById("task-date-input").value = isoDate;
  document.getElementById("task-date-display").value = formatDisplayDate(isoDate);
  document.getElementById("task-time-input").value = task.time;
  document.getElementById("task-form-title").textContent = "Chỉnh sửa nhiệm vụ";
  document.getElementById("save-task-btn").textContent = "Cập nhật";
  document.getElementById("cancel-edit-btn").classList.remove("hidden");
  renderQuickWeekdayPicker();
  document.getElementById("task-name-input").focus();
}

function resetTaskForm() {
  const todayISO = getTodayStr();
  document.getElementById("edit-task-index").value = "-1";
  document.getElementById("task-name-input").value = "";
  document.getElementById("task-date-input").value = todayISO;
  document.getElementById("task-date-display").value = formatDisplayDate(todayISO);
  document.getElementById("task-time-input").value = getCurrentTimeStr();
  document.getElementById("task-form-title").textContent = "Thêm nhiệm vụ mới";
  document.getElementById("save-task-btn").textContent = "Lưu nhiệm vụ";
  document.getElementById("cancel-edit-btn").classList.add("hidden");
  renderQuickWeekdayPicker();
}

function initTasksFeature() {
  bindCustomDateInput("task-date-display", "task-date-input", "task-date-trigger", () => {
    renderQuickWeekdayPicker();
  });

  document.getElementById("task-form").addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("task-name-input").value.trim();
    const rawDateDisplay = document.getElementById("task-date-display").value.trim();
    const validatedDateISO = parseAndValidateDDMMYYYY(rawDateDisplay);
    const time = document.getElementById("task-time-input").value || getCurrentTimeStr();
    const editIdx = parseInt(document.getElementById("edit-task-index").value, 10);

    if (!name) return;
    if (!validatedDateISO) {
      showToast("Ngày thực hiện không hợp lệ! Vui lòng nhập đúng DD-MM-YYYY (VD: 05-10-2026).", true);
      document.getElementById("task-date-display").focus();
      return;
    }

    if (editIdx >= 0 && tasks[editIdx]) {
      tasks[editIdx].name = name;
      tasks[editIdx].date = validatedDateISO;
      tasks[editIdx].time = time;
      showToast(`Đã cập nhật nhiệm vụ sang ngày ${formatDisplayDate(validatedDateISO)}!`);
    } else {
      tasks.push({ name, done: false, date: validatedDateISO, time });
      showToast(`Đã thêm "${name}" vào ngày ${formatDisplayDate(validatedDateISO)}!`);
    }

    saveStorage();
    resetTaskForm();
    renderAll();
  });

  document.getElementById("cancel-edit-btn").addEventListener("click", resetTaskForm);

  document.querySelectorAll("#tab-tasks .filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#tab-tasks .filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      currentPage = 1;
      renderTasksTab();
    });
  });

  document.getElementById("task-search").addEventListener("input", e => {
    searchQuery = e.target.value;
    currentPage = 1;
    renderTasksTab();
  });

  document.getElementById("prev-page-btn").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTasksTab();
    }
  });

  document.getElementById("next-page-btn").addEventListener("click", () => {
    currentPage++;
    renderTasksTab();
  });
}