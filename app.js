const STORAGE_KEY = "kxfgpt.savedChats";
const MEMORY_KEY = "kxfgpt.memories";
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";

const state = {
  user: null,
  chatId: null,
  tempMessages: [],
  uploadedImages: [],
};

const els = {
  messages: document.getElementById("chat-messages"),
  chatForm: document.getElementById("chat-form"),
  messageInput: document.getElementById("message-input"),
  imageInput: document.getElementById("image-input"),
  imageFeedback: document.getElementById("image-feedback"),
  recentChats: document.getElementById("recent-chats"),
  recentEmpty: document.getElementById("recent-empty"),
  loginToggle: document.getElementById("login-toggle"),
  temporaryBanner: document.getElementById("temporary-banner"),
  settingsToggle: document.getElementById("settings-toggle"),
  settingsClose: document.getElementById("settings-close"),
  settingsPanel: document.getElementById("settings-panel"),
  memoriesInput: document.getElementById("memories-input"),
  memoriesStatus: document.getElementById("memories-status"),
  saveMemories: document.getElementById("save-memories"),
  exportPdf: document.getElementById("export-pdf"),
  exportDocx: document.getElementById("export-docx"),
  exportXlsx: document.getElementById("export-xlsx"),
};

function init() {
  bindEvents();
  initGoogleAuth();
  renderMessages();
  renderRecentChats();
  refreshModeUI();
}

function bindEvents() {
  els.chatForm.addEventListener("submit", handleSendMessage);
  els.imageInput.addEventListener("change", handleImageSelection);
  els.settingsToggle.addEventListener("click", () => toggleSettings(true));
  els.settingsClose.addEventListener("click", () => toggleSettings(false));
  els.saveMemories.addEventListener("click", saveMemories);
  els.exportPdf.addEventListener("click", exportToPdf);
  els.exportDocx.addEventListener("click", exportToDocx);
  els.exportXlsx.addEventListener("click", exportToExcel);
  els.loginToggle.addEventListener("click", () => {
    document.getElementById("google-auth-slot").scrollIntoView({ behavior: "smooth" });
  });
}

function initGoogleAuth() {
  if (!window.google || GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID") {
    els.loginToggle.textContent = "Configure Google Client ID";
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: onGoogleCredential,
  });

  google.accounts.id.renderButton(document.getElementById("google-signin-button"), {
    theme: "outline",
    size: "large",
    type: "standard",
    text: "signin_with",
    shape: "pill",
  });
}

function onGoogleCredential(response) {
  const payload = parseJwt(response.credential);
  state.user = {
    id: payload.sub,
    name: payload.name || payload.email || "Google User",
  };
  els.loginToggle.textContent = `Signed in: ${state.user.name}`;

  if (state.tempMessages.length > 0) {
    const imported = createNewChat(`Imported temporary chat ${new Date().toLocaleString()}`);
    imported.messages = [...state.tempMessages];
    saveChat(imported);
    state.chatId = imported.id;
    state.tempMessages = [];
  }

  if (!state.chatId) {
    state.chatId = getUserChats()[0]?.id || null;
  }

  loadMemories();
  renderRecentChats();
  refreshModeUI();
  renderMessages();
}

function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

function handleImageSelection() {
  const files = [...els.imageInput.files];
  if (files.length > 5) {
    els.imageFeedback.textContent = "You can upload a maximum of 5 images at a time.";
    els.imageInput.value = "";
    state.uploadedImages = [];
    return;
  }

  state.uploadedImages = files;
  els.imageFeedback.textContent = files.length
    ? `${files.length} image(s) attached.`
    : "";
}

function handleSendMessage(event) {
  event.preventDefault();
  const text = els.messageInput.value.trim();
  if (!text) return;

  const userMessage = {
    role: "user",
    content: text,
    images: state.uploadedImages.map((file) => file.name),
    ts: Date.now(),
  };
  appendMessage(userMessage);

  const assistantMessage = {
    role: "assistant",
    content: generateAssistantReply(text),
    images: [],
    ts: Date.now() + 1,
  };
  appendMessage(assistantMessage);

  els.messageInput.value = "";
  els.imageInput.value = "";
  state.uploadedImages = [];
  els.imageFeedback.textContent = "";
}

function generateAssistantReply(prompt) {
  const memoryNote = (els.memoriesInput.value || "").trim();
  const tonePrefix = memoryNote ? `Using memory: ${memoryNote}. ` : "";
  return `${tonePrefix}I received: "${prompt}"`;
}

function appendMessage(message) {
  if (state.user) {
    const current = getCurrentOrCreateChat();
    current.messages.push(message);
    saveChat(current);
  } else {
    state.tempMessages.push(message);
  }
  renderMessages();
  renderRecentChats();
}

function getCurrentMessages() {
  if (!state.user) return state.tempMessages;
  const chats = getUserChats();
  const chat = chats.find((item) => item.id === state.chatId);
  return chat?.messages || [];
}

function renderMessages() {
  const messages = getCurrentMessages();
  els.messages.innerHTML = "";

  if (!messages.length) {
    els.messages.innerHTML = '<p class="muted">Start a conversation.</p>';
    return;
  }

  for (const msg of messages) {
    const item = document.createElement("article");
    item.className = `message ${msg.role}`;
    const images = msg.images?.length ? `<div class="muted">Images: ${msg.images.join(", ")}</div>` : "";
    item.innerHTML = `
      <div class="message-meta">
        <strong>${msg.role === "user" ? "You" : "KXF GPT"}</strong>
        <button class="copy-btn" type="button">Copy</button>
      </div>
      <div>${escapeHtml(msg.content)}</div>
      ${images}
    `;
    item.querySelector(".copy-btn").addEventListener("click", async () => {
      await navigator.clipboard.writeText(msg.content);
      item.querySelector(".copy-btn").textContent = "Copied";
      setTimeout(() => {
        item.querySelector(".copy-btn").textContent = "Copy";
      }, 1200);
    });
    els.messages.appendChild(item);
  }

  els.messages.scrollTop = els.messages.scrollHeight;
}

function refreshModeUI() {
  const loggedIn = Boolean(state.user);
  els.temporaryBanner.style.display = loggedIn ? "none" : "block";
  els.recentEmpty.style.display = loggedIn ? "none" : "block";
  if (!loggedIn) {
    els.memoriesStatus.textContent = "Sign in to persist memories.";
  }
}

function toggleSettings(show) {
  els.settingsPanel.classList.toggle("hidden", !show);
  els.settingsPanel.setAttribute("aria-hidden", String(!show));
  if (show) loadMemories();
}

function saveMemories() {
  const value = els.memoriesInput.value.trim();
  if (!state.user) {
    els.memoriesStatus.textContent = "Temporary mode: memories are not saved.";
    return;
  }

  const all = JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}");
  all[state.user.id] = value;
  localStorage.setItem(MEMORY_KEY, JSON.stringify(all));
  els.memoriesStatus.textContent = "Memories saved.";
}

function loadMemories() {
  if (!state.user) {
    els.memoriesInput.value = "";
    return;
  }
  const all = JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}");
  els.memoriesInput.value = all[state.user.id] || "";
}

function createNewChat(title) {
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: Date.now(),
    messages: [],
  };
}

function getCurrentOrCreateChat() {
  const chats = getUserChats();
  let current = chats.find((chat) => chat.id === state.chatId);
  if (current) return current;

  current = createNewChat(`Chat ${new Date().toLocaleTimeString()}`);
  chats.unshift(current);
  state.chatId = current.id;
  setUserChats(chats);
  return current;
}

function getUserChats() {
  if (!state.user) return [];
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  return all[state.user.id] || [];
}

function setUserChats(chats) {
  if (!state.user) return;
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  all[state.user.id] = chats;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function saveChat(chat) {
  const chats = getUserChats().filter((item) => item.id !== chat.id);
  chats.unshift(chat);
  setUserChats(chats);
}

function renderRecentChats() {
  els.recentChats.innerHTML = "";
  if (!state.user) return;

  const chats = getUserChats();
  if (!chats.length) {
    els.recentEmpty.style.display = "block";
    els.recentEmpty.textContent = "No saved chats yet.";
    return;
  }
  els.recentEmpty.style.display = "none";

  chats.slice(0, 10).forEach((chat) => {
    const li = document.createElement("li");
    li.innerHTML = `<button type="button" class="recent-btn">${escapeHtml(chat.title)}</button>`;
    li.querySelector("button").addEventListener("click", () => {
      state.chatId = chat.id;
      renderMessages();
    });
    els.recentChats.appendChild(li);
  });
}

function buildConversationLines() {
  const messages = getCurrentMessages();
  return messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`);
}

function exportToPdf() {
  const lines = buildConversationLines();
  if (!lines.length) return;
  const pdfBlob = buildBasicPdf(lines);
  downloadBlob(pdfBlob, "kxfgpt-conversation.pdf");
}

function exportToDocx() {
  const lines = buildConversationLines();
  if (!lines.length) return;
  const body = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const html = `<!doctype html><html><body>${body}</body></html>`;
  const blob = new Blob([html], { type: "application/msword" });
  downloadBlob(blob, "kxfgpt-conversation.doc");
}

function exportToExcel() {
  const messages = getCurrentMessages();
  if (!messages.length) return;
  const csvHeader = "Role,Content,Timestamp\n";
  const csvBody = messages
    .map((m) => [m.role, m.content, new Date(m.ts).toISOString()].map(csvEscape).join(","))
    .join("\n");
  const blob = new Blob([csvHeader + csvBody], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, "kxfgpt-conversation.csv");
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function csvEscape(value) {
  const str = String(value).replaceAll("\"", "\"\"");
  return `"${str}"`;
}

function buildBasicPdf(lines) {
  const safeLines = lines.map((line) => line.replace(/[^\x20-\x7E]/g, "?"));
  const contentLines = [
    "BT",
    "/F1 12 Tf",
    "40 800 Td",
    ...safeLines.map((line, index) =>
      `${pdfEscape(line)} Tj${index < safeLines.length - 1 ? " T*" : ""}`
    ),
    "ET",
  ];
  const stream = contentLines.join("\n");
  const objects = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");
  objects.push(
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj"
  );
  objects.push("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
  objects.push(`5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function pdfEscape(text) {
  return `(${text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)")})`;
}

init();
