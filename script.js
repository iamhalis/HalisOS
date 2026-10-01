// =========================================================================
// CẤU HÌNH ĐỒNG BỘ ĐÁM MÂY (FIREBASE REALTIME DATABASE)
// Dán link Realtime Database của bạn vào giữa 2 dấu ngoặc kép bên dưới:
// =========================================================================
const CLOUD_DB_URL = "https://halisos-default-rtdb.asia-southeast1.firebasedatabase.app/";

// ---------- Danh ngôn truyền cảm hứng ----------
const QUOTES = [
  "'Hãy sống như thể ngày mai bạn sẽ chết. Hãy học như thể bạn sẽ sống mãi mãi.' — Mahatma Gandhi",
  "'Thành công không phải là cuối cùng, thất bại không phải là tận cùng: điều quan trọng là lòng can đảm để tiếp tục.' — Winston Churchill",
  "'Mọi thứ luôn có vẻ bất khả thi cho đến khi nó được hoàn thành.' — Nelson Mandela",
  "'Vinh quang lớn nhất của chúng ta không phải là không bao giờ ngã, mà là luôn đứng dậy sau mỗi lần vấp ngã.' — Khổng Tử",
  "'Cách duy nhất để làm nên những điều vĩ đại là yêu điều mình làm.' — Steve Jobs",
  "'Hãy tin rằng bạn có thể, và bạn đã đi được nửa chặng đường.' — Theodore Roosevelt",
  "'Giáo dục là vũ khí mạnh nhất mà bạn có thể dùng để thay đổi thế giới.' — Nelson Mandela",
  "'Đầu tư vào tri thức luôn mang lại lợi nhuận cao nhất.' — Benjamin Franklin",
  "'Điều quan trọng là đừng bao giờ ngừng đặt câu hỏi.' — Albert Einstein",
  "'Người chưa từng mắc sai lầm là người chưa từng thử điều gì mới.' — Albert Einstein",
  "'Thành công thường đến với những người quá bận rộn để đi tìm nó.' — Henry David Thoreau",
  "'Hãy làm những gì bạn có thể, với những gì bạn có, ở nơi bạn đang đứng.' — Theodore Roosevelt",
  "'Chất lượng không phải là một hành động, mà là một thói quen.' — Aristotle",
  "'Bí quyết để tiến lên phía trước là bắt đầu.' — Mark Twain",
  "'Bạn sẽ bỏ lỡ 100% cơ hội nếu không dám thử.' — Wayne Gretzky",
  "'Tôi càng làm việc chăm chỉ, tôi càng gặp nhiều may mắn.' — Samuel Goldwyn",
  "'Chiến thắng bản thân là chiến thắng vĩ đại nhất.' — Khổng Tử",
  "'Tôi không thất bại. Tôi chỉ tìm ra 10.000 cách không hiệu quả.' — Thomas Edison",
  "'Tương lai thuộc về những người tin vào vẻ đẹp của ước mơ.' — Eleanor Roosevelt",
  "'Thiên tài là 1% cảm hứng và 99% mồ hôi.' — Thomas Edison"
];

const DEFAULT_CONFIG = {
  title: "Study OS",
  target_date: "2027-06-01",
  aim_week: 20,
  aim_month: 80
};

const ITEMS_PER_PAGE = 6;

// ---------- Quản lý Tài khoản & Lưu trữ ----------
let users = loadJSON("studyos_users", {});
let currentUser = localStorage.getItem("studyos_current_user") || null;

let config = { ...DEFAULT_CONFIG };
let tasks = [];
let futureMails = [];

let currentFilter = "all";
let searchQuery = "";
let currentPage = 1;

// Biến Focus Session
let focusInterval = null;
let focusStartTime = 0;
let focusPausedTime = 0;
let pauseStartTimestamp = 0;
let isFocusPaused = false;
let isFocusRunning = false;

function isCloudEnabled() {
  return (
    CLOUD_DB_URL &&
    CLOUD_DB_URL.startsWith("https://") &&
    !CLOUD_DB_URL.includes("DAN-LINK-FIREBASE")
  );
}

function getCloudEndpoint(username) {
  const base = CLOUD_DB_URL.replace(/\/+$/, "");
  return `${base}/studyos_accounts/${encodeURIComponent(username)}.json`;
}

async function fetchAccountFromCloud(username) {
  if (!isCloudEnabled()) return null;
  try {
    const res = await fetch(getCloudEndpoint(username));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function syncToCloud() {
  if (!currentUser || !users[currentUser] || !isCloudEnabled()) return;
  const payload = {
    profile: users[currentUser],
    config,
    tasks,
    futureMails,
    updatedAt: Date.now()
  };
  try {
    await fetch(getCloudEndpoint(currentUser), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    // Nếu mất mạng vẫn giữ nguyên trong localStorage
  }
}

async function pullCurrentUserFromCloud() {
  if (!currentUser || !isCloudEnabled()) return;
  const remoteData = await fetchAccountFromCloud(currentUser);
  if (remoteData && remoteData.profile) {
    users[currentUser] = remoteData.profile;
    config = { ...DEFAULT_CONFIG, ...(remoteData.config || {}) };
    tasks = Array.isArray(remoteData.tasks) ? remoteData.tasks : [];
    futureMails = Array.isArray(remoteData.futureMails) ? remoteData.futureMails : [];
    saveUsersDB();
    saveLocalOnly();
    renderAll();
  }
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getStorageKeys() {
  if (currentUser && users[currentUser]) {
    return {
      configKey: `studyos_config_${currentUser}`,
      tasksKey: `studyos_tasks_${currentUser}`,
      mailsKey: `studyos_mails_${currentUser}`
    };
  }
  return {
    configKey: "studyos_config",
    tasksKey: "studyos_tasks",
    mailsKey: "studyos_mails_guest"
  };
}

function loadActiveUserData() {
  const { configKey, tasksKey, mailsKey } = getStorageKeys();
  config = loadJSON(configKey, { ...DEFAULT_CONFIG });
  tasks = loadJSON(tasksKey, []);
  futureMails = loadJSON(mailsKey, []);
  migrateTasks();
}

function saveLocalOnly() {
  const { configKey, tasksKey, mailsKey } = getStorageKeys();
  localStorage.setItem(configKey, JSON.stringify(config));
  localStorage.setItem(tasksKey, JSON.stringify(tasks));
  localStorage.setItem(mailsKey, JSON.stringify(futureMails));
}

function saveStorage() {
  saveLocalOnly();
  syncToCloud();
}

function saveUsersDB() {
  localStorage.setItem("studyos_users", JSON.stringify(users));
}

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCurrentTimeStr() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function migrateTasks() {
  const today = getTodayStr();
  let migrated = false;
  tasks.forEach(t => {
    if (!t.date) { t.date = today; migrated = true; }
    if (!t.time) { t.time = "00:00"; migrated = true; }
    if (typeof t.done !== "boolean") { t.done = Boolean(t.done); migrated = true; }
  });
  if (migrated) saveLocalOnly();
}

// ---------- Tiện ích hiển thị ----------
function showToast(msg) {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function updateClockAndHeader() {
  const now = new Date();
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dateFormatted = `${days[now.getDay()]} • ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  const timeFormatted = now.toTimeString().split(" ")[0];

  document.getElementById("current-date-display").textContent = dateFormatted;
  document.getElementById("live-clock").textContent = timeFormatted;
}

function calculateDaysLeft() {
  const target = new Date(config.target_date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((target - today) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : 0;
}

function refreshQuote() {
  const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById("quote-text").textContent = randomQuote;
}

// ---------- Thống kê & Render Giao diện ----------
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
    if (task.date === todayStr) doneToday++;
    const taskDate = new Date(task.date + "T00:00:00");
    if (!isNaN(taskDate)) {
      if (taskDate >= weekStart) doneWeek++;
      if (taskDate >= monthStart) doneMonth++;
    }
  });

  return { doneToday, doneWeek, doneMonth, doneTotal };
}

function getSortedTasks() {
  return [...tasks].sort((a, b) => {
    const cmpDate = (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99");
    if (cmpDate !== 0) return cmpDate;
    return (a.time || "99:99").localeCompare(b.time || "99:99");
  });
}

function renderAll() {
  document.getElementById("app-title").textContent = config.title;
  document.title = `${config.title} — Web Dashboard`;
  document.getElementById("days-left-display").textContent = `${calculateDaysLeft()} ngày`;
  document.getElementById("target-date-display").textContent = `Mục tiêu: ${config.target_date}`;

  const pendingCount = tasks.filter(t => !t.done).length;
  document.getElementById("pending-badge").textContent = pendingCount;

  const { doneToday, doneWeek, doneMonth, doneTotal } = getTaskStats();
  const aimWeek = Number(config.aim_week) || 20;
  const aimMonth = Number(config.aim_month) || 80;
  const weekPct = Math.min(100, Math.round((doneWeek / aimWeek) * 100));
  const monthPct = Math.min(100, Math.round((doneMonth / aimMonth) * 100));

  document.getElementById("stat-today").textContent = doneToday;
  document.getElementById("stat-week-done").textContent = doneWeek;
  document.getElementById("stat-week-aim").textContent = aimWeek;
  document.getElementById("stat-week-pct").textContent = `${weekPct}%`;
  document.getElementById("progress-week").style.width = `${weekPct}%`;

  document.getElementById("stat-month-done").textContent = doneMonth;
  document.getElementById("stat-month-aim").textContent = aimMonth;
  document.getElementById("stat-month-pct").textContent = `${monthPct}%`;
  document.getElementById("progress-month").style.width = `${monthPct}%`;

  document.getElementById("stat-total").textContent = doneTotal;

  document.getElementById("quick-aim-week").value = aimWeek;
  document.getElementById("quick-aim-month").value = aimMonth;
  document.getElementById("setting-title").value = config.title;
  document.getElementById("setting-target-date").value = config.target_date;
  document.getElementById("setting-aim-week").value = aimWeek;
  document.getElementById("setting-aim-month").value = aimMonth;

  renderProfileUI();
  renderDashboardUpcoming();
  renderTasksTab();
  renderWeeklyCalendar();
  renderFocusSelector();
}

// ---------- Render Hồ sơ & Future Mail ----------
function renderProfileUI() {
  const sidebarAvatar = document.getElementById("sidebar-avatar");
  const sidebarUsername = document.getElementById("sidebar-username");
  const sidebarEmail = document.getElementById("sidebar-user-email");
  const topProfileBtn = document.getElementById("top-profile-btn");
  const guestView = document.getElementById("auth-guest-view");
  const userView = document.getElementById("auth-user-view");
  const activeAccountLabel = document.getElementById("settings-active-account");

  if (currentUser && users[currentUser]) {
    const u = users[currentUser];
    const initial = u.username.charAt(0).toUpperCase();
    const syncTag = isCloudEnabled() ? "☁️ Đã đồng bộ" : "Lưu nội bộ";
    sidebarAvatar.textContent = initial;
    sidebarUsername.textContent = u.username;
    sidebarEmail.textContent = u.email ? `${u.email} • ${syncTag}` : syncTag;
    topProfileBtn.textContent = `@${u.username}`;
    activeAccountLabel.textContent = u.username;

    guestView.classList.add("hidden");
    userView.classList.remove("hidden");

    document.getElementById("profile-big-avatar").textContent = initial;
    document.getElementById("profile-display-username").textContent = `@${u.username}`;
    document.getElementById("profile-display-email").textContent = u.email
      ? `Email: ${u.email} (${syncTag})`
      : `Chưa có email (${syncTag})`;
    document.getElementById("profile-edit-email").value = u.email || "";
    document.getElementById("profile-edit-password").value = "";

    renderFutureMailList();
  } else {
    sidebarAvatar.textContent = "G";
    sidebarUsername.textContent = "Khách (Guest)";
    sidebarEmail.textContent = "Nhấn để đăng nhập";
    topProfileBtn.textContent = "Đăng nhập";
    activeAccountLabel.textContent = "Khách (Guest)";

    guestView.classList.remove("hidden");
    userView.classList.add("hidden");
  }
}

function renderFutureMailList() {
  const listEl = document.getElementById("future-mail-list");
  listEl.innerHTML = "";

  if (futureMails.length === 0) {
    listEl.innerHTML = `<p class="text-muted">Chưa có bức thư tương lai nào được tạo.</p>`;
    return;
  }

  const todayStr = getTodayStr();

  futureMails.forEach((mail, idx) => {
    const isUnlocked = todayStr >= mail.targetDate;
    const item = document.createElement("div");
    item.className = "task-item";

    const left = document.createElement("div");
    left.innerHTML = `
      <div class="task-title">${isUnlocked ? "🔓" : "🔒"} ${mail.subject}</div>
      <div class="task-meta">Ngày mở khóa: ${mail.targetDate} • Gửi tới: ${mail.email || "Lưu nội bộ"}</div>
    `;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const readBtn = document.createElement("button");
    readBtn.className = "action-chip";
    readBtn.textContent = isUnlocked ? "Đọc thư" : "Xem trước";
    readBtn.addEventListener("click", () => {
      if (!isUnlocked && !confirm(`Bức thư này hẹn mở vào ngày ${mail.targetDate}. Bạn vẫn muốn mở sớm chứ?`)) {
        return;
      }
      alert(`✉️ TIÊU ĐỀ: ${mail.subject}\n📅 Ngày hẹn: ${mail.targetDate}\n\n${mail.message}`);
    });

    const sendMailClientBtn = document.createElement("button");
    sendMailClientBtn.className = "action-chip";
    sendMailClientBtn.textContent = "Mở Gmail";
    sendMailClientBtn.addEventListener("click", () => {
      const targetEmail = mail.email || (users[currentUser] && users[currentUser].email) || "";
      if (!targetEmail) {
        showToast("Bạn chưa nhập Email trong hồ sơ!");
        return;
      }
      const subject = encodeURIComponent(`[Study OS - Thư tương lai ${mail.targetDate}] ${mail.subject}`);
      const body = encodeURIComponent(`Ngày hẹn mở thư: ${mail.targetDate}\n\nNội dung:\n${mail.message}`);
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&su=${subject}&body=${body}`, "_blank");
    });

    const delBtn = document.createElement("button");
    delBtn.className = "action-chip delete";
    delBtn.textContent = "Xoá";
    delBtn.addEventListener("click", () => {
      futureMails.splice(idx, 1);
      saveStorage();
      renderFutureMailList();
      showToast("Đã xoá bức thư.");
    });

    actions.appendChild(readBtn);
    actions.appendChild(sendMailClientBtn);
    actions.appendChild(delBtn);

    item.appendChild(left);
    item.appendChild(actions);
    listEl.appendChild(item);
  });
}

// ---------- Render Nhiệm vụ ----------
function renderDashboardUpcoming() {
  const container = document.getElementById("dashboard-upcoming-list");
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
  meta.textContent = `Ngày: ${task.date} • Giờ: ${task.time}`;

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
  document.getElementById("edit-task-index").value = realIdx;
  document.getElementById("task-name-input").value = task.name;
  document.getElementById("task-date-input").value = task.date;
  document.getElementById("task-time-input").value = task.time;
  document.getElementById("task-form-title").textContent = "Chỉnh sửa nhiệm vụ";
  document.getElementById("save-task-btn").textContent = "Cập nhật";
  document.getElementById("cancel-edit-btn").classList.remove("hidden");
  document.getElementById("task-name-input").focus();
}

function resetTaskForm() {
  document.getElementById("edit-task-index").value = "-1";
  document.getElementById("task-name-input").value = "";
  document.getElementById("task-date-input").value = getTodayStr();
  document.getElementById("task-time-input").value = getCurrentTimeStr();
  document.getElementById("task-form-title").textContent = "Thêm nhiệm vụ mới";
  document.getElementById("save-task-btn").textContent = "Lưu nhiệm vụ";
  document.getElementById("cancel-edit-btn").classList.add("hidden");
}

// ---------- Lịch tuần 7 ngày ----------
function renderWeeklyCalendar() {
  const grid = document.getElementById("weekly-calendar-grid");
  grid.innerHTML = "";
  const dayNames = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateKey = `${y}-${m}-${day}`;
    const displayDate = `${day}/${m}/${y}`;

    const dayTasks = tasks
      .filter(t => t.date === dateKey)
      .sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));

    const card = document.createElement("div");
    card.className = `day-card ${i === 0 ? "today" : ""}`;

    const header = document.createElement("div");
    header.className = "day-header";
    header.innerHTML = `<span class="day-name">${dayNames[d.getDay()]}</span><span class="day-date">${displayDate}</span>`;
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "day-tasks";

    if (dayTasks.length === 0) {
      body.innerHTML = `<p class="text-muted">Không có task nào.<br><small>Trống (Nghỉ ngơi)</small></p>`;
    } else {
      dayTasks.forEach(t => {
        const item = document.createElement("div");
        item.className = `cal-task ${t.done ? "done" : ""}`;
        item.innerHTML = `<span>${t.done ? "✓" : "○"} ${t.name}</span><span class="cal-time">${t.time}</span>`;
        body.appendChild(item);
      });
    }

    card.appendChild(body);
    grid.appendChild(card);
  }
}

// ---------- Focus Mode ----------
function renderFocusSelector() {
  const select = document.getElementById("focus-task-select");
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
    opt.textContent = `${task.done ? "[Đã xong]" : "[Chưa xong]"} ${task.name} (${task.date})`;
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

function switchTab(tabId) {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.toggle("active", pane.id === `tab-${tabId}`);
  });
}

function downloadJSON(filename, dataObj) {
  const blob = new Blob([JSON.stringify(dataObj, null, 4)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Sự kiện DOM ----------
document.addEventListener("DOMContentLoaded", () => {
  loadActiveUserData();
  resetTaskForm();
  refreshQuote();
  updateClockAndHeader();
  setInterval(updateClockAndHeader, 1000);
  renderAll();

  // Tự động kéo dữ liệu mới nhất từ Cloud khi mở trang
  pullCurrentUserFromCloud();

  // Tự động làm mới dữ liệu khi chuyển qua lại giữa Điện thoại và Máy tính
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      pullCurrentUserFromCloud();
    }
  });

  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  document.getElementById("fm-date").value = nextYear.toISOString().split("T")[0];

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll("[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.goto));
  });

  document.getElementById("sidebar-user-btn").addEventListener("click", () => switchTab("profile"));
  document.getElementById("top-profile-btn").addEventListener("click", () => switchTab("profile"));

  document.getElementById("quick-add-btn").addEventListener("click", () => {
    switchTab("tasks");
    resetTaskForm();
    document.getElementById("task-name-input").focus();
  });

  document.getElementById("refresh-quote-btn").addEventListener("click", refreshQuote);

  document.querySelectorAll(".auth-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.dataset.auth;
      document.getElementById("login-form").classList.toggle("hidden", mode !== "login");
      document.getElementById("register-form").classList.toggle("hidden", mode !== "register");
    });
  });

  // Xử lý ĐĂNG KÝ (Kiểm tra trùng trên Cloud + Đồng bộ ngay)
  document.getElementById("register-form").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("reg-username").value.trim().toLowerCase();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;

    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
      showToast("Username từ 3-24 ký tự, viết liền không dấu!");
      return;
    }
    if (password.length < 4) {
      showToast("Mật khẩu phải có ít nhất 4 ký tự!");
      return;
    }

    // Kiểm tra trên Cloud xem Username đã có người đăng ký chưa
    if (isCloudEnabled()) {
      const existingCloud = await fetchAccountFromCloud(username);
      if (existingCloud && existingCloud.profile) {
        showToast("Username này đã tồn tại trên hệ thống Cloud!");
        return;
      }
    } else if (users[username]) {
      showToast("Username này đã tồn tại!");
      return;
    }

    const isFirstAccountEver = Object.keys(users).length === 0;

    users[username] = {
      username,
      email,
      password,
      createdAt: getTodayStr()
    };
    saveUsersDB();

    if (isFirstAccountEver && tasks.length > 0) {
      localStorage.setItem(`studyos_tasks_${username}`, JSON.stringify(tasks));
      localStorage.setItem(`studyos_config_${username}`, JSON.stringify(config));
    }

    currentUser = username;
    localStorage.setItem("studyos_current_user", currentUser);
    loadActiveUserData();
    await syncToCloud();
    renderAll();
    document.getElementById("register-form").reset();
    showToast(`Đăng ký & đồng bộ thành công! Chào mừng @${username}`);
  });

  // Xử lý ĐĂNG NHẬP (Tải từ Cloud nếu đăng nhập trên thiết bị mới)
  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    if (isCloudEnabled()) {
      const cloudData = await fetchAccountFromCloud(username);
      if (cloudData && cloudData.profile) {
        if (cloudData.profile.password !== password) {
          showToast("Sai Username hoặc Mật khẩu!");
          return;
        }
        users[username] = cloudData.profile;
        saveUsersDB();
        currentUser = username;
        localStorage.setItem("studyos_current_user", currentUser);

        config = { ...DEFAULT_CONFIG, ...(cloudData.config || {}) };
        tasks = Array.isArray(cloudData.tasks) ? cloudData.tasks : [];
        futureMails = Array.isArray(cloudData.futureMails) ? cloudData.futureMails : [];
        saveLocalOnly();
        renderAll();
        document.getElementById("login-form").reset();
        showToast(`Đã đồng bộ dữ liệu của @${username} từ Cloud!`);
        return;
      }
    }

    // Fallback kiểm tra trên máy nếu chưa gắn link Cloud
    const account = users[username];
    if (!account || account.password !== password) {
      showToast("Sai Username hoặc Mật khẩu!");
      return;
    }

    currentUser = username;
    localStorage.setItem("studyos_current_user", currentUser);
    loadActiveUserData();
    await syncToCloud();
    renderAll();
    document.getElementById("login-form").reset();
    showToast(`Chào mừng trở lại, @${username}!`);
  });

  // Cập nhật Hồ sơ
  document.getElementById("profile-update-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUser || !users[currentUser]) return;

    const newEmail = document.getElementById("profile-edit-email").value.trim();
    const newPass = document.getElementById("profile-edit-password").value;

    users[currentUser].email = newEmail;
    if (newPass) {
      if (newPass.length < 4) {
        showToast("Mật khẩu mới phải từ 4 ký tự trở lên!");
        return;
      }
      users[currentUser].password = newPass;
    }

    saveUsersDB();
    await syncToCloud();
    renderAll();
    showToast("Đã cập nhật & đồng bộ thông tin hồ sơ!");
  });

  // Đăng xuất
  document.getElementById("logout-btn").addEventListener("click", () => {
    currentUser = null;
    localStorage.removeItem("studyos_current_user");
    loadActiveUserData();
    renderAll();
    showToast("Đã đăng xuất về chế độ Khách.");
  });

  // Tạo Thư gửi tương lai
  document.getElementById("future-mail-form").addEventListener("submit", e => {
    e.preventDefault();
    const subject = document.getElementById("fm-subject").value.trim();
    const targetDate = document.getElementById("fm-date").value;
    const message = document.getElementById("fm-message").value.trim();
    const userEmail = (currentUser && users[currentUser] && users[currentUser].email) || "";

    if (!subject || !targetDate || !message) return;

    futureMails.unshift({
      subject,
      targetDate,
      message,
      email: userEmail,
      createdAt: getTodayStr()
    });

    saveStorage();
    renderFutureMailList();
    document.getElementById("fm-subject").value = "";
    document.getElementById("fm-message").value = "";
    showToast(userEmail
      ? `Đã lên lịch thư tương lai (${targetDate}) cho ${userEmail}!`
      : `Đã niêm phong thư tương lai (${targetDate})!`);
  });

  document.getElementById("theme-toggle-btn").addEventListener("click", () => {
    const html = document.documentElement;
    const nextTheme = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", nextTheme);
  });

  document.getElementById("quick-aim-form").addEventListener("submit", e => {
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

  document.getElementById("task-form").addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("task-name-input").value.trim();
    const date = document.getElementById("task-date-input").value || getTodayStr();
    const time = document.getElementById("task-time-input").value || getCurrentTimeStr();
    const editIdx = parseInt(document.getElementById("edit-task-index").value, 10);

    if (!name) return;

    if (editIdx >= 0 && tasks[editIdx]) {
      tasks[editIdx].name = name;
      tasks[editIdx].date = date;
      tasks[editIdx].time = time;
      showToast("Đã cập nhật nhiệm vụ!");
    } else {
      tasks.push({ name, done: false, date, time });
      showToast(`Đã thêm "${name}"`);
    }

    saveStorage();
    resetTaskForm();
    renderAll();
  });

  document.getElementById("cancel-edit-btn").addEventListener("click", resetTaskForm);

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
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

  document.getElementById("focus-task-select").addEventListener("change", updateFocusPreviewName);

  document.getElementById("focus-start-btn").addEventListener("click", () => {
    if (tasks.length === 0) {
      showToast("Hãy thêm ít nhất 1 nhiệm vụ trước khi bắt đầu Focus!");
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

  document.getElementById("settings-form").addEventListener("submit", e => {
    e.preventDefault();
    config.title = document.getElementById("setting-title").value.trim() || "Study OS";
    config.target_date = document.getElementById("setting-target-date").value || "2027-06-01";
    config.aim_week = Math.max(1, parseInt(document.getElementById("setting-aim-week").value, 10) || 20);
    config.aim_month = Math.max(1, parseInt(document.getElementById("setting-aim-month").value, 10) || 80);
    saveStorage();
    renderAll();
    showToast("Đã lưu cấu hình hệ thống!");
  });

  document.getElementById("export-tasks-btn").addEventListener("click", () => downloadJSON("tasks.json", tasks));
  document.getElementById("export-config-btn").addEventListener("click", () => downloadJSON("config.json", config));

  document.getElementById("import-tasks-input").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (Array.isArray(parsed)) {
          tasks = parsed;
          migrateTasks();
          saveStorage();
          renderAll();
          showToast("Đã nhập dữ liệu tasks.json thành công!");
        }
      } catch {
        showToast("File tasks.json không hợp lệ!");
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("import-config-input").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed && typeof parsed === "object") {
          config = { ...DEFAULT_CONFIG, ...parsed };
          saveStorage();
          renderAll();
          showToast("Đã nhập dữ liệu config.json thành công!");
        }
      } catch {
        showToast("File config.json không hợp lệ!");
      }
    };
    reader.readAsText(file);
  });
});