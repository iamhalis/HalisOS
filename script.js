const CLOUD_DB_URL = "[https://halisos-default-rtdb.asia-southeast1.firebasedatabase.app/](https://halisos-default-rtdb.asia-southeast1.firebasedatabase.app/)";

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
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

// ---------- Quản lý Tài khoản & Lưu trữ ----------
let users = loadJSON("studyos_users", {});
let currentUser = localStorage.getItem("studyos_current_user") || null;

let config = { ...DEFAULT_CONFIG };
let tasks = [];
let futureMails = []; // Thư niêm phong cá nhân
let sharedLetters = loadJSON("studyos_shared_letters", []); // Thư gửi giữa các người dùng

let currentFilter = "all";
let searchQuery = "";
let currentPage = 1;
let activeSocialBox = "inbox"; // "inbox" | "sent"

// Biến Focus Session
let focusInterval = null;
let focusStartTime = 0;
let focusPausedTime = 0;
let pauseStartTimestamp = 0;
let isFocusPaused = false;
let isFocusRunning = false;

// ---------- Hàm chuẩn hóa định dạng ngày tháng DD-MM-YYYY ----------
function formatDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateInput) {
  if (!dateInput) return "";
  if (dateInput instanceof Date) {
    const d = String(dateInput.getDate()).padStart(2, "0");
    const m = String(dateInput.getMonth() + 1).padStart(2, "0");
    const y = dateInput.getFullYear();
    return `${d}-${m}-${y}`;
  }
  const str = String(dateInput).trim();
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split(/[-/]/);
    return `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
  }
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
    const [d, m, y] = str.split(/[-/]/);
    return `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
  }
  return str;
}

function toInputDateStr(dateInput) {
  if (!dateInput) return "";
  const str = String(dateInput).trim();
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
    const [d, m, y] = str.split(/[-/]/);
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split(/[-/]/);
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return str;
}

function parseAndValidateDDMMYYYY(str) {
  const cleaned = String(str).trim().replace(/\//g, "-");
  const match = cleaned.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const checkDate = new Date(year, month - 1, day);
  if (
    checkDate.getFullYear() !== year ||
    checkDate.getMonth() !== month - 1 ||
    checkDate.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysUntilDate(isoDateStr) {
  const target = new Date(toInputDateStr(isoDateStr) + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function getTodayStr() {
  return formatDateKey(new Date());
}

function getCurrentTimeStr() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

// ---------- Đồng bộ Firebase Cloud ----------
function isCloudEnabled() {
  return (
    CLOUD_DB_URL &&
    CLOUD_DB_URL.startsWith("https://") &&
    !CLOUD_DB_URL.includes("DAN-LINK-FIREBASE")
  );
}

function getCloudBase() {
  return CLOUD_DB_URL.replace(/\/+$/, "");
}

function getCloudEndpoint(username) {
  return `${getCloudBase()}/studyos_accounts/${encodeURIComponent(username)}.json`;
}

function getCloudAllAccountsEndpoint() {
  return `${getCloudBase()}/studyos_accounts.json`;
}

function getCloudSharedLettersEndpoint() {
  return `${getCloudBase()}/studyos_shared_letters.json`;
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

async function syncAllDirectoryUsersFromCloud() {
  if (!isCloudEnabled()) return;
  try {
    const res = await fetch(getCloudAllAccountsEndpoint());
    if (!res.ok) return;
    const allAccounts = await res.json();
    if (allAccounts && typeof allAccounts === "object") {
      Object.keys(allAccounts).forEach(uname => {
        if (allAccounts[uname] && allAccounts[uname].profile) {
          users[uname] = allAccounts[uname].profile;
        }
      });
      saveUsersDB();
    }
  } catch {
    // Bỏ qua nếu mất kết nối
  }
}

async function pullSharedLettersFromCloud() {
  if (!isCloudEnabled()) return;
  try {
    const res = await fetch(getCloudSharedLettersEndpoint());
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) {
      sharedLetters = data.filter(Boolean);
      localStorage.setItem("studyos_shared_letters", JSON.stringify(sharedLetters));
      renderSocialLettersList();
    } else if (data && typeof data === "object") {
      sharedLetters = Object.values(data).filter(Boolean);
      localStorage.setItem("studyos_shared_letters", JSON.stringify(sharedLetters));
      renderSocialLettersList();
    }
  } catch {
    // Fallback localStorage
  }
}

async function pushSharedLettersToCloud() {
  localStorage.setItem("studyos_shared_letters", JSON.stringify(sharedLetters));
  if (!isCloudEnabled()) return;
  try {
    await fetch(getCloudSharedLettersEndpoint(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sharedLetters)
    });
  } catch {
    // Fallback localStorage
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
    // Fallback lưu localStorage
  }
}

async function pullCurrentUserFromCloud() {
  await syncAllDirectoryUsersFromCloud();
  await pullSharedLettersFromCloud();
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
  sharedLetters = loadJSON("studyos_shared_letters", []);
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

// ---------- Xử lý & Nén ảnh đại diện (Avatar) ----------
function processAvatarFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject("Vui lòng chọn một file ảnh!");
      return;
    }
    if (!ALLOWED_AVATAR_TYPES.includes(file.type.toLowerCase())) {
      reject("Chỉ chấp nhận định dạng ảnh PNG, JPG, JPEG hoặc WebP!");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject("Không thể đọc file ảnh đã chọn.");
    reader.onload = ev => {
      const img = new Image();
      img.onerror = () => reject("File ảnh không hợp lệ hoặc bị hỏng.");
      img.onload = () => {
        const size = 240;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

        const dataUrl = canvas.toDataURL("image/webp", 0.86);
        resolve(dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderAvatarElement(containerEl, avatarDataUrl, fallbackLetter) {
  containerEl.innerHTML = "";
  if (avatarDataUrl) {
    const img = document.createElement("img");
    img.src = avatarDataUrl;
    img.alt = "Avatar";
    containerEl.appendChild(img);
  } else {
    containerEl.textContent = fallbackLetter;
  }
}

// ---------- Tiện ích hiển thị ----------
function showToast(msg, isError = false) {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast ${isError ? "error" : ""}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

function updateClockAndHeader() {
  const now = new Date();
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dateFormatted = `${days[now.getDay()]} • ${formatDisplayDate(now)}`;
  const timeFormatted = now.toTimeString().split(" ")[0];

  document.getElementById("current-date-display").textContent = dateFormatted;
  document.getElementById("live-clock").textContent = timeFormatted;
}

function calculateDaysLeft() {
  const diff = getDaysUntilDate(config.target_date);
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

function getSortedTasks() {
  return [...tasks].sort((a, b) => {
    const cmpDate = toInputDateStr(a.date || "9999-99-99").localeCompare(toInputDateStr(b.date || "9999-99-99"));
    if (cmpDate !== 0) return cmpDate;
    return (a.time || "99:99").localeCompare(b.time || "99:99");
  });
}

function renderAll() {
  document.getElementById("app-title").textContent = config.title;
  document.title = `${config.title} — Web Dashboard`;
  document.getElementById("days-left-display").textContent = `${calculateDaysLeft()} ngày`;
  document.getElementById("target-date-display").textContent = `Mục tiêu: ${formatDisplayDate(config.target_date)}`;

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

  const normalizedTargetISO = toInputDateStr(config.target_date) || "2027-06-01";
  document.getElementById("setting-target-date").value = normalizedTargetISO;
  document.getElementById("setting-target-date-display").value = formatDisplayDate(normalizedTargetISO);

  document.getElementById("setting-aim-week").value = aimWeek;
  document.getElementById("setting-aim-month").value = aimMonth;

  renderProfileUI();
  renderSealedLettersList();
  renderSocialLettersList();
  renderDashboardUpcoming();
  renderTasksTab();
  renderWeeklyCalendar();
  renderFocusSelector();
  renderAnalyticsCharts();
}

// ---------- VẼ BIỂU ĐỒ ĐƯỜNG ----------
function createSVGLineChart(labels, values, gradientId) {
  const width = 760;
  const height = 250;
  const padLeft = 48;
  const padRight = 32;
  const padTop = 32;
  const padBottom = 42;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const maxVal = Math.max(4, ...values);

  const points = values.map((v, i) => {
    const x = padLeft + (labels.length > 1 ? (i * plotW) / (labels.length - 1) : plotW / 2);
    const y = padTop + plotH - (v / maxVal) * plotH;
    return { x, y, v, label: labels[i] };
  });

  const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPoints = `${points[0].x.toFixed(1)},${padTop + plotH} ${polylinePoints} ${points[points.length - 1].x.toFixed(1)},${padTop + plotH}`;

  let gridLines = "";
  for (let step = 0; step <= 4; step++) {
    const val = Math.round((maxVal * step) / 4);
    const y = padTop + plotH - (step / 4) * plotH;
    gridLines += `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="chart-grid-line" />
      <text x="${padLeft - 10}" y="${y + 4}" text-anchor="end" class="chart-axis-label">${val}</text>
    `;
  }

  let nodesAndLabels = "";
  points.forEach(p => {
    nodesAndLabels += `
      <circle cx="${p.x}" cy="${p.y}" r="5" class="chart-point">
        <title>${p.label}: ${p.v} nhiệm vụ</title>
      </circle>
      <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" class="chart-value-label">${p.v}</text>
      <text x="${p.x}" y="${height - 12}" text-anchor="middle" class="chart-axis-label">${p.label}</text>
    `;
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" class="line-chart-svg">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.38" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      ${gridLines}
      <polygon points="${areaPoints}" fill="url(#${gradientId})" />
      <polyline points="${polylinePoints}" class="chart-line-path" />
      ${nodesAndLabels}
    </svg>
  `;
}

function renderAnalyticsCharts() {
  const now = new Date();

  const dayOfWeek = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const weekLabels = [];
  const weekValues = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = formatDateKey(d);
    const shortDate = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    weekLabels.push(`${dayNames[i]} (${shortDate})`);

    const count = tasks.filter(t => t.done && toInputDateStr(t.date) === key).length;
    weekValues.push(count);
  }

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekTotal = weekValues.reduce((a, b) => a + b, 0);

  document.getElementById("weekly-chart-subtitle").textContent =
    `Tuần hiện tại: ${formatDisplayDate(monday)} đến ${formatDisplayDate(sunday)}`;
  document.getElementById("weekly-chart-total").textContent = `Tổng tuần: ${weekTotal} task`;
  document.getElementById("weekly-line-chart").innerHTML = createSVGLineChart(weekLabels, weekValues, "gradWeek");

  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const ranges = [
    { label: "Tuần 1 (01-07)", start: 1, end: 7 },
    { label: "Tuần 2 (08-14)", start: 8, end: 14 },
    { label: "Tuần 3 (15-21)", start: 15, end: 21 },
    { label: "Tuần 4 (22-28)", start: 22, end: Math.min(28, daysInMonth) }
  ];
  if (daysInMonth > 28) {
    ranges.push({ label: `Tuần 5 (29-${daysInMonth})`, start: 29, end: daysInMonth });
  }

  const monthLabels = ranges.map(r => r.label);
  const monthValues = ranges.map(() => 0);

  tasks.forEach(t => {
    if (!t.done || !t.date) return;
    const d = new Date(toInputDateStr(t.date) + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      const dayNum = d.getDate();
      const bucketIdx = Math.min(ranges.length - 1, Math.floor((dayNum - 1) / 7));
      monthValues[bucketIdx]++;
    }
  });

  const monthTotal = monthValues.reduce((a, b) => a + b, 0);
  document.getElementById("monthly-chart-subtitle").textContent =
    `Tháng ${String(month + 1).padStart(2, "0")}-${year} (Thống kê theo từng tuần)`;
  document.getElementById("monthly-chart-total").textContent = `Tổng tháng: ${monthTotal} task`;
  document.getElementById("monthly-line-chart").innerHTML = createSVGLineChart(monthLabels, monthValues, "gradMonth");
}

// ---------- Render Hồ sơ & Avatar ----------
function renderProfileUI() {
  const sidebarAvatar = document.getElementById("sidebar-avatar");
  const sidebarUsername = document.getElementById("sidebar-username");
  const sidebarEmail = document.getElementById("sidebar-user-email");
  const topProfileBtn = document.getElementById("top-profile-btn");
  const guestView = document.getElementById("auth-guest-view");
  const userView = document.getElementById("auth-user-view");
  const activeAccountLabel = document.getElementById("settings-active-account");
  const profileBigAvatar = document.getElementById("profile-big-avatar");

  if (currentUser && users[currentUser]) {
    const u = users[currentUser];
    const initial = u.username.charAt(0).toUpperCase();
    const syncTag = isCloudEnabled() ? "☁️ Đã đồng bộ" : "Lưu nội bộ";

    renderAvatarElement(sidebarAvatar, u.avatar, initial);
    renderAvatarElement(profileBigAvatar, u.avatar, initial);

    sidebarUsername.textContent = u.username;
    sidebarEmail.textContent = u.email ? `${u.email} • ${syncTag}` : syncTag;
    topProfileBtn.textContent = `@${u.username}`;
    activeAccountLabel.textContent = u.username;

    guestView.classList.add("hidden");
    userView.classList.remove("hidden");

    document.getElementById("profile-display-username").textContent = `@${u.username}`;
    document.getElementById("profile-display-email").textContent = u.email
      ? `Email: ${u.email} (${syncTag})`
      : `Chưa có email (${syncTag})`;
    document.getElementById("profile-edit-email").value = u.email || "";
  } else {
    renderAvatarElement(sidebarAvatar, null, "G");
    renderAvatarElement(profileBigAvatar, null, "G");
    sidebarUsername.textContent = "Khách (Guest)";
    sidebarEmail.textContent = "Nhấn để đăng nhập";
    topProfileBtn.textContent = "Đăng nhập";
    activeAccountLabel.textContent = "Khách (Guest)";

    guestView.classList.remove("hidden");
    userView.classList.add("hidden");
  }
}

// ---------- MODAL ĐỌC THƯ NIÊM PHONG ----------
function openLetterModal(letterData) {
  document.getElementById("letter-modal-subject").textContent = letterData.subject;
  document.getElementById("letter-modal-author").textContent = letterData.fromUser
    ? `@${letterData.fromUser}`
    : currentUser
    ? `@${currentUser}`
    : "Bạn";
  document.getElementById("letter-modal-recipient").textContent = letterData.toDisplay
    ? letterData.toDisplay
    : letterData.toUser
    ? `@${letterData.toUser}`
    : currentUser
    ? `@${currentUser} (Cá nhân)`
    : "Bản thân";
  document.getElementById("letter-modal-created").textContent = formatDisplayDate(letterData.createdAt || getTodayStr());
  document.getElementById("letter-modal-target").textContent = formatDisplayDate(letterData.targetDate);
  document.getElementById("letter-modal-content").textContent = letterData.message;
  document.getElementById("letter-modal-overlay").classList.remove("hidden");
}

function closeLetterModal() {
  document.getElementById("letter-modal-overlay").classList.add("hidden");
}

// ---------- PHẦN 1: DANH SÁCH THƯ NIÊM PHONG CÁ NHÂN ----------
function renderSealedLettersList() {
  const listEl = document.getElementById("future-mail-list");
  const badgeEl = document.getElementById("capsule-count-badge");
  if (!listEl || !badgeEl) return;

  listEl.innerHTML = "";
  badgeEl.textContent = `${futureMails.length} bức thư`;

  if (futureMails.length === 0) {
    listEl.innerHTML = `<p class="text-muted">Chưa có bức thư niêm phong cá nhân nào. Hãy viết một bức thư cho tương lai!</p>`;
    return;
  }

  const todayStr = getTodayStr();

  futureMails.forEach((mail, idx) => {
    const targetISO = toInputDateStr(mail.targetDate);
    const isUnlocked = todayStr >= targetISO;
    const daysLeft = getDaysUntilDate(targetISO);
    const displayTargetDate = formatDisplayDate(targetISO);
    const displayCreatedDate = formatDisplayDate(mail.createdAt || todayStr);

    const card = document.createElement("div");
    card.className = `capsule-card ${isUnlocked ? "unlocked" : "locked"}`;

    const statusHtml = isUnlocked
      ? `<span class="capsule-badge unlocked">🔓 Đã đến hạn mở thư</span>`
      : `<span class="capsule-badge locked">🔒 Còn ${daysLeft} ngày (${displayTargetDate})</span>`;

    const info = document.createElement("div");
    info.className = "capsule-info";
    info.innerHTML = `
      <div class="capsule-icon-box">${isUnlocked ? "✉️" : "🔒"}</div>
      <div class="capsule-text">
        <div class="capsule-title">${mail.subject}</div>
        <div class="capsule-meta-row">
          ${statusHtml}
          <span>• Tạo ngày: ${displayCreatedDate}</span>
        </div>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "capsule-actions";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    if (isUnlocked) {
      openBtn.className = "btn-open-letter ready";
      openBtn.textContent = "Mở thư ngay";
      openBtn.addEventListener("click", () => openLetterModal(mail));
    } else {
      openBtn.className = "btn-open-letter sealed";
      openBtn.textContent = `Mở ${displayTargetDate}`;
      openBtn.addEventListener("click", () => {
        showToast(`Bức thư đang niêm phong! Sẽ tự động mở vào ngày ${displayTargetDate} (còn ${daysLeft} ngày).`, true);
      });
    }

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "action-chip delete";
    delBtn.textContent = "Xoá";
    delBtn.addEventListener("click", () => {
      if (confirm(`Bạn có chắc muốn xoá bức thư "${mail.subject}"?`)) {
        futureMails.splice(idx, 1);
        saveStorage();
        renderSealedLettersList();
        showToast("Đã xoá bức thư niêm phong.");
      }
    });

    actions.appendChild(openBtn);
    actions.appendChild(delBtn);

    card.appendChild(info);
    card.appendChild(actions);
    listEl.appendChild(card);
  });
}

// ---------- PHẦN 2: TÌM NGƯỜI NHẬN CHÍNH XÁC & ẨN THÔNG TIN CHÉO ----------
// matchedBy: "username" (ẩn email) | "email" (ẩn tên)
function selectRecipientUser(userObj, matchedBy = "username") {
  const hiddenInput = document.getElementById("selected-recipient-username");
  const chipEl = document.getElementById("selected-recipient-chip");
  const searchInput = document.getElementById("recipient-search-input");
  const dropdownEl = document.getElementById("recipient-suggestions");

  hiddenInput.value = userObj.username;
  hiddenInput.dataset.matchedBy = matchedBy;

  chipEl.innerHTML = "";
  chipEl.classList.remove("hidden");

  const avatarDiv = document.createElement("div");
  avatarDiv.className = "chip-avatar";
  const fallbackChar =
    matchedBy === "email" && userObj.email
      ? userObj.email.charAt(0).toUpperCase()
      : userObj.username.charAt(0).toUpperCase();
  renderAvatarElement(avatarDiv, userObj.avatar, fallbackChar);

  const labelSpan = document.createElement("span");
  // Nếu tìm bằng email thì chỉ hiện email (ẩn tên), nếu tìm bằng tên thì chỉ hiện @username (ẩn email)
  labelSpan.textContent =
    matchedBy === "email" && userObj.email
      ? userObj.email
      : `@${userObj.username}`;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "chip-remove-btn";
  removeBtn.textContent = "✕";
  removeBtn.title = "Xoá người nhận";
  removeBtn.addEventListener("click", clearSelectedRecipient);

  chipEl.appendChild(avatarDiv);
  chipEl.appendChild(labelSpan);
  chipEl.appendChild(removeBtn);

  searchInput.value = "";
  searchInput.placeholder = "";
  dropdownEl.classList.add("hidden");
}

function clearSelectedRecipient() {
  const hiddenInput = document.getElementById("selected-recipient-username");
  hiddenInput.value = "";
  delete hiddenInput.dataset.matchedBy;

  const chipEl = document.getElementById("selected-recipient-chip");
  chipEl.innerHTML = "";
  chipEl.classList.add("hidden");
  const searchInput = document.getElementById("recipient-search-input");
  searchInput.placeholder = "Nhập đúng @username hoặc email để tìm người nhận...";
  searchInput.focus();
}

function renderRecipientSuggestions(queryText) {
  const dropdownEl = document.getElementById("recipient-suggestions");
  const rawQuery = String(queryText || "").trim().toLowerCase();
  const cleanUsernameQuery = rawQuery.replace(/^@/, "");

  // Không hiện bất kỳ ai nếu chưa gõ chữ
  if (!cleanUsernameQuery) {
    dropdownEl.innerHTML = "";
    dropdownEl.classList.add("hidden");
    return;
  }

  const allUserList = Object.values(users).filter(u => u && u.username);

  // Chỉ lọc khi gõ khớp chính xác với tên (username) hoặc khớp chính xác với email
  const exactMatches = [];
  allUserList.forEach(u => {
    const isExactUsername = u.username.toLowerCase() === cleanUsernameQuery;
    const isExactEmail =
      !rawQuery.startsWith("@") &&
      Boolean(u.email) &&
      u.email.toLowerCase() === rawQuery;

    if (isExactEmail) {
      exactMatches.push({ user: u, matchedBy: "email" });
    } else if (isExactUsername) {
      exactMatches.push({ user: u, matchedBy: "username" });
    }
  });

  dropdownEl.innerHTML = "";

  // Chưa gõ đúng hoàn toàn tên hoặc email thì không hiển thị danh sách người dùng
  if (exactMatches.length === 0) {
    dropdownEl.classList.add("hidden");
    return;
  }

  exactMatches.forEach(({ user: u, matchedBy }) => {
    const row = document.createElement("div");
    row.className = "suggestion-item";

    const av = document.createElement("div");
    av.className = "suggestion-avatar";
    const fallbackInitial =
      matchedBy === "email" && u.email
        ? u.email.charAt(0).toUpperCase()
        : u.username.charAt(0).toUpperCase();
    renderAvatarElement(av, u.avatar, fallbackInitial);

    const info = document.createElement("div");
    info.className = "suggestion-info";
    const isSelf = currentUser && u.username === currentUser;

    if (matchedBy === "email") {
      // Tìm bằng email -> Ẩn tên (username), chỉ hiện email
      info.innerHTML = `
        <span class="suggestion-name">${u.email} ${isSelf ? "(Bạn)" : ""}</span>
        <span class="suggestion-email">Nhấn để chọn người nhận qua Email</span>
      `;
    } else {
      // Tìm bằng tên (username) -> Ẩn email, chỉ hiện @username
      info.innerHTML = `
        <span class="suggestion-name">@${u.username} ${isSelf ? "(Bạn)" : ""}</span>
        <span class="suggestion-email">Nhấn để chọn người nhận</span>
      `;
    }

    row.appendChild(av);
    row.appendChild(info);

    row.addEventListener("click", () => selectRecipientUser(u, matchedBy));
    dropdownEl.appendChild(row);
  });

  dropdownEl.classList.remove("hidden");
}

function renderSocialLettersList() {
  const inboxEl = document.getElementById("social-inbox-list");
  const sentEl = document.getElementById("social-sent-list");
  const inboxCountEl = document.getElementById("inbox-count");
  const sentCountEl = document.getElementById("sent-count");

  if (!inboxEl || !sentEl) return;

  inboxEl.innerHTML = "";
  sentEl.innerHTML = "";

  if (!currentUser) {
    inboxCountEl.textContent = "0";
    sentCountEl.textContent = "0";
    const guestMsg = `<p class="text-muted">Vui lòng <button type="button" class="btn-link" onclick="switchTab('profile')">Đăng nhập tài khoản</button> để gửi và nhận thư niêm phong với người dùng khác.</p>`;
    inboxEl.innerHTML = guestMsg;
    sentEl.innerHTML = guestMsg;
    return;
  }

  const todayStr = getTodayStr();
  const inboxLetters = sharedLetters.filter(l => l && l.toUser === currentUser);
  const sentLetters = sharedLetters.filter(l => l && l.fromUser === currentUser);

  inboxCountEl.textContent = String(inboxLetters.length);
  sentCountEl.textContent = String(sentLetters.length);

  // Render Hộp thư đến
  if (inboxLetters.length === 0) {
    inboxEl.innerHTML = `<p class="text-muted">Hộp thư đến trống. Chưa có người dùng nào gửi thư niêm phong cho @${currentUser}.</p>`;
  } else {
    inboxLetters.forEach(letter => {
      const targetISO = toInputDateStr(letter.targetDate);
      const isUnlocked = todayStr >= targetISO;
      const daysLeft = getDaysUntilDate(targetISO);
      const displayTargetDate = formatDisplayDate(targetISO);
      const displayCreatedDate = formatDisplayDate(letter.createdAt || todayStr);

      const card = document.createElement("div");
      card.className = `capsule-card ${isUnlocked ? "unlocked" : "locked"}`;

      const statusHtml = isUnlocked
        ? `<span class="capsule-badge unlocked">🔓 Đã mở khóa</span>`
        : `<span class="capsule-badge locked">🔒 Mở sau ${daysLeft} ngày (${displayTargetDate})</span>`;

      const info = document.createElement("div");
      info.className = "capsule-info";
      info.innerHTML = `
        <div class="capsule-icon-box">${isUnlocked ? "📩" : "🔒"}</div>
        <div class="capsule-text">
          <div class="capsule-title">${letter.subject}</div>
          <div class="capsule-meta-row">
            <strong>Từ: @${letter.fromUser}</strong>
            ${statusHtml}
            <span>• Gửi ngày: ${displayCreatedDate}</span>
          </div>
        </div>
      `;

      const actions = document.createElement("div");
      actions.className = "capsule-actions";

      const openBtn = document.createElement("button");
      openBtn.type = "button";
      if (isUnlocked) {
        openBtn.className = "btn-open-letter ready";
        openBtn.textContent = "Đọc thư";
        openBtn.addEventListener("click", () => openLetterModal(letter));
      } else {
        openBtn.className = "btn-open-letter sealed";
        openBtn.textContent = `Mở ${displayTargetDate}`;
        openBtn.addEventListener("click", () => {
          showToast(`Bức thư từ @${letter.fromUser} đang được niêm phong đến ngày ${displayTargetDate}!`, true);
        });
      }

      actions.appendChild(openBtn);
      card.appendChild(info);
      card.appendChild(actions);
      inboxEl.appendChild(card);
    });
  }

  // Render Hộp thư đã gửi
  if (sentLetters.length === 0) {
    sentEl.innerHTML = `<p class="text-muted">Bạn chưa gửi bức thư niêm phong nào cho người dùng khác.</p>`;
  } else {
    sentLetters.forEach(letter => {
      const targetISO = toInputDateStr(letter.targetDate);
      const isUnlocked = todayStr >= targetISO;
      const daysLeft = getDaysUntilDate(targetISO);
      const displayTargetDate = formatDisplayDate(targetISO);
      const recipientLabel = letter.toDisplay || `@${letter.toUser}`;

      const card = document.createElement("div");
      card.className = `capsule-card ${isUnlocked ? "unlocked" : "locked"}`;

      const statusHtml = isUnlocked
        ? `<span class="capsule-badge unlocked">🔓 Người nhận đã có thể mở</span>`
        : `<span class="capsule-badge locked">🔒 Đang khóa (${daysLeft} ngày nữa)</span>`;

      const info = document.createElement("div");
      info.className = "capsule-info";
      info.innerHTML = `
        <div class="capsule-icon-box">📤</div>
        <div class="capsule-text">
          <div class="capsule-title">${letter.subject}</div>
          <div class="capsule-meta-row">
            <strong>Tới: ${recipientLabel}</strong>
            ${statusHtml}
            <span>• Ngày mở: ${displayTargetDate}</span>
          </div>
        </div>
      `;

      const actions = document.createElement("div");
      actions.className = "capsule-actions";

      const viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "action-chip";
      viewBtn.textContent = "Xem lại";
      viewBtn.addEventListener("click", () => openLetterModal(letter));

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "action-chip delete";
      delBtn.textContent = "Thu hồi";
      delBtn.addEventListener("click", async () => {
        if (confirm(`Thu hồi và xoá bức thư "${letter.subject}" gửi cho ${recipientLabel}?`)) {
          const realIndex = sharedLetters.indexOf(letter);
          if (realIndex !== -1) {
            sharedLetters.splice(realIndex, 1);
            await pushSharedLettersToCloud();
            renderSocialLettersList();
            showToast("Đã thu hồi bức thư.");
          }
        }
      });

      actions.appendChild(viewBtn);
      actions.appendChild(delBtn);
      card.appendChild(info);
      card.appendChild(actions);
      sentEl.appendChild(card);
    });
  }
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
  document.getElementById("task-date-input").value = toInputDateStr(task.date);
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
    const dateKey = formatDateKey(d);
    const displayDate = formatDisplayDate(d);

    const dayTasks = tasks
      .filter(t => toInputDateStr(t.date) === dateKey)
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

function switchTab(tabId) {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.toggle("active", pane.id === `tab-${tabId}`);
  });
  if (tabId === "analytics") {
    renderAnalyticsCharts();
  }
  if (tabId === "future-messages") {
    syncAllDirectoryUsersFromCloud();
    pullSharedLettersFromCloud();
    renderSealedLettersList();
    renderSocialLettersList();
  }
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

function bindCustomDateInput(textInputId, hiddenDateId, triggerBtnId) {
  const textEl = document.getElementById(textInputId);
  const hiddenEl = document.getElementById(hiddenDateId);
  const btnEl = document.getElementById(triggerBtnId);

  btnEl.addEventListener("click", () => {
    if (typeof hiddenEl.showPicker === "function") {
      hiddenEl.showPicker();
    } else {
      hiddenEl.focus();
      hiddenEl.click();
    }
  });

  hiddenEl.addEventListener("change", () => {
    if (hiddenEl.value) {
      textEl.value = formatDisplayDate(hiddenEl.value);
    }
  });

  textEl.addEventListener("input", e => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (digits.length >= 5) {
      e.target.value = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
    } else if (digits.length >= 3) {
      e.target.value = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    } else {
      e.target.value = digits;
    }
    const iso = parseAndValidateDDMMYYYY(e.target.value);
    if (iso) {
      hiddenEl.value = iso;
    }
  });
}

// ---------- Sự kiện DOM ----------
document.addEventListener("DOMContentLoaded", () => {
  loadActiveUserData();
  resetTaskForm();
  refreshQuote();
  updateClockAndHeader();
  setInterval(updateClockAndHeader, 1000);
  renderAll();

  pullCurrentUserFromCloud();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      pullCurrentUserFromCloud();
    }
  });

  const defaultCapsuleISO = toInputDateStr(config.target_date) || "2027-06-21";
  document.getElementById("fm-date").value = defaultCapsuleISO;
  document.getElementById("fm-date-display").value = formatDisplayDate(defaultCapsuleISO);
  document.getElementById("ul-date").value = defaultCapsuleISO;
  document.getElementById("ul-date-display").value = formatDisplayDate(defaultCapsuleISO);

  // Gắn sự kiện cho 3 bộ chọn ngày chuẩn DD-MM-YYYY
  bindCustomDateInput("setting-target-date-display", "setting-target-date", "setting-date-Trigger");
  bindCustomDateInput("fm-date-display", "fm-date", "fm-date-trigger");
  bindCustomDateInput("ul-date-display", "ul-date", "ul-date-trigger");

  // Đóng Modal đọc thư
  document.getElementById("close-letter-modal-btn").addEventListener("click", closeLetterModal);
  document.getElementById("close-letter-footer-btn").addEventListener("click", closeLetterModal);
  document.getElementById("letter-modal-overlay").addEventListener("click", e => {
    if (e.target.id === "letter-modal-overlay") closeLetterModal();
  });

  // Chuyển đổi 2 chế độ trong Future Messages (1. Cá nhân | 2. Gửi người dùng khác)
  document.querySelectorAll(".fm-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".fm-mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.dataset.fmmode;
      document.getElementById("fm-pane-personal").classList.toggle("hidden", mode !== "personal");
      document.getElementById("fm-pane-social").classList.toggle("hidden", mode !== "social");
      if (mode === "social") {
        syncAllDirectoryUsersFromCloud();
        pullSharedLettersFromCloud();
        renderSocialLettersList();
      }
    });
  });

  // Chuyển đổi Hộp thư đến / Đã gửi
  document.querySelectorAll("[data-socialbox]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-socialbox]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeSocialBox = btn.dataset.socialbox;
      document.getElementById("social-inbox-list").classList.toggle("hidden", activeSocialBox !== "inbox");
      document.getElementById("social-sent-list").classList.toggle("hidden", activeSocialBox !== "sent");
    });
  });

  document.getElementById("refresh-social-mail-btn").addEventListener("click", async () => {
    await syncAllDirectoryUsersFromCloud();
    await pullSharedLettersFromCloud();
    showToast("Đã làm mới danh sách người dùng và hộp thư!");
  });

  // Ô tìm kiếm người nhận: Chỉ hiện khi gõ đúng tên hoặc đúng email
  const recipientSearchInput = document.getElementById("recipient-search-input");
  const recipientDropdown = document.getElementById("recipient-suggestions");

  recipientSearchInput.addEventListener("focus", () => {
    if (!document.getElementById("selected-recipient-username").value && recipientSearchInput.value.trim()) {
      renderRecipientSuggestions(recipientSearchInput.value);
    }
  });

  recipientSearchInput.addEventListener("input", e => {
    renderRecipientSuggestions(e.target.value);
  });

  recipientSearchInput.addEventListener("keydown", e => {
    if (e.key === "Backspace" && !recipientSearchInput.value && document.getElementById("selected-recipient-username").value) {
      clearSelectedRecipient();
    }
  });

  document.addEventListener("click", e => {
    const wrapper = document.getElementById("recipient-box-wrapper");
    if (wrapper && !wrapper.contains(e.target)) {
      recipientDropdown.classList.add("hidden");
    }
  });

  // Gửi thư niêm phong cho người dùng khác
  document.getElementById("user-letter-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUser || !users[currentUser]) {
      showToast("Vui lòng đăng nhập tài khoản trước khi gửi thư cho người dùng khác!", true);
      switchTab("profile");
      return;
    }

    const hiddenRecipientEl = document.getElementById("selected-recipient-username");
    let recipientUsername = hiddenRecipientEl.value.trim().toLowerCase();
    let matchedBy = hiddenRecipientEl.dataset.matchedBy || "username";

    const rawTyped = recipientSearchInput.value.trim().toLowerCase();
    const cleanTypedUsername = rawTyped.replace(/^@/, "");

    // Nếu người dùng gõ trực tiếp đúng username hoặc đúng email mà chưa bấm vào gợi ý
    if (!recipientUsername && cleanTypedUsername) {
      const foundByEmail =
        !rawTyped.startsWith("@") &&
        Object.values(users).find(u => u && u.email && u.email.toLowerCase() === rawTyped);
      const foundByUsername = Object.values(users).find(
        u => u && u.username.toLowerCase() === cleanTypedUsername
      );

      if (foundByEmail) {
        recipientUsername = foundByEmail.username;
        matchedBy = "email";
      } else if (foundByUsername) {
        recipientUsername = foundByUsername.username;
        matchedBy = "username";
      }
    }

    if (!recipientUsername || !users[recipientUsername]) {
      showToast("Vui lòng nhập chính xác @username hoặc email của người nhận đã đăng ký!", true);
      recipientSearchInput.focus();
      return;
    }

    const recipientObj = users[recipientUsername];
    const toDisplay =
      matchedBy === "email" && recipientObj.email
        ? recipientObj.email
        : `@${recipientObj.username}`;

    const subject = document.getElementById("ul-subject").value.trim();
    const rawDateStr = document.getElementById("ul-date-display").value.trim();
    const validatedISO = parseAndValidateDDMMYYYY(rawDateStr);
    const message = document.getElementById("ul-message").value.trim();

    if (!validatedISO) {
      showToast("Ngày mở thư không hợp lệ! Vui lòng nhập đúng định dạng DD-MM-YYYY.", true);
      document.getElementById("ul-date-display").focus();
      return;
    }

    if (!subject || !message) return;

    const newSharedLetter = {
      id: "letter_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      fromUser: currentUser,
      toUser: recipientUsername,
      toDisplay,
      subject,
      targetDate: validatedISO,
      message,
      createdAt: getTodayStr()
    };

    sharedLetters.unshift(newSharedLetter);
    await pushSharedLettersToCloud();
    renderSocialLettersList();

    clearSelectedRecipient();
    document.getElementById("ul-subject").value = "";
    document.getElementById("ul-message").value = "";
    showToast(`📨 Đã gửi thư niêm phong tới ${toDisplay} (Mở ngày ${formatDisplayDate(validatedISO)})!`);
  });

  // Điều hướng Sidebar
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

  // ĐĂNG KÝ
  document.getElementById("register-form").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("reg-username").value.trim().toLowerCase();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;

    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
      showToast("Username từ 3-24 ký tự, viết liền không dấu!", true);
      return;
    }
    if (password.length < 4) {
      showToast("Mật khẩu phải có ít nhất 4 ký tự!", true);
      return;
    }

    if (isCloudEnabled()) {
      const existingCloud = await fetchAccountFromCloud(username);
      if (existingCloud && existingCloud.profile) {
        showToast("Username này đã tồn tại trên hệ thống Cloud!", true);
        return;
      }
    } else if (users[username]) {
      showToast("Username này đã tồn tại!", true);
      return;
    }

    const isFirstAccountEver = Object.keys(users).length === 0;

    users[username] = {
      username,
      email,
      password,
      avatar: null,
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

  // ĐĂNG NHẬP
  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    if (isCloudEnabled()) {
      const cloudData = await fetchAccountFromCloud(username);
      if (cloudData && cloudData.profile) {
        if (cloudData.profile.password !== password) {
          showToast("Sai Username hoặc Mật khẩu!", true);
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
        await pullSharedLettersFromCloud();
        renderAll();
        document.getElementById("login-form").reset();
        showToast(`Đã đồng bộ dữ liệu của @${username} từ Cloud!`);
        return;
      }
    }

    const account = users[username];
    if (!account || account.password !== password) {
      showToast("Sai Username hoặc Mật khẩu!", true);
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

  // ĐỔI ẢNH ĐẠI DIỆN (AVATAR)
  document.getElementById("avatar-file-input").addEventListener("change", async e => {
    if (!currentUser || !users[currentUser]) {
      showToast("Tài khoản khách không thể sử dụng tính năng đổi ảnh đại diện!", true);
      e.target.value = "";
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    try {
      const avatarBase64 = await processAvatarFile(file);
      users[currentUser].avatar = avatarBase64;
      saveUsersDB();
      await syncToCloud();
      renderProfileUI();
      showToast("Đã cập nhật ảnh đại diện mới!");
    } catch (errMsg) {
      showToast(String(errMsg), true);
    } finally {
      e.target.value = "";
    }
  });

  // Cập nhật Email Hồ sơ
  document.getElementById("profile-update-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUser || !users[currentUser]) return;

    const newEmail = document.getElementById("profile-edit-email").value.trim();
    users[currentUser].email = newEmail;

    saveUsersDB();
    await syncToCloud();
    renderAll();
    showToast("Đã lưu địa chỉ Email vào hồ sơ!");
  });

  // QUY TRÌNH ĐỔI MẬT KHẨU BẮT BUỘC 3 BƯỚC
  document.getElementById("password-change-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUser || !users[currentUser]) {
      showToast("Tính năng đổi mật khẩu không áp dụng cho tài khoản Khách!", true);
      return;
    }

    const currentPasswordInput = document.getElementById("pwd-current").value;
    const newPasswordInput = document.getElementById("pwd-new").value;
    const confirmPasswordInput = document.getElementById("pwd-confirm").value;

    if (!currentPasswordInput) {
      showToast("Vui lòng nhập mật khẩu hiện tại (mật khẩu cũ)!", true);
      return;
    }

    if (users[currentUser].password !== currentPasswordInput) {
      showToast("Mật khẩu hiện tại (mật khẩu cũ) không chính xác!", true);
      return;
    }

    if (!newPasswordInput || newPasswordInput.length < 4) {
      showToast("Mật khẩu mới phải có ít nhất 4 ký tự!", true);
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      showToast("Mật khẩu mới và xác nhận mật khẩu mới không khớp!", true);
      return;
    }

    users[currentUser].password = newPasswordInput;
    saveUsersDB();
    await syncToCloud();
    document.getElementById("password-change-form").reset();
    showToast("Đổi mật khẩu thành công!");
  });

  // Đăng xuất
  document.getElementById("logout-btn").addEventListener("click", () => {
    currentUser = null;
    localStorage.removeItem("studyos_current_user");
    loadActiveUserData();
    renderAll();
    showToast("Đã đăng xuất về chế độ Khách.");
  });

  // NIÊM PHONG THƯ CÁ NHÂN
  document.getElementById("future-mail-form").addEventListener("submit", e => {
    e.preventDefault();
    const subject = document.getElementById("fm-subject").value.trim();
    const rawDateStr = document.getElementById("fm-date-display").value.trim();
    const validatedISO = parseAndValidateDDMMYYYY(rawDateStr);
    const message = document.getElementById("fm-message").value.trim();

    if (!validatedISO) {
      showToast("Ngày mở thư không hợp lệ! Vui lòng nhập đúng định dạng DD-MM-YYYY.", true);
      document.getElementById("fm-date-display").focus();
      return;
    }

    if (!subject || !message) return;

    futureMails.unshift({
      subject,
      targetDate: validatedISO,
      message,
      createdAt: getTodayStr()
    });

    saveStorage();
    renderSealedLettersList();
    document.getElementById("fm-subject").value = "";
    document.getElementById("fm-message").value = "";
    showToast(`🔒 Đã niêm phong bức thư cá nhân! Sẽ mở khóa vào ngày ${formatDisplayDate(validatedISO)}.`);
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
      showToast(`Đã thêm "${name}" (${formatDisplayDate(date)})`);
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

  // Cài đặt chung (Lưu cấu hình & Ngày mục tiêu)
  document.getElementById("settings-form").addEventListener("submit", e => {
    e.preventDefault();
    const rawTargetStr = document.getElementById("setting-target-date-display").value.trim();
    const validatedISO = parseAndValidateDDMMYYYY(rawTargetStr);

    if (!validatedISO) {
      showToast("Ngày mục tiêu không hợp lệ! Vui lòng nhập đúng định dạng DD-MM-YYYY (VD: 01-06-2027).", true);
      document.getElementById("setting-target-date-display").focus();
      return;
    }

    config.title = document.getElementById("setting-title").value.trim() || "Study OS";
    config.target_date = validatedISO;
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
        showToast("File tasks.json không hợp lệ!", true);
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
          config.target_date = toInputDateStr(config.target_date) || "2027-06-01";
          saveStorage();
          renderAll();
          showToast("Đã nhập dữ liệu config.json thành công!");
        }
      } catch {
        showToast("File config.json không hợp lệ!", true);
      }
    };
    reader.readAsText(file);
  });
});