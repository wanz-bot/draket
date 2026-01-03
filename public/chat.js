/**
 * chat.js – Frontend controller
 * Compatible with Cloudflare Workers AI
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
    // Placeholder AI message
    const aiMessageEl = document.createElement("div");
    aiMessageEl.className = "message assistant-message";
    aiMessageEl.innerHTML = "<div class='content'></div>";
    chatMessages.appendChild(aiMessageEl);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 🔁 REQUEST KE BACKEND AI (Cloudflare Worker)
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
    });

    if (!res.ok) throw new Error("AI response failed");

    const data = await res.json();
    const aiText = data.response || data.message || "";

    aiMessageEl.querySelector(".content").innerHTML =
      formatMessage(aiText);

    chatHistory.push({ role: "assistant", content: aiText });
  } catch (err) {
    addMessage("assistant", "Terjadi kesalahan saat memproses AI.");
    console.error(err);
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
   FORMAT MESSAGE
   - Auto detect ```code```
   - COPY button only for code
   ========================= */
function formatMessage(text) {
  // Code blocks
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
   COPY HANDLER
   ========================= */
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("copy-btn")) {
    const code = e.target.nextElementSibling.innerText;
    navigator.clipboard.writeText(code);
    e.target.textContent = "COPIED";
    setTimeout(() => (e.target.textContent = "COPY"), 1200);
  }
});
