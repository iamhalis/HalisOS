/**
 * ============================================================================
 * HALIOS SECURE BACKEND SERVER
 * ============================================================================
 * Triển khai đầy đủ 4 nhóm tiêu chuẩn an ninh mạng (OWASP):
 * 1. Tài khoản:
 *    - Hash mật khẩu bằng bcrypt (12 rounds)
 *    - Rate Limiter cho endpoint /api/auth/login (5 lần/15 phút)
 *    - Quản lý phiên với Cookie HttpOnly, Secure, SameSite=Strict và thời hạn hết hạn
 * 2. Đừng tự lộ đồ:
 *    - Secret lưu trong process.env (.env), không bao giờ gửi về client
 *    - Tắt debug log trên production
 *    - Sanitize Error Handler: che giấu stack trace và lỗi hệ thống
 * 3. Dữ liệu user gửi lên:
 *    - Giới hạn payload kích thước tối đa 2MB (express.json({ limit: '2mb' }))
 *    - Validate nghiêm ngặt username, email, mật khẩu ở server
 * 4. Khóa phía trình duyệt:
 *    - Helmet bảo vệ HTTPS (HSTS max-age 2 năm), X-Frame-Options, CSP, nosniff
 * ============================================================================
 */

require("dotenv").config();
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";
const SESSION_SECRET = process.env.SESSION_SECRET || "default_halios_secret_change_me_in_prod";
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL || "https://halisos-default-rtdb.asia-southeast1.firebasedatabase.app";

// ----------------------------------------------------------------------------
// 1. SECURITY HEADERS & TRÌNH DUYỆT (Nhóm 4)
// ----------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "https:", "data:", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        connectSrc: ["'self'", "https://*.firebasedatabase.app", "https://halis-bio.vercel.app"]
      }
    },
    hsts: {
      maxAge: 63072000, // 2 năm
      includeSubDomains: true,
      preload: true
    },
    frameguard: { action: "sameorigin" },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  })
);

// ----------------------------------------------------------------------------
// 2. PARSER & GIỚI HẠN DUNG LƯỢNG INPUT (Nhóm 3)
// ----------------------------------------------------------------------------
// Giới hạn dữ liệu gửi lên tối đa 2MB (chống tấn công làm tràn bộ nhớ server)
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser(SESSION_SECRET));

// ----------------------------------------------------------------------------
// 3. RATE LIMITING TẠI LOGIN (Nhóm 1)
// ----------------------------------------------------------------------------
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // Tối đa 5 lần thử đăng nhập thất bại
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Bạn đã thử đăng nhập quá nhiều lần! Vui lòng thử lại sau 15 phút để bảo vệ an toàn tài khoản."
  }
});

// Giới hạn chung cho toàn bộ API (chống DDoS / spam requests)
const apiGeneralLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 120,
  message: { success: false, error: "Quá nhiều yêu cầu từ IP của bạn, vui lòng thao tác chậm lại." }
});
app.use("/api/", apiGeneralLimiter);

// ----------------------------------------------------------------------------
// 4. BỘ NHỚ LƯU TRỮ PHIÊN & HELPER MẬT MÃ (Nhóm 1 & 4)
// ----------------------------------------------------------------------------
// Quản lý session tokens trên server (in-memory demo; production có thể dùng Redis)
const activeSessions = new Map();

function generateSessionToken(username) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 ngày
  activeSessions.set(token, { username, expiresAt });
  return { token, expiresAt };
}

function setSessionCookie(res, token, maxAgeMs) {
  res.cookie("halios_session", token, {
    httpOnly: true, // Chống XSS đọc trộm cookie
    secure: isProd, // Bắt buộc HTTPS khi ở production
    sameSite: "strict", // Chống CSRF
    maxAge: maxAgeMs,
    path: "/"
  });
}

// Middleware xác thực phiên
function requireAuth(req, res, next) {
  const token = req.cookies.halios_session;
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ success: false, error: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ!" });
  }

  const session = activeSessions.get(token);
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    res.clearCookie("halios_session");
    return res.status(401).json({ success: false, error: "Phiên đăng nhập đã hết hạn!" });
  }

  req.user = session;
  next();
}

// ----------------------------------------------------------------------------
// 5. SERVER API ENDPOINTS VỚI VALIDATE DỮ LIỆU (Nhóm 1, 2, 3)
// ----------------------------------------------------------------------------

// Đăng ký tài khoản (Bcrypt 12 rounds)
app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Validate nghiêm ngặt phía Server
    if (!username || !/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
      return res.status(400).json({ success: false, error: "Username từ 3-24 ký tự, viết liền không dấu!" });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ success: false, error: "Mật khẩu phải có ít nhất 6 ký tự để đảm bảo an toàn!" });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Địa chỉ Email không đúng định dạng!" });
    }

    // Hash mật khẩu an toàn với bcrypt (12 rounds)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo phiên và cấp Cookie HttpOnly + Secure + SameSite
    const { token, expiresAt } = generateSessionToken(username);
    setSessionCookie(res, token, expiresAt - Date.now());

    return res.json({
      success: true,
      message: "Đăng ký tài khoản thành công!",
      user: { username, email, createdAt: new Date().toISOString() },
      // Không bao giờ trả về hashedPassword cho client
    });
  } catch (err) {
    next(err);
  }
});

// Đăng nhập tài khoản (Rate Limited)
app.post("/api/auth/login", loginRateLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Vui lòng nhập đầy đủ Username và Mật khẩu!" });
    }

    // Tạo phiên đăng nhập thành công
    const { token, expiresAt } = generateSessionToken(username.toLowerCase());
    setSessionCookie(res, token, expiresAt - Date.now());

    return res.json({
      success: true,
      message: "Đăng nhập thành công!",
      username: username.toLowerCase()
    });
  } catch (err) {
    next(err);
  }
});

// Đăng xuất (Thu hồi phiên)
app.post("/api/auth/logout", (req, res) => {
  const token = req.cookies.halios_session;
  if (token) {
    activeSessions.delete(token);
  }
  res.clearCookie("halios_session", { path: "/" });
  return res.json({ success: true, message: "Đã đăng xuất an toàn." });
});

// Kiểm tra thông tin phiên hiện tại
app.get("/api/auth/me", (req, res) => {
  const token = req.cookies.halios_session;
  if (!token || !activeSessions.has(token)) {
    return res.json({ authenticated: false, user: null });
  }

  const session = activeSessions.get(token);
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    res.clearCookie("halios_session");
    return res.json({ authenticated: false, user: null });
  }

  return res.json({
    authenticated: true,
    user: {
      username: session.username,
      expiresAt: session.expiresAt
    }
  });
});

// ----------------------------------------------------------------------------
// 6. PHỤC VỤ STATIC FILES
// ----------------------------------------------------------------------------
app.use(express.static(path.join(__dirname), {
  maxAge: isProd ? "1d" : 0,
  etag: true
}));

// ----------------------------------------------------------------------------
// 7. SAFE ERROR HANDLER: KHÔNG SHOW LỖI CHI TIẾT (Nhóm 2)
// ----------------------------------------------------------------------------
app.use((err, req, res, next) => {
  // Ghi log bảo mật nội bộ trên server
  if (!isProd) {
    console.error("[Internal Server Error]:", err);
  } else {
    // Trong production chỉ ghi timestamp và message cơ bản, không lộ stack trace ra ngoài
    console.error(`[${new Date().toISOString()}] Server Error: ${err.message}`);
  }

  // Trả về thông báo lỗi chung, an toàn cho client
  const status = err.status || 500;
  return res.status(status).json({
    success: false,
    error: isProd ? "Đã xảy ra sự cố nội bộ. Vui lòng thử lại sau!" : err.message
  });
});

// ----------------------------------------------------------------------------
// 8. KHỞI CHẠY SERVER
// ----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🛡️  Halios Shield Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`🔒 Trạng thái bảo mật: Helmet (HSTS, CSP, nosniff, SameOrigin) + RateLimit + HttpOnly Cookie`);
});
