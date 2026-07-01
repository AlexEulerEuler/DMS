const state = {
  sessions: [],
  activeSessionId: null,
  activeSession: null,
  evidence: [],
  config: null,
};

const elements = {
  sessionList: document.getElementById("session-list"),
  sessionCount: document.getElementById("session-count"),
  newSession: document.getElementById("new-session"),
  activeTitle: document.getElementById("active-title"),
  saveStatus: document.getElementById("save-status"),
  messages: document.getElementById("messages"),
  form: document.getElementById("chat-form"),
  input: document.getElementById("message-input"),
  sendButton: document.getElementById("send-button"),
  evidenceList: document.getElementById("evidence-list"),
  indexStatus: document.getElementById("index-status"),
  modeSelect: document.getElementById("mode-select"),
  categorySelect: document.getElementById("category-select"),
  topK: document.getElementById("top-k"),
  patientSelect: document.getElementById("patient-select"),
  buildHubIndex: document.getElementById("build-hub-index"),
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) {
    const message = payload.error?.message || "Request failed";
    throw new Error(message);
  }
  return payload;
}

function setStatus(text) {
  elements.saveStatus.textContent = text;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function renderSessions() {
  elements.sessionCount.textContent = `${state.sessions.length} sessions`;
  elements.sessionList.innerHTML = "";
  if (!state.sessions.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "저장된 대화가 없습니다.";
    elements.sessionList.appendChild(empty);
    return;
  }

  for (const session of state.sessions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "session-item";
    if (session.session_id === state.activeSessionId) {
      button.classList.add("active");
    }
    button.innerHTML = `
      <span class="session-title"></span>
      <span class="session-meta"></span>
    `;
    button.querySelector(".session-title").textContent = session.title;
    button.querySelector(".session-meta").textContent =
      `${session.message_count} messages - ${formatDate(session.updated_at)}`;
    button.addEventListener("click", () => loadSession(session.session_id));
    elements.sessionList.appendChild(button);
  }
}

function renderMessages() {
  elements.messages.innerHTML = "";
  const session = state.activeSession;
  elements.activeTitle.textContent = session?.title || "New analysis";

  if (!session || !session.messages.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "새 질문을 입력하세요.";
    elements.messages.appendChild(empty);
    return;
  }

  for (const message of session.messages) {
    const item = document.createElement("article");
    item.className = `message ${message.role}`;
    const role = document.createElement("span");
    role.className = "message-role";
    role.textContent = message.role;
    const content = document.createElement("div");
    content.textContent = message.content;
    item.append(role, content);
    elements.messages.appendChild(item);
  }
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function renderEvidence() {
  elements.evidenceList.innerHTML = "";
  if (!state.evidence.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "근거가 아직 없습니다.";
    elements.evidenceList.appendChild(empty);
    return;
  }

  for (const item of state.evidence) {
    const metadata = item.metadata || {};
    const node = document.createElement("section");
    node.className = "evidence-item";
    node.innerHTML = `
      <strong></strong>
      <code></code>
      <div class="evidence-text"></div>
    `;
    node.querySelector("strong").textContent =
      `[${item.rank}] ${metadata.category || ""} / score ${item.score}`;
    node.querySelector("code").textContent =
      `${metadata.source_path || ""} ${metadata.locator || ""}`;
    node.querySelector(".evidence-text").textContent = item.text || "";
    elements.evidenceList.appendChild(node);
  }
}

async function refreshSessions() {
  const payload = await api("/api/sessions");
  state.sessions = payload.sessions;
  renderSessions();
}

async function loadSession(sessionId) {
  setStatus("loading");
  const payload = await api(`/api/sessions/${sessionId}`);
  state.activeSessionId = sessionId;
  state.activeSession = payload.session;
  const lastAssistant = [...payload.session.messages]
    .reverse()
    .find((message) => message.role === "assistant");
  state.evidence = lastAssistant?.metadata?.evidence || [];
  renderSessions();
  renderMessages();
  renderEvidence();
  setStatus("loaded");
}

async function createSession() {
  setStatus("saving");
  const payload = await api("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ title: "New analysis" }),
  });
  state.activeSessionId = payload.session.session_id;
  state.activeSession = payload.session;
  state.evidence = [];
  await refreshSessions();
  renderMessages();
  renderEvidence();
  setStatus("saved");
}

async function sendMessage(event) {
  event.preventDefault();
  const message = elements.input.value.trim();
  if (!message) return;

  elements.input.value = "";
  elements.sendButton.disabled = true;
  setStatus("saving");

  try {
    const payload = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        session_id: state.activeSessionId,
        message,
        mode: elements.modeSelect.value,
        category: elements.categorySelect.value,
        top_k: Number(elements.topK.value || 5),
      }),
    });
    state.activeSessionId = payload.session.session_id;
    state.activeSession = payload.session;
    state.evidence = payload.evidence || [];
    await refreshSessions();
    renderMessages();
    renderEvidence();
    setStatus("saved");
  } catch (error) {
    const node = document.createElement("div");
    node.className = "error-state";
    node.textContent = error.message;
    elements.messages.appendChild(node);
    setStatus("error");
  } finally {
    elements.sendButton.disabled = false;
    elements.input.focus();
  }
}

async function buildHubIndex() {
  elements.buildHubIndex.disabled = true;
  setStatus("building HUB index");
  try {
    const payload = await api("/api/hub/build-index", {
      method: "POST",
      body: JSON.stringify({ patient_seq: elements.patientSelect.value }),
    });
    state.config.index_path = payload.index_path;
    state.config.index_exists = payload.index_exists;
    elements.indexStatus.textContent = `HUB ${payload.patient_seq} ready`;
    state.evidence = [];
    renderEvidence();
    setStatus(`indexed ${payload.chunk_count} chunks`);
  } catch (error) {
    setStatus("HUB error");
    const node = document.createElement("div");
    node.className = "error-state";
    node.textContent = error.message;
    elements.messages.appendChild(node);
  } finally {
    elements.buildHubIndex.disabled = false;
  }
}

async function init() {
  elements.form.addEventListener("submit", sendMessage);
  elements.newSession.addEventListener("click", createSession);
  elements.buildHubIndex.addEventListener("click", buildHubIndex);
  elements.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      elements.form.requestSubmit();
    }
  });

  state.config = await api("/api/config");
  elements.indexStatus.textContent = state.config.index_exists ? "index ready" : "index missing";
  elements.buildHubIndex.disabled = !state.config.hub_configured;
  elements.buildHubIndex.title = state.config.hub_configured
    ? "HUB API로 환자 인덱스 만들기"
    : "DSTAT_HUB_CLIENT_ID / DSTAT_HUB_CLIENT_SECRET 설정이 필요합니다";
  if (Array.isArray(state.config.hub_patients) && state.config.hub_patients.length) {
    elements.patientSelect.innerHTML = "";
    for (const patient of state.config.hub_patients) {
      const option = document.createElement("option");
      option.value = patient;
      option.textContent = patient;
      elements.patientSelect.appendChild(option);
    }
  }
  elements.topK.value = state.config.default_top_k || 5;

  await refreshSessions();
  if (state.sessions.length) {
    await loadSession(state.sessions[0].session_id);
  } else {
    renderMessages();
    renderEvidence();
  }
}

init().catch((error) => {
  elements.messages.innerHTML = "";
  const node = document.createElement("div");
  node.className = "error-state";
  node.textContent = error.message;
  elements.messages.appendChild(node);
});
