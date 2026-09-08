(function installResearcherDataset(globalObject, documentObject) {
  "use strict";

  const STORAGE_PREFIX = "who-will-help-data:";
  const LAST_SESSION_KEY = `${STORAGE_PREFIX}last-session`;
  const DATABASE_NAME = "find-the-caregiver-researcher-data";
  const DATABASE_VERSION = 1;
  const SESSION_STORE = "sessions";
  const PREVIEW_ROW_LIMIT = 250;
  const PREFERRED_HEADERS = Object.freeze([
    "dataset_logical_session",
    "dataset_row_ordinal",
    "dataset_checkpointed_at",
    "exported_at",
    "participant_id",
    "study_id",
    "session_id",
    "seed",
    "completion_status",
    "assigned_role_set",
    "assigned_event_suffix",
    "assigned_context",
    "study_version",
    "assignment_cell",
    "assigned_rating_mode",
    "assigned_part_order",
    "slide_kind",
    "story_number",
    "condition_pairing",
    "trait",
    "choice_label",
    "rating_value",
    "rating_label",
    "response",
    "response_time_ms",
    "response_missing",
  ]);

  function safeText(value) {
    return value == null ? "" : String(value);
  }

  function savedAtForPayload(payload) {
    return safeText(payload?.saved_at || payload?.completed_at || payload?.browser_dataset_saved_at || "");
  }

  function timestampValue(value) {
    const timestamp = Date.parse(safeText(value));
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function sessionStatus(payload) {
    if (payload?.completion_status === "completed") return "Completed";
    if (payload?.completion_status === "ended_by_researcher" || payload?.facilitator_ended_early) return "Ended early";
    return "In progress";
  }

  function readSessions(storage = globalObject.localStorage) {
    const sessions = [];
    if (!storage || !Number.isFinite(Number(storage.length))) return sessions;
    for (let index = 0; index < storage.length; index += 1) {
      let key = "";
      try {
        key = safeText(storage.key(index));
      } catch (_error) {
        continue;
      }
      if (!key.startsWith(STORAGE_PREFIX) || key === LAST_SESSION_KEY) continue;
      try {
        const payload = JSON.parse(storage.getItem(key) || "null");
        if (!payload || typeof payload !== "object" || !Array.isArray(payload.rows)) continue;
        const sessionId = safeText(payload.session_id || key.slice(STORAGE_PREFIX.length));
        sessions.push({
          key,
          sessionId,
          participantId: safeText(payload.participant_id || "Unlabelled participant"),
          savedAt: savedAtForPayload(payload),
          status: sessionStatus(payload),
          rowCount: payload.rows.length,
          payload,
        });
      } catch (_error) {
        // A damaged or unrelated browser-storage entry should not block the remaining sessions.
      }
    }
    return sessions.sort((left, right) =>
      timestampValue(right.savedAt) - timestampValue(left.savedAt)
      || right.sessionId.localeCompare(left.sessionId)
    );
  }

  function sessionRecord(payload, key = "") {
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.rows)) return null;
    const sessionId = safeText(payload.session_id || key.replace(STORAGE_PREFIX, ""));
    if (!sessionId) return null;
    return {
      key: key || `${STORAGE_PREFIX}${sessionId}`,
      sessionId,
      participantId: safeText(payload.participant_id || "Unlabelled participant"),
      savedAt: savedAtForPayload(payload),
      status: sessionStatus(payload),
      rowCount: payload.rows.length,
      payload,
    };
  }

  function openDatabase(indexedDb = globalObject.indexedDB) {
    return new Promise((resolve, reject) => {
      if (!indexedDb || typeof indexedDb.open !== "function") {
        reject(new Error("Browser dataset storage is unavailable"));
        return;
      }
      const request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION);
      request.addEventListener("upgradeneeded", () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(SESSION_STORE)) {
          database.createObjectStore(SESSION_STORE, { keyPath: "session_id" });
        }
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error || new Error("Could not open browser dataset")));
      request.addEventListener("blocked", () => reject(new Error("Browser dataset upgrade was blocked")));
    });
  }

  async function readIndexedSessions(indexedDb = globalObject.indexedDB) {
    const database = await openDatabase(indexedDb);
    try {
      const payloads = await new Promise((resolve, reject) => {
        const transaction = database.transaction(SESSION_STORE, "readonly");
        const request = transaction.objectStore(SESSION_STORE).getAll();
        request.addEventListener("success", () => resolve(request.result || []));
        request.addEventListener("error", () => reject(request.error || new Error("Could not read browser dataset")));
        transaction.addEventListener("abort", () => reject(transaction.error || new Error("Browser dataset read was interrupted")));
      });
      return payloads.map((payload) => sessionRecord(payload)).filter(Boolean);
    } finally {
      database.close();
    }
  }

  function mergeSessions(...collections) {
    const merged = new Map();
    collections.flat().forEach((session) => {
      if (!session?.sessionId) return;
      const prior = merged.get(session.sessionId);
      const sessionIsNewer = !prior
        || timestampValue(session.savedAt) > timestampValue(prior.savedAt)
        || (timestampValue(session.savedAt) === timestampValue(prior.savedAt)
          && session.rowCount >= prior.rowCount);
      if (sessionIsNewer) merged.set(session.sessionId, session);
    });
    return Array.from(merged.values()).sort((left, right) =>
      timestampValue(right.savedAt) - timestampValue(left.savedAt)
      || right.sessionId.localeCompare(left.sessionId)
    );
  }

  async function readAllSessions() {
    const localSessions = readSessions();
    const indexedSessions = await readIndexedSessions().catch(() => []);
    return mergeSessions(localSessions, indexedSessions);
  }

  function flattenRow(row, payload, rowOrdinal = 0) {
    const checkpointedAt = savedAtForPayload(payload);
    return {
      ...row,
      dataset_logical_session: payload.facilitator_session || payload.session_id || "",
      dataset_row_ordinal: rowOrdinal,
      dataset_checkpointed_at: checkpointedAt,
      exported_at: payload.completed_at || checkpointedAt,
      participant_id: payload.participant_id,
      prolific_pid: payload.prolific_pid,
      study_id: payload.study_id,
      session_id: payload.session_id,
      chs_child_id: payload.chs_child_id,
      chs_response_id: payload.chs_response_id,
      seed: payload.seed,
      assigned_event_suffix: payload.event_suffix,
      assigned_role_set: payload.role_set,
      assigned_context: payload.assigned_context,
      study_version: payload.study_version,
      context_script_version: payload.context_script_version,
      assignment_cell: payload.assignment_cell,
      assignment_cell_schema: payload.assignment_cell_schema,
      assignment_method: payload.assignment_method,
      assignment_key_type: payload.assignment_key_type,
      audio_playback_or_load_failure_count: payload.audio_playback_or_load_failure_count,
      assigned_rating_mode: payload.rating_mode,
      assigned_part_order: payload.part_order,
      assigned_design_version: payload.design_version,
      assigned_relationship_status: payload.relationship_status,
      completion_status: payload.completion_status || "in_progress",
      facilitator_ended_early: Boolean(payload.facilitator_ended_early),
      live_share_mode: Boolean(payload.live_share_mode),
      parent_setup_skipped: Boolean(payload.parent_setup_skipped),
      export_format: payload.export_format || "csv",
      facilitator_restored_row_count: payload.facilitator_restored_row_count || 0,
      audio_version: payload.audio_version,
    };
  }

  function combinedRows(sessions) {
    return [...sessions]
      .sort((left, right) =>
        timestampValue(left.savedAt) - timestampValue(right.savedAt)
        || left.sessionId.localeCompare(right.sessionId)
      )
      .flatMap((session) => session.payload.rows.map((row, index) =>
        flattenRow(row, session.payload, index)
      ));
  }

  function datasetSummary(sessions) {
    return {
      sessionCount: sessions.length,
      rowCount: sessions.reduce((total, session) => total + session.rowCount, 0),
      completedCount: sessions.filter((session) => session.status === "Completed").length,
      inProgressCount: sessions.filter((session) => session.status === "In progress").length,
      lastSavedAt: sessions[0]?.savedAt || "",
    };
  }

  function csvEscape(value) {
    if (value == null) return "";
    const rawText = typeof value === "object" ? JSON.stringify(value) : String(value);
    const text = typeof value === "string" && /^[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function rowsToCsv(rows) {
    if (!rows.length) return "";
    const discovered = rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set());
    const preferred = PREFERRED_HEADERS.filter((header) => discovered.delete(header));
    const headers = [...preferred, ...Array.from(discovered).sort()];
    return [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
    ].join("\r\n");
  }

  function assignmentLabel(payload) {
    return [payload?.role_set, payload?.event_suffix, payload?.assigned_context]
      .map((value) => safeText(value).replaceAll("_", " "))
      .filter(Boolean)
      .join(" · ") || "Assignment pending";
  }

  function humanize(value) {
    const text = safeText(value).replaceAll("_", " ").replaceAll("-", "–").trim();
    return text ? text.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "";
  }

  function stepLabel(row) {
    const pieces = [];
    if (row.story_number != null && row.story_number !== "") pieces.push(`Story ${row.story_number}`);
    if (row.condition_pairing || row.condition) pieces.push(humanize(row.condition_pairing || row.condition));
    if (row.trait) pieces.push(humanize(row.trait));
    if (!pieces.length && row.slide_kind) pieces.push(humanize(row.slide_kind));
    return pieces.join(" · ") || "Study screen";
  }

  function responseLabel(row) {
    if (row.researcher_skip) return "Skipped";
    if (row.response_missing) return "Missing response";
    if (row.choice_label) return safeText(row.choice_label);
    if (row.rating_label) {
      return row.rating_value == null
        ? safeText(row.rating_label)
        : `${row.rating_label} (${row.rating_value})`;
    }
    if (row.story_choice_label) return safeText(row.story_choice_label);
    if (row.response != null && row.response !== "") {
      const common = {
        next: "Next",
        auto_next: "Advanced automatically",
        continue: "Continue",
        start_part: "Started part",
      };
      return common[row.response] || safeText(row.response);
    }
    return "—";
  }

  function formatDate(value) {
    const timestamp = timestampValue(value);
    if (!timestamp) return "—";
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(timestamp));
  }

  const api = Object.freeze({
    STORAGE_PREFIX,
    LAST_SESSION_KEY,
    DATABASE_NAME,
    DATABASE_VERSION,
    SESSION_STORE,
    PREVIEW_ROW_LIMIT,
    readSessions,
    sessionRecord,
    openDatabase,
    readIndexedSessions,
    mergeSessions,
    readAllSessions,
    flattenRow,
    combinedRows,
    datasetSummary,
    rowsToCsv,
    assignmentLabel,
    stepLabel,
    responseLabel,
    sessionStatus,
  });
  globalObject.FTCBrowserDataset = api;

  if (!documentObject) return;

  const sessionCount = documentObject.querySelector("[data-session-count]");
  const rowCount = documentObject.querySelector("[data-row-count]");
  const completedCount = documentObject.querySelector("[data-completed-count]");
  const lastSaved = documentObject.querySelector("[data-last-saved]");
  const sessionFilter = documentObject.querySelector("[data-session-filter]");
  const downloadButton = documentObject.querySelector("[data-download]");
  const refreshButton = documentObject.querySelector("[data-refresh]");
  const status = documentObject.querySelector("[data-status]");
  const previewCount = documentObject.querySelector("[data-preview-count]");
  const previewBody = documentObject.querySelector("[data-preview-body]");

  function appendCell(rowNode, primary, secondary = "", className = "") {
    const cell = documentObject.createElement("td");
    const main = documentObject.createElement("span");
    main.className = className || "data-primary-cell";
    main.textContent = primary;
    cell.append(main);
    if (secondary) {
      const detail = documentObject.createElement("span");
      detail.className = "data-secondary-cell";
      detail.textContent = secondary;
      cell.append(detail);
    }
    rowNode.append(cell);
  }

  function updateSessionOptions(sessions) {
    const priorValue = sessionFilter.value || "all";
    const options = [documentObject.createElement("option")];
    options[0].value = "all";
    options[0].textContent = `All sessions (${sessions.length})`;
    sessions.forEach((session) => {
      const option = documentObject.createElement("option");
      option.value = session.key;
      option.textContent = `${session.participantId} · ${session.status} · ${session.rowCount} rows`;
      options.push(option);
    });
    sessionFilter.replaceChildren(...options);
    sessionFilter.value = sessions.some((session) => session.key === priorValue) ? priorValue : "all";
  }

  function selectedSessions(sessions) {
    if (sessionFilter.value === "all") return sessions;
    return sessions.filter((session) => session.key === sessionFilter.value);
  }

  function renderPreview(sessions) {
    const rows = combinedRows(sessions);
    const latestRows = rows.slice(-PREVIEW_ROW_LIMIT).reverse();
    previewCount.textContent = `${latestRows.length} ${latestRows.length === 1 ? "row" : "rows"} shown`;
    previewBody.replaceChildren();
    if (!latestRows.length) {
      const empty = documentObject.createElement("tr");
      empty.className = "data-empty-row";
      const cell = documentObject.createElement("td");
      cell.colSpan = 5;
      cell.textContent = sessions.length
        ? "This session has started; its first completed screen will appear here shortly."
        : "Start a Zoom study and the recorded rows will appear here.";
      empty.append(cell);
      previewBody.append(empty);
      return;
    }
    latestRows.forEach((row) => {
      const line = documentObject.createElement("tr");
      appendCell(line, formatDate(row.dataset_checkpointed_at), humanize(row.completion_status));
      appendCell(line, safeText(row.participant_id || "Unlabelled participant"), safeText(row.session_id));
      appendCell(line, assignmentLabel({
        role_set: row.assigned_role_set,
        event_suffix: row.assigned_event_suffix,
        assigned_context: row.assigned_context,
      }), safeText(row.study_id));
      appendCell(line, stepLabel(row), humanize(row.slide_kind));
      appendCell(line, responseLabel(row), "", "data-response");
      previewBody.append(line);
    });
  }

  let renderSequence = 0;

  async function render() {
    renderSequence += 1;
    const sequence = renderSequence;
    let sessions = [];
    try {
      sessions = await readAllSessions();
    } catch (_error) {
      status.textContent = "This browser did not allow access to its saved study data.";
    }
    if (sequence !== renderSequence) return;
    updateSessionOptions(sessions);
    const summary = datasetSummary(sessions);
    sessionCount.textContent = String(summary.sessionCount);
    rowCount.textContent = String(summary.rowCount);
    completedCount.textContent = String(summary.completedCount);
    lastSaved.textContent = formatDate(summary.lastSavedAt);
    const filteredSessions = selectedSessions(sessions);
    const filteredRows = combinedRows(filteredSessions);
    downloadButton.disabled = filteredRows.length === 0;
    downloadButton.textContent = sessionFilter.value === "all"
      ? "Download combined CSV"
      : "Download this session CSV";
    if (!summary.sessionCount) {
      status.textContent = "No study sessions are saved in this browser yet.";
    } else {
      const progressText = summary.inProgressCount
        ? ` ${summary.inProgressCount} ${summary.inProgressCount === 1 ? "session is" : "sessions are"} still in progress.`
        : "";
      status.textContent = `${summary.rowCount} study rows are saved across ${summary.sessionCount} ${summary.sessionCount === 1 ? "session" : "sessions"}.${progressText}`;
    }
    renderPreview(filteredSessions);
  }

  async function downloadCurrentCsv() {
    const sessions = selectedSessions(await readAllSessions());
    const rows = combinedRows(sessions);
    if (!rows.length) return;
    const csv = rowsToCsv(rows);
    const date = new Date().toISOString().slice(0, 10);
    const suffix = sessionFilter.value === "all" ? "combined" : "session";
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = documentObject.createElement("a");
    link.href = url;
    link.download = `find_the_caregiver_${suffix}_${date}.csv`;
    documentObject.body.append(link);
    link.click();
    link.remove();
    globalObject.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  sessionFilter.addEventListener("change", () => { void render(); });
  downloadButton.addEventListener("click", () => { void downloadCurrentCsv(); });
  refreshButton.addEventListener("click", () => { void render(); });
  globalObject.addEventListener("storage", () => { void render(); });
  documentObject.addEventListener("visibilitychange", () => {
    if (!documentObject.hidden) void render();
  });
  globalObject.setInterval(() => { void render(); }, 2000);
  void render();
})(window, document);
