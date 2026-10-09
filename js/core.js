// =========================================================================
// 1. CORE.JS — CẤU HÌNH, TRẠNG THÁI CHUNG, NGÀY THÁNG & FIREBASE CLOUD
// =========================================================================
const CLOUD_DB_URL = "http://localhost:3000/api/";
const QUOTES = [
  "'Kỷ luật là cầu nối giữa mục tiêu và thành tựu.' — Jim Rohn", "'Rễ của sự học thì đắng, nhưng quả của nó lại ngọt ngào.' — Aristotle", "'Không có thang máy dẫn đến thành công, bạn phải đi bằng cầu thang bộ.' — Zig Ziglar", "'Nỗ lực nhỏ được lặp lại mỗi ngày chính là chìa khóa tạo nên kỳ tích.' — Robert Collier", "'Học tập không làm cạn kiệt tâm trí, nó chỉ làm tâm trí thêm bừng sáng.' — Leonardo da Vinci",
  "'Sự chuẩn bị kỹ lưỡng ngày hôm nay là thành công của ngày mai.' — Malcolm X", "'Kiên trì không phải là một cuộc đua dài, mà là nhiều cuộc đua ngắn nối tiếp nhau.' — Walter Elliot", "'Đừng sợ đi chậm, chỉ sợ đứng yên một chỗ.' — Ngạn ngữ phương Đông", "'Không áp lực, không có kim cương.' — Thomas Carlyle", "'Hành trình vạn dặm luôn bắt đầu từ một bước chân.' — Lão Tử",
  "'Tri thức là kho báu, nhưng thực hành mới là chìa khóa mở kho báu đó.' — Thomas Fuller", "'Đừng giảm mục tiêu của bạn xuống, hãy tăng sự nỗ lực của bạn lên.' — Grant Cardone", "'Người muốn tỏa sáng thì phải chấp nhận những giờ phút miệt mài trong bóng tối.' — Khuyết danh", "'Sự khác biệt giữa người thành công và những người khác không phải là thiếu sức mạnh hay kiến thức, mà là thiếu ý chí.' — Vince Lombardi", "'Hôm nay bạn đọc một trang sách, ngày mai bạn tiến gần hơn một bước tới ước mơ.' — Khuyết danh",
  "'Đau đớn của sự kỷ luật chỉ nặng vài gam, nhưng nỗi đau của sự hối hận nặng tới hàng tấn.' — Jim Rohn", "'Chuyên gia trong bất kỳ lĩnh vực nào cũng từng là một người mới bắt đầu.' — Helen Hayes", "'Tập trung vào việc trở nên hiệu quả, chứ không phải chỉ bận rộn.' — Tim Ferriss", "'Giọt nước làm mòn tảng đá không phải bằng sức mạnh, mà bằng sự bền bỉ.' — Ovid", "'Nếu bạn không sẵn sàng học hỏi, không ai có thể giúp bạn. Nếu bạn quyết tâm học hỏi, không ai có thể ngăn cản bạn.' — Zig Ziglar",
  "'Đừng nhìn đồng hồ; hãy làm những gì nó làm: cứ tiếp tục tiến tới.' — Sam Levenson", "'Thời gian tốt nhất để trồng một cái cây là 20 năm trước. Thời gian tốt thứ hai là ngay bây giờ.' — Ngạn ngữ", "'Thất bại đơn giản là cơ hội để bắt đầu lại một cách thông minh hơn.' — Henry Ford", "'Ước mơ sẽ không thành hiện thực nếu bạn chỉ mơ mộng mà không bắt tay vào làm.' — John C. Maxwell", "'Cách tốt nhất để dự đoán tương lai là tự mình kiến tạo nên nó.' — Abraham Lincoln",
  "'Hãy nghiêm khắc với bản thân và bao dung với người khác.' — Khổng Tử", "'Sức mạnh không đến từ những điều bạn đã làm được, nó đến từ việc vượt qua những điều bạn từng nghĩ mình không thể.' — Rikki Rogers", "'Một giờ tập trung cao độ có giá trị hơn cả một ngày làm việc hời hợt.' — Cal Newport", "'Khó khăn ngày hôm nay chính là sức mạnh của bạn vào ngày mai.' — Khuyết danh", "'Đỉnh cao không dành cho người may mắn, nó dành cho người không bỏ cuộc giữa chừng.' — Khuyết danh"
];

const DEFAULT_CONFIG = {
  title: "Study OS",
  target_date: "2027-06-01",
  aim_week: 20,
  aim_month: 80
};

const ITEMS_PER_PAGE = 6;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const SHARE_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTVWXYZ";

// ---------- Biến trạng thái toàn cục ----------
let users = loadJSON("studyos_users", {});
let currentUser = localStorage.getItem("studyos_current_user") || null;

let config = { ...DEFAULT_CONFIG };
let tasks = [];
let futureMails = [];
let sharedLetters = loadJSON("studyos_shared_letters", []);
let shareCodeRegistry = loadJSON("studyos_share_codes", {});

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

function validateTimeHHMM(timeStr) {
  const cleaned = String(timeStr || "").trim();
  const match = cleaned.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const hh = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
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

function getVietnameseDayName(dateStrOrObj) {
  const d = dateStrOrObj instanceof Date ? dateStrOrObj : new Date(toInputDateStr(dateStrOrObj) + "T00:00:00");
  const names = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return isNaN(d) ? "" : names[d.getDay()];
}

function getUpcoming7DaysISOList() {
  const today = new Date();
  const list = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    list.push(formatDateKey(d));
  }
  return list;
}

function getSortedTasks() {
  return [...tasks].sort((a, b) => {
    const cmpDate = toInputDateStr(a.date || "9999-99-99").localeCompare(toInputDateStr(b.date || "9999-99-99"));
    if (cmpDate !== 0) return cmpDate;
    return (a.time || "99:99").localeCompare(b.time || "99:99");
  });
}

// ---------- Đồng bộ Firebase Cloud & LocalStorage ----------
function isCloudEnabled() {
  return (
    CLOUD_DB_URL &&
    (CLOUD_DB_URL.startsWith("https://") || CLOUD_DB_URL.startsWith("http://localhost")) &&
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
      if (typeof renderSocialLettersList === "function") renderSocialLettersList();
    } else if (data && typeof data === "object") {
      sharedLetters = Object.values(data).filter(Boolean);
      localStorage.setItem("studyos_shared_letters", JSON.stringify(sharedLetters));
      if (typeof renderSocialLettersList === "function") renderSocialLettersList();
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
    if (typeof renderAll === "function") renderAll();
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
  if (typeof selectedShareTaskIndices !== "undefined") selectedShareTaskIndices.clear();
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
    if (!t.date) {
      t.date = today;
      migrated = true;
    } else {
      const normalizedISO = toInputDateStr(t.date);
      if (normalizedISO !== t.date) {
        t.date = normalizedISO;
        migrated = true;
      }
    }
    if (!t.time) { t.time = "00:00"; migrated = true; }
    if (typeof t.done !== "boolean") { t.done = Boolean(t.done); migrated = true; }
  });
  if (migrated) saveLocalOnly();
}

// ---------- Tiện ích Giao diện dùng chung ----------
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

// Biến lưu vị trí câu danh ngôn hiện tại trong ngày
let currentQuoteIndex = -1;

function getDailyQuoteIndex() {
  const now = new Date();
  // Tính số ngày tính từ mốc cố định để mỗi ngày tăng đúng 1 đơn vị
  const daysSinceEpoch = Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000
  );
  return daysSinceEpoch % QUOTES.length;
}

// Mặc định lấy đúng câu danh ngôn của ngày hôm nay; nếu truyền true thì chuyển sang câu kế tiếp
function refreshQuote(forceNext = false) {
  if (currentQuoteIndex === -1 || !forceNext) {
    currentQuoteIndex = getDailyQuoteIndex();
  } else {
    currentQuoteIndex = (currentQuoteIndex + 1) % QUOTES.length;
  }

  const quoteEl = document.getElementById("quote-text");
  if (quoteEl) {
    quoteEl.textContent = QUOTES[currentQuoteIndex];
  }
}
function bindCustomDateInput(textInputId, hiddenDateId, triggerBtnId, onChangeCallback) {
  const textEl = document.getElementById(textInputId);
  const hiddenEl = document.getElementById(hiddenDateId);
  const btnEl = document.getElementById(triggerBtnId);
  if (!textEl || !hiddenEl || !btnEl) return;

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
      if (typeof onChangeCallback === "function") onChangeCallback(hiddenEl.value);
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
      if (typeof onChangeCallback === "function") onChangeCallback(iso);
    }
  });
}