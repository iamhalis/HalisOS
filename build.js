/**
 * ============================================================================
 * HALIOS PRODUCTION BUILD SCRIPT (OBFUSCATOR & BUNDLER)
 * ============================================================================
 * Mục đích:
 * 1. Đóng gói 13 files JS thành 1 file duy nhất: js/bundle.min.js
 * 2. Làm rối mã nguồn (Obfuscation):
 *    - Mã hóa chuỗi bằng thuật toán RC4
 *    - Biến đổi tên hàm/biến thành chuỗi hexa (_0x3a4b)
 *    - Xóa toàn bộ comments, whitespace, debug logs
 *    - Bật selfDefending (chống format code trong F12)
 *    - Bật debugProtection (đóng băng / loop debugger nếu cố mở F12)
 *    - Tắt hoàn toàn console (disableConsoleOutput)
 *    - TUYỆT ĐỐI KHÔNG sinh file .map (source map)
 * 3. Chặn phím tắt mở DevTools (F12, Ctrl+Shift+I/J/C, Ctrl+U, chuột phải)
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");

const SOURCE_FILES = [
  "js/security.js",
  "js/core.js",
  "js/license.js",
  "js/dashboard.js",
  "js/tasks.js",
  "js/calendar.js",
  "js/focus.js",
  "js/analytics.js",
  "js/future-messages.js",
  "js/share.js",
  "js/profile.js",
  "js/settings.js",
  "js/main.js"
];

const OUTPUT_BUNDLE_PATH = path.join(__dirname, "js", "bundle.min.js");
const INDEX_HTML_PATH = path.join(__dirname, "index.html");

console.log("🛡️  Đang bắt đầu quá trình Đóng gói & Làm rối mã nguồn (Shield Engine)...");

// 1. Script lá chắn chống F12 và phím tắt Inspect
const ANTI_DEVTOOLS_SHIELD = `
(function() {
  'use strict';
  // Chặn menu chuột phải
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });

  // Chặn phím tắt F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    if (e.ctrlKey && ['U', 'u', 'S', 's'].includes(e.key)) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
  }, true);
})();
`;

// 2. Đọc và gộp toàn bộ các file JS theo đúng thứ tự
let combinedCode = ANTI_DEVTOOLS_SHIELD + "\n";

for (const relPath of SOURCE_FILES) {
  const fullPath = path.join(__dirname, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Không tìm thấy file: ${relPath}`);
    process.exit(1);
  }
  console.log(`  + Nạp: ${relPath}`);
  const content = fs.readFileSync(fullPath, "utf-8");
  combinedCode += `\n/* --- ${path.basename(relPath)} --- */\n` + content + "\n";
}

console.log(`📦 Tổng dung lượng mã nguồn thô: ${(Buffer.byteLength(combinedCode) / 1024).toFixed(2)} KB`);
console.log("⚙️  Đang tiến hành làm rối mã nguồn (Obfuscating)...");

// 3. Cấu hình Obfuscation mức độ cao
const obfuscationResult = JavaScriptObfuscator.obfuscate(combinedCode, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.6,
  deadCodeInjection: false, // Để false để tránh phình dung lượng quá mức và giữ hiệu năng mượt
  debugProtection: true, // Kích hoạt bẫy debugger nếu mở DevTools
  debugProtectionInterval: 2500, // Định kỳ kích hoạt bẫy
  disableConsoleOutput: true, // Vô hiệu hóa console trong production
  identifierNamesGenerator: "hexadecimal", // Đổi tên biến thành _0x1a2b
  log: false,
  numbersToExpressions: true, // Biến số thành biểu thức tính toán
  renameGlobals: false, // Giữ an toàn cho các hàm DOM callbacks
  selfDefending: true, // Chống format / beautify code
  simplify: true,
  splitStrings: true, // Chia nhỏ các chuỗi nhạy cảm
  splitStringsChunkLength: 6,
  stringArray: true, // Mã hóa toàn bộ chuỗi ký tự
  stringArrayCallsTransform: true,
  stringArrayEncoding: ["rc4"], // Thuật toán mã hóa chuỗi RC4
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersType: "variable",
  stringArrayThreshold: 0.8,
  sourceMap: false // KHÔNG sinh source map để tránh lộ mã gốc trong Sources F12
});

const obfuscatedCode = obfuscationResult.getObfuscatedCode();
fs.writeFileSync(OUTPUT_BUNDLE_PATH, obfuscatedCode, "utf-8");
console.log(`✅ Đã tạo file bảo vệ: js/bundle.min.js (${(Buffer.byteLength(obfuscatedCode) / 1024).toFixed(2)} KB)`);

// 4. Cập nhật index.html sang nạp bundle.min.js
let html = fs.readFileSync(INDEX_HTML_PATH, "utf-8");

// Tìm khối script cũ và thay thế bằng script duy nhất bundle.min.js
const scriptPattern = /<!-- Scripts[\s\S]*?<\/body>/i;
const newScriptBlock = `<!-- Scripts (Protected Production Bundle) -->
  <script src="js/bundle.min.js"></script>
</body>`;

if (scriptPattern.test(html)) {
  html = html.replace(scriptPattern, newScriptBlock);
  fs.writeFileSync(INDEX_HTML_PATH, html, "utf-8");
  console.log("✅ Đã cập nhật index.html sang nạp js/bundle.min.js");
} else {
  console.warn("⚠️ Không tìm thấy khối <!-- Scripts --> trong index.html");
}

console.log("🎉 Hoàn tất! Mã nguồn đã được bảo vệ hoàn toàn khỏi F12 Sources.");
