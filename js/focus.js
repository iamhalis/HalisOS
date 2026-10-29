// ==========================================================================
// STUDY OS — FOCUS MODE CONTROLLER (CHUẨN HÓA MỐC THỜI GIAN THỰC DATE.NOW)
// ==========================================================================

let focusTimerInterval = null;
let focusStartTime = null;          // Mốc thời gian thực bắt đầu bấm giờ
let focusElapsedBeforePause = 0;   // Tổng số mili-giây đã trôi qua trước khi tạm dừng
let isFocusRunning = false;
let isFocusPaused = false;
let currentFocusTaskIndex = -1;

function formatFocusTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateFocusTimerDisplay() {
  const displayEl = document.getElementById("focus-timer-display");
  if (!displayEl) return;

  if (!isFocusRunning && !isFocusPaused) {
    displayEl.textContent = "00:00";
    return;
  }

  let totalElapsedMs = focusElapsedBeforePause;
  if (isFocusRunning && !isFocusPaused && focusStartTime) {
    // Tính khoảng chênh lệch theo mili-giây thực tế của hệ thống
    totalElapsedMs += (Date.now() - focusStartTime);
  }

  const totalSeconds = Math.floor(totalElapsedMs / 1000);
  displayEl.textContent = formatFocusTime(totalSeconds);
}

function stopFocusInterval() {
  if (focusTimerInterval) {
    clearInterval(focusTimerInterval);
    focusTimerInterval = null;
  }
}

function startFocusTimer() {
  // 1. Luôn xóa triệt để interval cũ trước khi tạo interval mới để tránh lặp tốc độ
  stopFocusInterval();

  isFocusRunning = true;
  isFocusPaused = false;
  focusStartTime = Date.now();

  // 2. Chạy cập nhật giao diện mỗi 250ms để bắt chuẩn nhịp 1 giây của đồng hồ thực
  updateFocusTimerDisplay();
  focusTimerInterval = setInterval(() => {
    updateFocusTimerDisplay();
  }, 250);

  updateFocusControlsUI();
}

function pauseFocusTimer() {
  if (!isFocusRunning || isFocusPaused) return;

  // Lưu lại chính xác mili-giây đã trôi qua trước khi ngắt nhịp
  if (focusStartTime) {
    focusElapsedBeforePause += (Date.now() - focusStartTime);
    focusStartTime = null;
  }

  stopFocusInterval();
  isFocusPaused = true;
  updateFocusTimerDisplay();
  updateFocusControlsUI();
}

function resumeFocusTimer() {
  if (!isFocusRunning || !isFocusPaused) return;
  startFocusTimer();
}

function resetFocusState() {
  stopFocusInterval();
  focusStartTime = null;
  focusElapsedBeforePause = 0;
  isFocusRunning = false;
  isFocusPaused = false;
  currentFocusTaskIndex = -1;

  const taskNameEl = document.getElementById("focus-active-task-name");
  if (taskNameEl) {
    taskNameEl.textContent = "";
    taskNameEl.classList.add("hidden");
  }

  updateFocusTimerDisplay();
  updateFocusControlsUI();
}

function updateFocusControlsUI() {
  const startBtn = document.getElementById("focus-start-btn");
  const pauseBtn = document.getElementById("focus-pause-btn");
  const doneBtn = document.getElementById("focus-done-btn");
  const quitBtn = document.getElementById("focus-quit-btn");
  const focusCard = document.getElementById("focus-card");

  if (!startBtn || !pauseBtn || !doneBtn || !quitBtn) return;

  if (!isFocusRunning && !isFocusPaused) {
    // Trạng thái chưa bắt đầu
    startBtn.classList.remove("hidden");
    pauseBtn.classList.add("hidden");
    doneBtn.classList.add("hidden");
    quitBtn.classList.add("hidden");
    if (focusCard) {
      focusCard.classList.remove("is-running");
      focusCard.classList.remove("is-paused");
    }
  } else {
    // Trạng thái đang bấm giờ hoặc tạm dừng
    startBtn.classList.add("hidden");
    pauseBtn.classList.remove("hidden");
    doneBtn.classList.remove("hidden");
    quitBtn.classList.remove("hidden");
    if (focusCard) {
      focusCard.classList.add("is-running");
      focusCard.classList.toggle("is-paused", isFocusPaused);
    }

    pauseBtn.textContent = isFocusPaused ? "Tiếp tục" : "Tạm dừng";
  }
}

function renderFocusSelector(selectedTaskIndex) {
  const select = document.getElementById("focus-task-select");
  if (!select) return;

  const previousValue = selectedTaskIndex !== undefined && selectedTaskIndex !== null
    ? String(selectedTaskIndex)
    : select.value;

  select.innerHTML = "";
  const pendingTasks = tasks.filter(t => !t.done);

  if (pendingTasks.length === 0) {
    const opt = document.createElement("option");
    opt.value = "-1";
    opt.textContent = "Không có nhiệm vụ nào cần làm";
    select.appendChild(opt);
    return;
  }

  let matched = false;
  pendingTasks.forEach(t => {
    const originalIndex = tasks.indexOf(t);
    const opt = document.createElement("option");
    opt.value = originalIndex;
    opt.textContent = `${t.name} (${formatDisplayDate(t.date)} - ${t.time})`;
    if (String(originalIndex) === previousValue) {
      opt.selected = true;
      matched = true;
    }
    select.appendChild(opt);
  });

  if (matched) {
    select.value = previousValue;
  }
}

function selectFocusTask(taskOrIndex) {
  let realIdx = -1;
  if (typeof taskOrIndex === "object" && taskOrIndex !== null) {
    realIdx = tasks.indexOf(taskOrIndex);
  } else {
    realIdx = parseInt(taskOrIndex, 10);
  }

  if (isNaN(realIdx) || realIdx < 0 || !tasks[realIdx]) {
    showToast("Nhiệm vụ không tồn tại!", true);
    return;
  }

  // Nếu đang đếm giờ cho đúng nhiệm vụ này, chỉ cần chuyển tab
  if (isFocusRunning && currentFocusTaskIndex === realIdx) {
    if (typeof switchTab === "function") {
      switchTab("focus");
    }
    return;
  }

  // Nếu đang đếm giờ hoặc tạm dừng cho nhiệm vụ khác, reset timer
  if (isFocusRunning || isFocusPaused) {
    resetFocusState();
  }

  // Nếu nhiệm vụ đang ở trạng thái đã hoàn thành, tự động mở lại
  if (tasks[realIdx].done) {
    tasks[realIdx].done = false;
    saveStorage();
    renderAll();
    showToast(`Đã mở lại và chọn nhiệm vụ: "${tasks[realIdx].name}"`);
  }

  // Dựng lại selector và chọn nhiệm vụ này
  renderFocusSelector(realIdx);

  const select = document.getElementById("focus-task-select");
  if (select) {
    select.value = String(realIdx);
    const targetOptIndex = Array.from(select.options).findIndex(opt => opt.value === String(realIdx));
    if (targetOptIndex !== -1) {
      select.selectedIndex = targetOptIndex;
    }
    select.dispatchEvent(new Event("change"));
  }

  // Chuyển sang tab Focus Mode
  if (typeof switchTab === "function") {
    switchTab("focus");
  }

  // Đồng bộ giao diện dropdown tuỳ chỉnh
  if (typeof syncCustomFocusDropdown === "function") {
    syncCustomFocusDropdown();
  }
}

function updateFocusPreviewName() {
  if (typeof syncCustomFocusDropdown === "function") {
    syncCustomFocusDropdown();
  }
}

function initFocusFeature() {
  const startBtn = document.getElementById("focus-start-btn");
  const pauseBtn = document.getElementById("focus-pause-btn");
  const doneBtn = document.getElementById("focus-done-btn");
  const quitBtn = document.getElementById("focus-quit-btn");
  const select = document.getElementById("focus-task-select");

  if (startBtn) {
    startBtn.onclick = () => {
      const selectedIndex = parseInt(select.value, 10);
      if (isNaN(selectedIndex) || selectedIndex < 0 || !tasks[selectedIndex]) {
        showToast("Vui lòng chọn một nhiệm vụ hợp lệ để bắt đầu!", true);
        return;
      }

      currentFocusTaskIndex = selectedIndex;
      focusElapsedBeforePause = 0;

      const taskNameEl = document.getElementById("focus-active-task-name");
      if (taskNameEl && tasks[selectedIndex]) {
        taskNameEl.textContent = tasks[selectedIndex].name;
        taskNameEl.classList.remove("hidden");
      }

      startFocusTimer();
    };
  }

  if (pauseBtn) {
    pauseBtn.onclick = () => {
      if (isFocusPaused) {
        resumeFocusTimer();
      } else {
        pauseFocusTimer();
      }
    };
  }

  if (doneBtn) {
    doneBtn.onclick = () => {
      if (currentFocusTaskIndex >= 0 && tasks[currentFocusTaskIndex]) {
        tasks[currentFocusTaskIndex].done = true;
        saveStorage();
        renderAll();
        showToast(`🎉 Đã hoàn thành nhiệm vụ: ${tasks[currentFocusTaskIndex].name}!`);
      }
      resetFocusState();
    };
  }

  if (quitBtn) {
    quitBtn.onclick = () => {
      resetFocusState();
      showToast("Đã dừng phiên tập trung.");
    };
  }

  renderFocusSelector();
  updateFocusTimerDisplay();
  updateFocusControlsUI();
}

if (typeof window !== "undefined") {
  window.selectFocusTask = selectFocusTask;
  window.updateFocusPreviewName = updateFocusPreviewName;
}
