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
    if (focusCard) focusCard.classList.remove("is-running");
  } else {
    // Trạng thái đang bấm giờ hoặc tạm dừng
    startBtn.classList.add("hidden");
    pauseBtn.classList.remove("hidden");
    doneBtn.classList.remove("hidden");
    quitBtn.classList.remove("hidden");
    if (focusCard) focusCard.classList.add("is-running");

    pauseBtn.textContent = isFocusPaused ? "Tiếp tục" : "Tạm dừng";
  }
}

function renderFocusSelector() {
  const select = document.getElementById("focus-task-select");
  if (!select) return;

  select.innerHTML = "";
  const pendingTasks = tasks.filter(t => !t.done);

  if (pendingTasks.length === 0) {
    const opt = document.createElement("option");
    opt.value = "-1";
    opt.textContent = "Không có nhiệm vụ nào cần làm";
    select.appendChild(opt);
    return;
  }

  pendingTasks.forEach(t => {
    const originalIndex = tasks.indexOf(t);
    const opt = document.createElement("option");
    opt.value = originalIndex;
    opt.textContent = `${t.name} (${formatDisplayDate(t.date)} - ${t.time})`;
    select.appendChild(opt);
  });
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