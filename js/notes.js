/**
 * ============================================================================
 * HALIOS NOTES & SCRATCHPAD MODULE (GHI CHÚ & GIẤY NHÁP KÍNH MỜ)
 * ============================================================================
 * - Giao diện giấy nháp hiệu ứng blur, chữ to rõ nét, tương phản cao
 * - Tự động lưu tức thì (Auto-save) khi người dùng gõ
 * - Quản lý nhiều ghi chú / nháp bài học, tìm kiếm, sao chép và tải file txt
 * ============================================================================
 */

let activeNoteId = null;
let noteSearchQuery = "";
let noteSaveTimeout = null;

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getActiveNote() {
  if (!Array.isArray(notes) || notes.length === 0) {
    notes = [
      {
        id: "note_" + Date.now(),
        title: "Ghi chú & Giấy nháp 1",
        content: "",
        updatedAt: Date.now()
      }
    ];
    activeNoteId = notes[0].id;
    saveStorage();
  }

  if (!activeNoteId) {
    activeNoteId = notes[0].id;
  }

  let found = notes.find(n => n.id === activeNoteId);
  if (!found) {
    found = notes[0];
    activeNoteId = found.id;
  }
  return found;
}

function formatNoteDate(ts) {
  if (!ts) return "Vừa xong";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "Vừa xong";
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (isToday) {
    return `Hôm nay ${hh}:${mm}`;
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month} ${hh}:${mm}`;
}

function updateNoteStats(content) {
  const text = (content || "").trim();
  const charCount = text.length;
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

  const statsEl = document.getElementById("scratchpad-stats-display");
  if (statsEl) {
    statsEl.textContent = `${wordCount} từ • ${charCount} ký tự`;
  }
}

function setSaveStatus(status) {
  const statusEl = document.getElementById("scratchpad-save-status");
  if (!statusEl) return;

  if (status === "saving") {
    statusEl.innerHTML = `<span class="save-indicator saving"></span> Đang lưu...`;
  } else {
    statusEl.innerHTML = `<span class="save-indicator saved"></span> Đã lưu`;
  }
}

function renderNotesList() {
  const listEl = document.getElementById("notes-items-list");
  const countEl = document.getElementById("notes-total-count");
  if (!listEl) return;

  if (countEl) countEl.textContent = notes.length;

  const query = (noteSearchQuery || "").toLowerCase().trim();
  const filtered = notes.filter(n => {
    if (!query) return true;
    const titleMatch = (n.title || "").toLowerCase().includes(query);
    const contentMatch = (n.content || "").toLowerCase().includes(query);
    return titleMatch || contentMatch;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="notes-empty-state">
        <span class="notes-empty-icon">📝</span>
        <p>Không tìm thấy ghi chú nào phù hợp</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = "";
  filtered.forEach(note => {
    const item = document.createElement("div");
    item.className = `note-item-card ${note.id === activeNoteId ? "active" : ""}`;
    item.dataset.id = note.id;

    const displayTitle = (note.title || "").trim() || "Ghi chú không tên";
    const snippet = (note.content || "").trim() || "Chưa có nội dung...";
    const timeStr = formatNoteDate(note.updatedAt);

    item.innerHTML = `
      <div class="note-item-header">
        <h4 class="note-item-title">${escapeHTML(displayTitle)}</h4>
        <span class="note-item-time">${timeStr}</span>
      </div>
      <p class="note-item-snippet">${escapeHTML(snippet)}</p>
    `;

    item.addEventListener("click", () => {
      if (activeNoteId !== note.id) {
        activeNoteId = note.id;
        renderNotesTab();
      }
    });

    listEl.appendChild(item);
  });
}

function renderNotesTab() {
  const activeNote = getActiveNote();
  renderNotesList();

  const titleInput = document.getElementById("active-note-title");
  const contentInput = document.getElementById("active-note-content");
  const timeEl = document.getElementById("scratchpad-time-display");

  if (titleInput && titleInput.value !== activeNote.title) {
    titleInput.value = activeNote.title || "";
  }
  if (contentInput && contentInput.value !== activeNote.content) {
    contentInput.value = activeNote.content || "";
  }

  if (timeEl) {
    timeEl.textContent = `Cập nhật: ${formatNoteDate(activeNote.updatedAt)}`;
  }

  updateNoteStats(activeNote.content || "");
  setSaveStatus("saved");
}

function updateActiveNoteItemInSidebar(activeNote) {
  const item = document.querySelector(`.note-item-card[data-id="${activeNote.id}"]`);
  if (!item) return;

  const titleEl = item.querySelector(".note-item-title");
  const snippetEl = item.querySelector(".note-item-snippet");
  const timeEl = item.querySelector(".note-item-time");

  const displayTitle = (activeNote.title || "").trim() || "Ghi chú không tên";
  const snippet = (activeNote.content || "").trim() || "Chưa có nội dung...";

  if (titleEl) titleEl.textContent = displayTitle;
  if (snippetEl) snippetEl.textContent = snippet;
  if (timeEl) timeEl.textContent = formatNoteDate(activeNote.updatedAt);
}

function handleNoteInput() {
  const activeNote = getActiveNote();
  const titleInput = document.getElementById("active-note-title");
  const contentInput = document.getElementById("active-note-content");

  if (!titleInput || !contentInput) return;

  activeNote.title = titleInput.value;
  activeNote.content = contentInput.value;
  activeNote.updatedAt = Date.now();

  updateNoteStats(activeNote.content);
  setSaveStatus("saving");
  updateActiveNoteItemInSidebar(activeNote);

  const timeEl = document.getElementById("scratchpad-time-display");
  if (timeEl) timeEl.textContent = `Cập nhật: Vừa xong`;

  clearTimeout(noteSaveTimeout);
  noteSaveTimeout = setTimeout(() => {
    saveStorage();
    setSaveStatus("saved");
  }, 250);
}

function addNewNote() {
  const newId = "note_" + Date.now();
  const newNum = notes.length + 1;
  const newNote = {
    id: newId,
    title: `Ghi chú nháp ${newNum}`,
    content: "",
    updatedAt: Date.now()
  };

  notes.unshift(newNote);
  activeNoteId = newId;
  saveStorage();
  renderNotesTab();

  const contentInput = document.getElementById("active-note-content");
  if (contentInput) contentInput.focus();

  if (typeof showToast === "function") {
    showToast("Đã tạo tờ giấy nháp mới!");
  }
}

function deleteCurrentNote() {
  if (notes.length <= 1) {
    if (confirm("Ghi chú này sẽ được làm trống nội dung về trang nháp trắng. Bạn có chắc không?")) {
      const active = getActiveNote();
      active.title = "Ghi chú & Giấy nháp 1";
      active.content = "";
      active.updatedAt = Date.now();
      saveStorage();
      renderNotesTab();
      if (typeof showToast === "function") showToast("Đã làm trống tờ giấy nháp!");
    }
    return;
  }

  if (confirm("Bạn có chắc chắn muốn xóa vĩnh viễn ghi chú này không?")) {
    const idx = notes.findIndex(n => n.id === activeNoteId);
    if (idx !== -1) {
      notes.splice(idx, 1);
      activeNoteId = notes[0] ? notes[0].id : null;
      saveStorage();
      renderNotesTab();
      if (typeof showToast === "function") showToast("Đã xóa ghi chú thành công!");
    }
  }
}

function copyCurrentNote() {
  const active = getActiveNote();
  const fullText = `${active.title || "Ghi chú"}\n\n${active.content || ""}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullText).then(() => {
      if (typeof showToast === "function") showToast("Đã sao chép toàn bộ nội dung nháp!");
    }).catch(() => {
      fallbackCopy(fullText);
    });
  } else {
    fallbackCopy(fullText);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  if (typeof showToast === "function") showToast("Đã sao chép toàn bộ nội dung nháp!");
}

function downloadCurrentNote() {
  const active = getActiveNote();
  const fileName = ((active.title || "ghi-chu-nhap").trim().replace(/[/\\?%*:|"<>]/g, "_")) + ".txt";
  const fullText = `${active.title || "Ghi chú"}\n(Tạo từ Halios Study OS - ${formatNoteDate(active.updatedAt)})\n----------------------------------------\n\n${active.content || ""}`;

  const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);

  if (typeof showToast === "function") showToast(`Đã tải xuống ${fileName}!`);
}

function initNotesFeature() {
  const addBtn = document.getElementById("add-new-note-btn");
  if (addBtn) addBtn.addEventListener("click", addNewNote);

  const searchInput = document.getElementById("note-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      noteSearchQuery = e.target.value;
      renderNotesList();
    });
  }

  const titleInput = document.getElementById("active-note-title");
  if (titleInput) {
    titleInput.addEventListener("input", handleNoteInput);
  }

  const contentInput = document.getElementById("active-note-content");
  if (contentInput) {
    contentInput.addEventListener("input", handleNoteInput);
  }

  const copyBtn = document.getElementById("copy-note-btn");
  if (copyBtn) copyBtn.addEventListener("click", copyCurrentNote);

  const downloadBtn = document.getElementById("download-note-btn");
  if (downloadBtn) downloadBtn.addEventListener("click", downloadCurrentNote);

  const deleteBtn = document.getElementById("delete-note-btn");
  if (deleteBtn) deleteBtn.addEventListener("click", deleteCurrentNote);

  renderNotesTab();
}
