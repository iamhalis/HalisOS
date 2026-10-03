// =========================================================================
// 5. FOCUS.JS — TÍNH NĂNG FOCUS MODE (ĐỒNG HỒ ĐẾM GIỜ TẬP TRUNG)
// =========================================================================
let focusInterval = null;
let focusStartTime = 0;
let focusPausedTime = 0;
let pauseStartTimestamp = 0;
let isFocusPaused = false;
let isFocusRunning = false;

function renderFocusSelector() {
  const select = document.getElementById("focus-task-select");
  if (!select) return;
  const prevValue = select.value;
  select.innerHTML = "";

  if (tasks.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Chưa có nhiệm vụ nào --";
    select.appendChild(opt);
    updateFocusPreviewName();
    return;
  }

  getSortedTasks().forEach(task => {
    const realIdx = tasks.indexOf(task);
    const opt = document.createElement("option");
    opt.value = String(realIdx);
    opt.textContent = `${task.done ? "[Đã xong]" : "[Chưa xong]"} ${task.name} (${formatDisplayDate(task.date)})`;
    select.appendChild(opt);
  });

  if (prevValue && tasks[Number(prevValue)]) {
    select.value = prevValue;
  }
  updateFocusPreviewName();
}

function updateFocusPreviewName() {
  const select = document.getElementById("focus-task-select");
  const idx = Number(select.value);
  const label = document.getElementById("focus-active-task-name");
  if (select.value !== "" && tasks[idx]) {
    label.textContent = tasks[idx].name;
  } else {
    label.textContent = "Chọn một nhiệm vụ để bắt đầu";
  }
}

function formatHMS(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getFocusElapsedSeconds() {
  if (!isFocusRunning) return 0;
  const now = isFocusPaused ? pauseStartTimestamp : Date.now();
  return Math.max(0, Math.floor((now - focusStartTime - focusPausedTime) / 1000));
}

function tickFocusTimer() {
  const elapsed = getFocusElapsedSeconds();
  document.getElementById("focus-timer-display").textContent = formatHMS(elapsed);

  const hours = Math.floor(elapsed / 3600);
  const ring = document.getElementById("timer-ring");
  ring.classList.remove("warning", "danger");
  if (hours >= 2) ring.classList.add("danger");
  else if (hours >= 1) ring.classList.add("warning");
}

function stopFocusSession(actionType) {
  const elapsed = getFocusElapsedSeconds();
  const timeFormatted = formatHMS(elapsed);
  clearInterval(focusInterval);
  isFocusRunning = false;
  isFocusPaused = false;

  document.getElementById("focus-start-btn").classList.remove("hidden");
  document.getElementById("focus-pause-btn").classList.add("hidden");
  document.getElementById("focus-done-btn").classList.add("hidden");
  document.getElementById("focus-quit-btn").classList.add("hidden");
  document.getElementById("focus-task-select").disabled = false;
  document.getElementById("timer-ring").classList.remove("paused", "warning", "danger");
  document.getElementById("focus-status-badge").textContent = "SẴN SÀNG TẬP TRUNG";
  document.getElementById("focus-timer-display").textContent = "00:00:00";

  const idx = Number(document.getElementById("focus-task-select").value);
  const resultBanner = document.getElementById("focus-result-banner");
  resultBanner.classList.remove("hidden");

  if (actionType === "done" && tasks[idx]) {
    tasks[idx].done = true;
    saveStorage();
    renderAll();
    resultBanner.innerHTML = `<strong>Hoàn thành xuất sắc!</strong><br>Nhiệm vụ: ${tasks[idx].name} • Thời gian tập trung: <strong>${timeFormatted}</strong>`;
    showToast("Đã đánh dấu hoàn thành nhiệm vụ!");
  } else {
    resultBanner.innerHTML = `Đã kết thúc phiên tập trung. Tổng thời gian: <strong>${timeFormatted}</strong>`;
  }
}

function initFocusFeature() {
  document.getElementById("focus-task-select").addEventListener("change", updateFocusPreviewName);

  document.getElementById("focus-start-btn").addEventListener("click", () => {
    if (tasks.length === 0) {
      showToast("Hãy thêm ít nhất 1 nhiệm vụ trước khi bắt đầu Focus!", true);
      return;
    }
    isFocusRunning = true;
    isFocusPaused = false;
    focusStartTime = Date.now();
    focusPausedTime = 0;

    document.getElementById("focus-result-banner").classList.add("hidden");
    document.getElementById("focus-start-btn").classList.add("hidden");
    document.getElementById("focus-pause-btn").classList.remove("hidden");
    document.getElementById("focus-pause-btn").textContent = "Tạm dừng";
    document.getElementById("focus-done-btn").classList.remove("hidden");
    document.getElementById("focus-quit-btn").classList.remove("hidden");
    document.getElementById("focus-task-select").disabled = true;
    document.getElementById("focus-status-badge").textContent = "ĐANG TẬP TRUNG";

    tickFocusTimer();
    focusInterval = setInterval(tickFocusTimer, 250);
  });

  document.getElementById("focus-pause-btn").addEventListener("click", () => {
    if (!isFocusRunning) return;
    isFocusPaused = !isFocusPaused;
    const ring = document.getElementById("timer-ring");
    const badge = document.getElementById("focus-status-badge");
    const btn = document.getElementById("focus-pause-btn");

    if (isFocusPaused) {
      pauseStartTimestamp = Date.now();
      ring.classList.add("paused");
      badge.textContent = "ĐANG TẠM DỪNG";
      btn.textContent = "Tiếp tục";
    } else {
      focusPausedTime += Date.now() - pauseStartTimestamp;
      ring.classList.remove("paused");
      badge.textContent = "ĐANG TẬP TRUNG";
      btn.textContent = "Tạm dừng";
    }
  });

  document.getElementById("focus-done-btn").addEventListener("click", () => stopFocusSession("done"));
  document.getElementById("focus-quit-btn").addEventListener("click", () => stopFocusSession("quit"));
}