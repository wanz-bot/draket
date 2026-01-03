/**
 * chat.js – Frontend controller (FIXED)
 * Cloudflare Workers AI compatible
 */

// DOM
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

// State
let isProcessing = false;
let chatHistory = [];

/* =========================
   INPUT HANDLING
   ========================= */
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = userInput.scrollHeight + "px";
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendButton.addEventListener("click", sendMessage);

/* =========================
   SEND MESSAGE
   ========================= */
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message || isProcessing) return;

  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;

  addMessage("user", message);
  chatHistory.push({ role: "user", content: message });

  userInput.value = "";
  userInput.style.height = "auto";
  typingIndicator.classList.add("visible");

  try {
    // AI message container
    const aiMessageEl = document.createElement("div");
    aiMessageEl.className = "message assistant-message";
    aiMessageEl.innerHTML = `<div class="content"></div>`;
    chatMessages.appendChild(aiMessageEl);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Request ke backend
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
    });

    if (!res.ok) throw new Error("AI response failed");

    const data = await res.json();
    const fullText = data.response || data.message || "";

    // 🧠 TYPING EFFECT
    await typeText(aiMessageEl.querySelector(".content"), fullText);

    chatHistory.push({ role: "assistant", content: fullText });
  } catch (err) {
    console.error(err);
    addMessage("assistant", "Terjadi kesalahan saat memproses AI.");
  } finally {
    typingIndicator.classList.remove("visible");
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

/* =========================
   ADD MESSAGE
   ========================= */
function addMessage(role, text) {
  const el = document.createElement("div");
  el.className = `message ${role}-message`;
  el.innerHTML = formatMessage(text);
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* =========================
   TYPING EFFECT
   ========================= */
async function typeText(container, text) {
  let i = 0;
  let buffer = "";

  while (i < text.length) {
    buffer += text[i];
    container.innerHTML = formatMessage(buffer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    i++;
    await sleep(12); // speed typing
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* =========================
   FORMAT MESSAGE
   ========================= */
function formatMessage(text) {
  text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `
<pre class="code-block">
<button class="copy-btn">COPY</button>
<code>${escapeHTML(code)}</code>
</pre>`;
  });

  return text.replace(/\n/g, "<br>");
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* =========================
   COPY HANDLER (ROBUST + FALLBACK)
   ========================= */
document.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("copy-btn")) return;

  const code = e.target
    .closest(".code-block")
    .querySelector("code")
    .innerText;

  try {
    await navigator.clipboard.writeText(code);
  } catch {
    // Fallback (HTTP / file://)
    const textarea = document.createElement("textarea");
    textarea.value = code;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  e.target.textContent = "COPIED";
  setTimeout(() => (e.target.textContent = "COPY"), 1200);
});
