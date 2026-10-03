// =========================================================================
// 2. DASHBOARD.JS — TÍNH NĂNG TAB TỔNG QUAN (THỐNG KÊ NHANH & MỤC TIÊU AIM)
// =========================================================================
function getTaskStats() {
  const now = new Date();
  const todayStr = getTodayStr();

  const dayOfWeek = (now.getDay() + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let doneToday = 0, doneWeek = 0, doneMonth = 0, doneTotal = 0;

  tasks.forEach(task => {
    if (!task.done) return;
    doneTotal++;
    const tDateKey = toInputDateStr(task.date);
    if (tDateKey === todayStr) doneToday++;
    const taskDate = new Date(tDateKey + "T00:00:00");
    if (!isNaN(taskDate)) {
      if (taskDate >= weekStart) doneWeek++;
      if (taskDate >= monthStart) doneMonth++;
    }
  });

  return { doneToday, doneWeek, doneMonth, doneTotal };
}

function renderDashboardUpcoming() {
  const container = document.getElementById("dashboard-upcoming-list");
  if (!container) return;
  container.innerHTML = "";
  const upcoming = getSortedTasks().filter(t => !t.done).slice(0, 5);

  if (upcoming.length === 0) {
    container.innerHTML = `<p class="text-muted">Tuyệt vời! Hiện không có nhiệm vụ nào tồn đọng.</p>`;
    return;
  }

  upcoming.forEach(task => {
    const realIdx = tasks.indexOf(task);
    container.appendChild(createTaskRowElement(task, realIdx));
  });
}

function initDashboardFeature() {
  const quickAimForm = document.getElementById("quick-aim-form");
  if (!quickAimForm) return;

  quickAimForm.addEventListener("submit", e => {
    e.preventDefault();
    const w = parseInt(document.getElementById("quick-aim-week").value, 10);
    const m = parseInt(document.getElementById("quick-aim-month").value, 10);
    if (w > 0 && m > 0) {
      config.aim_week = w;
      config.aim_month = m;
      saveStorage();
      renderAll();
      showToast("Đã cập nhật mục tiêu tuần và tháng!");
    }
  });
}