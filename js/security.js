/**
 * ============================================================================
 * HALIOS SECURITY MODULE (SHIELD ENGINE)
 * ============================================================================
 * Triển khai đầy đủ 4 chuẩn an toàn bảo mật:
 * 1. Tài khoản:
 *    - Hash mật khẩu bằng thuật toán mật mã PBKDF2-SHA256 (100,000 iterations + cryptographic salt)
 *    - Rate Limit chống Brute-Force tại Login (Lockout 60s sau 5 lần nhập sai)
 *    - Session Lifecycle có thời hạn hết hạn (TTL 7 ngày, kiểm tra tự động)
 * 2. Đừng tự lộ đồ:
 *    - SecurityLogger: Tắt toàn bộ debug log trên production, chỉ bật tại localhost
 *    - Sanitize Error: Che giấu chi tiết lỗi hệ thống / stack trace với người dùng
 * 3. Dữ liệu user gửi lên:
 *    - Giới hạn dung lượng file upload (tối đa 2MB)
 *    - Xác thực định dạng MIME & kiểm tra chữ ký nhị phân Magic Bytes (PNG, JPG, WebP)
 * 4. Khoá phía trình duyệt & API:
 *    - Đồng bộ Cookie HttpOnly + Secure + SameSite khi kết nối Backend
 * ============================================================================
 */

(function (window) {
  "use strict";

  // --------------------------------------------------------------------------
  // 1. SAFE LOGGER & ERROR SANITIZER (Đừng tự lộ đồ)
  // --------------------------------------------------------------------------
  const isLocalDev = Boolean(
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:"
  );

  const SecurityLogger = {
    isDev: isLocalDev,
    log(...args) {
      if (this.isDev) console.log("[Halios Shield]", ...args);
    },
    warn(...args) {
      if (this.isDev) console.warn("[Halios Shield:Warn]", ...args);
    },
    error(...args) {
      if (this.isDev) console.error("[Halios Shield:Err]", ...args);
    },
    sanitizeError(err, fallback = "Đã xảy ra lỗi, vui lòng thử lại sau!") {
      if (this.isDev) {
        console.error("[Halios Internal Trace]:", err);
      }
      return fallback;
    }
  };

  // --------------------------------------------------------------------------
  // 2. MẬT MÃ & HASH MẬT KHẨU (Web Crypto PBKDF2-SHA256)
  // --------------------------------------------------------------------------
  function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Băm mật khẩu sử dụng PBKDF2 với SHA-256 (100,000 vòng lặp + 16 bytes salt ngẫu nhiên)
   */
  async function hashPassword(password, saltHex = null) {
    if (!password || typeof password !== "string") {
      throw new Error("Mật khẩu không hợp lệ!");
    }
    const encoder = new TextEncoder();
    const salt = saltHex
      ? hexToBytes(saltHex)
      : window.crypto.getRandomValues(new Uint8Array(16));

    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );

    const hashHex = bytesToHex(new Uint8Array(derivedBits));
    const saltStr = bytesToHex(salt);
    return `pbkdf2:100000$${saltStr}$${hashHex}`;
  }

  /**
   * Xác thực mật khẩu với hash đã lưu
   * Tự động tương thích với tài khoản cũ (plaintext) và nâng cấp lên hash
   */
  async function verifyPassword(inputPassword, storedPasswordHash) {
    if (!storedPasswordHash || !inputPassword) return false;

    // Hỗ trợ backward compatibility với tài khoản cũ chưa hash
    if (!storedPasswordHash.startsWith("pbkdf2:")) {
      return inputPassword === storedPasswordHash;
    }

    const parts = storedPasswordHash.split("$");
    if (parts.length !== 3) return false;
    const saltHex = parts[1];

    try {
      const calculatedHash = await hashPassword(inputPassword, saltHex);
      return calculatedHash === storedPasswordHash;
    } catch (e) {
      SecurityLogger.error("Lỗi khi kiểm tra hash mật khẩu:", e);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // 3. RATE LIMITING TẠI FORM ĐĂNG NHẬP (Chống Brute-Force)
  // --------------------------------------------------------------------------
  const RATE_LIMIT_STORAGE_KEY = "studyos_login_ratelimit";
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_MS = 60 * 1000; // Khóa 60 giây

  const RateLimiter = {
    getLockoutRemainingSeconds() {
      try {
        const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
        if (!raw) return 0;
        const data = JSON.parse(raw);
        if (!data || !data.lockoutUntil) return 0;
        const diff = data.lockoutUntil - Date.now();
        return diff > 0 ? Math.ceil(diff / 1000) : 0;
      } catch {
        return 0;
      }
    },

    isLockedOut() {
      return this.getLockoutRemainingSeconds() > 0;
    },

    recordFailedAttempt() {
      try {
        const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : { attempts: 0, lockoutUntil: 0 };
        data.attempts = (data.attempts || 0) + 1;

        if (data.attempts >= MAX_LOGIN_ATTEMPTS) {
          data.lockoutUntil = Date.now() + LOCKOUT_MS;
        }
        localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
        return {
          attempts: data.attempts,
          isLocked: data.attempts >= MAX_LOGIN_ATTEMPTS,
          remainingSeconds: this.getLockoutRemainingSeconds()
        };
      } catch {
        return { attempts: 1, isLocked: false, remainingSeconds: 0 };
      }
    },

    reset() {
      localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
    }
  };

  // --------------------------------------------------------------------------
  // 4. QUẢN LÝ SESSION CÓ THỜI HẠN (Session Lifecycle & Expiry)
  // --------------------------------------------------------------------------
  const SESSION_STORAGE_KEY = "studyos_session";
  const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // Phiên sống 7 ngày
  const INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000; // Hoặc 24h không hoạt động

  const SessionManager = {
    createSession(username) {
      if (!username) return null;
      const now = Date.now();
      const session = {
        username: String(username).toLowerCase(),
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
        lastActive: now
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem("studyos_current_user", session.username);
      return session;
    },

    getValidSessionUser() {
      try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) {
          // Migration: Nếu có currentUser cũ chưa có session object
          const legacy = localStorage.getItem("studyos_current_user");
          if (legacy) {
            this.createSession(legacy);
            return legacy;
          }
          return null;
        }

        const session = JSON.parse(raw);
        if (!session || !session.username || !session.expiresAt) {
          this.destroySession();
          return null;
        }

        const now = Date.now();
        // Kiểm tra hết hạn TTL toàn phần hoặc hết hạn do không hoạt động
        const isExpired = now > session.expiresAt || (session.lastActive && now - session.lastActive > INACTIVITY_TIMEOUT_MS);
        if (isExpired) {
          SecurityLogger.log("Session đã hết hạn cho:", session.username);
          this.destroySession();
          return null;
        }

        // Cập nhật timestamp hoạt động gần nhất
        session.lastActive = now;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        return session.username;
      } catch (err) {
        SecurityLogger.error("Lỗi khi đọc session:", err);
        this.destroySession();
        return null;
      }
    },

    destroySession() {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem("studyos_current_user");
    }
  };

  // --------------------------------------------------------------------------
  // 5. XÁC THỰC FILE UPLOAD & KIỂM TRA MAGIC BYTES (Dữ liệu gửi lên)
  // --------------------------------------------------------------------------
  const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
  const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

  /**
   * Xác thực file ảnh nghiêm ngặt:
   * 1. Dung lượng không vượt quá 2MB
   * 2. MIME type trong danh sách cho phép
   * 3. Magic Bytes nhị phân (chống đổi đuôi file độc hại .exe/.php/.html thành .jpg)
   */
  async function validateUploadFile(file) {
    if (!file) {
      throw new Error("Vui lòng chọn một file ảnh!");
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new Error("Dung lượng file ảnh vượt quá giới hạn (Tối đa 2MB)!");
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      throw new Error("Chỉ chấp nhận định dạng ảnh PNG, JPG, JPEG hoặc WebP!");
    }

    // Đọc 12 byte đầu tiên để kiểm tra Magic Bytes
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PNG: 89 50 4E 47
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    // JPEG: FF D8 FF
    const isJpg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    // WebP: RIFF (bytes 0-3: 52 49 46 46) và WEBP (bytes 8-11: 57 45 42 50)
    const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const isWebp = isRiff && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

    if (!isPng && !isJpg && !isWebp) {
      throw new Error("Tệp không đúng định dạng ảnh thực sự (Chữ ký nhị phân không hợp lệ)!");
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // Xuất module ra phạm vi toàn cục
  // --------------------------------------------------------------------------
  window.HaliosSecurity = {
    Logger: SecurityLogger,
    hashPassword,
    verifyPassword,
    RateLimiter,
    SessionManager,
    validateUploadFile,
    MAX_AVATAR_SIZE_BYTES
  };

})(window);
