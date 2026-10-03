// =========================================================================
// 7. FUTURE-MESSAGES.JS — NIÊM PHONG CÁ NHÂN & GỬI THƯ CHO NGƯỜI DÙNG KHÁC
// =========================================================================
let activeSocialBox = "inbox";

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

  if (!cleanUsernameQuery) {
    dropdownEl.innerHTML = "";
    dropdownEl.classList.add("hidden");
    return;
  }

  const allUserList = Object.values(users).filter(u => u && u.username);

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
      info.innerHTML = `
        <span class="suggestion-name">${u.email} ${isSelf ? "(Bạn)" : ""}</span>
        <span class="suggestion-email">Nhấn để chọn người nhận qua Email</span>
      `;
    } else {
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

function initFutureMessagesFeature() {
  const defaultCapsuleISO = toInputDateStr(config.target_date) || "2027-06-21";
  document.getElementById("fm-date").value = defaultCapsuleISO;
  document.getElementById("fm-date-display").value = formatDisplayDate(defaultCapsuleISO);
  document.getElementById("ul-date").value = defaultCapsuleISO;
  document.getElementById("ul-date-display").value = formatDisplayDate(defaultCapsuleISO);

  bindCustomDateInput("fm-date-display", "fm-date", "fm-date-trigger");
  bindCustomDateInput("ul-date-display", "ul-date", "ul-date-trigger");

  document.getElementById("close-letter-modal-btn").addEventListener("click", closeLetterModal);
  document.getElementById("close-letter-footer-btn").addEventListener("click", closeLetterModal);
  document.getElementById("letter-modal-overlay").addEventListener("click", e => {
    if (e.target.id === "letter-modal-overlay") closeLetterModal();
  });

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
}