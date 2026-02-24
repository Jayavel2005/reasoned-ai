// =============================================================
// ReasonedAI — Frontend API Layer
// Matches: FastAPI backend (Cell B) running on Google Colab
//          exposed via Cloudflare Quick Tunnel
// =============================================================

/**
 * Base URL is read from .env so you only change it in one place:
 *   VITE_API_BASE_URL=https://your-tunnel.trycloudflare.com
 *
 * Falls back to localhost for local dev.
 */
const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, ""); // strip trailing slash

// ─────────────────────────────────────────────────────────────
// Generic request helper
// ─────────────────────────────────────────────────────────────

/**
 * Cloudflare Quick Tunnel shows an HTML interstitial page for
 * browser-like requests unless the client explicitly signals it
 * wants JSON.  Adding the header below bypasses the challenge.
 */
const CF_BYPASS_HEADERS = {
  "accept": "application/json",
};

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  // Merge default CF headers with any caller-supplied headers
  const mergedHeaders = {
    ...CF_BYPASS_HEADERS,
    ...(options.headers || {}),
  };

  // Don't set Content-Type for FormData — browser must set the boundary
  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.method && options.method !== "GET") {
    mergedHeaders["Content-Type"] = mergedHeaders["Content-Type"] || "application/json";
  }

  try {
    const response = await fetch(url, {
      credentials: "omit",    // no cookies needed; avoids CORS preflight issues
      ...options,
      headers: mergedHeaders, // always override with merged headers
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        detail = body?.detail || body?.message || JSON.stringify(body);
      } catch {
        detail = (await response.text()) || detail;
      }
      throw new Error(detail);
    }

    return await response.json();
  } catch (err) {
    console.error(`[API] ${options.method || "GET"} ${endpoint} —`, err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// Health / System
// ─────────────────────────────────────────────────────────────

/** GET / → { status, time } */
export function getRootStatus() {
  return request("/");
}

/** GET /health → { status, chunks, docs } */
export function getHealth() {
  return request("/health");
}

// ─────────────────────────────────────────────────────────────
// File Management
// ─────────────────────────────────────────────────────────────

/**
 * GET /files
 *
 * Backend returns a plain object (dict) keyed by filename:
 *   {
 *     "report.pdf": { type, chunks, uploaded, path, processed_at },
 *     "data.csv":   { ... },
 *     …
 *   }
 *
 * We normalise this into the array shape that the store expects:
 *   [{ file_name, type, chunks, uploaded_at, path }, …]
 */
export async function getFiles() {
  const raw = await request("/files");
  // raw is { filename: { type, chunks, uploaded, path, ... }, ... }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw ?? [];

  return Object.entries(raw).map(([filename, meta]) => {
    const chunks = Number(meta?.chunks ?? 0);

    /**
     * The backend's FILES_META never stores the raw file size.
     * Estimate from chunk count: RecursiveCharacterTextSplitter uses
     * chunk_size=1000, so chunks * 1000 ≈ bytes of original text.
     * This gives a useful, non-zero KB/MB value in the sidebar.
     */
    const estimatedBytes = chunks > 0 ? chunks * 1000 : 0;

    return {
      file_name: filename,
      filename,                       // keep both keys for store compat
      type: meta?.type || "General_Document",
      chunks,
      chunk_count: chunks,
      uploaded_at: meta?.uploaded || meta?.processed_at || new Date().toISOString(),
      upload_time: meta?.uploaded,
      path: meta?.path || "",
      size_bytes: estimatedBytes,     // now carries a realistic non-zero value
      sizeBytes: estimatedBytes,     // extra alias for normalizeFileEntry fallback
    };
  });
}


/**
 * POST /upload  (multipart/form-data, field name: "files")
 *
 * Backend accepts: List[UploadFile]
 * Returns: { job_id, status_endpoint }
 *
 * @param {File[] | FileList} files
 */
export async function uploadFiles(files) {
  const formData = new FormData();
  const fileArray = Array.from(files); // handle FileList
  fileArray.forEach((file) => formData.append("files", file));

  return request("/upload", {
    method: "POST",
    body: formData,
    // Do NOT set Content-Type here — browser handles multipart boundary
  });
}

/**
 * GET /jobs/:jobId → { status, result, error, started }
 * status is "processing" | "done" | "error"
 */
export function checkJobStatus(jobId) {
  return request(`/jobs/${jobId}`);
}

/**
 * DELETE /delete/:filename → { deleted, chunks }
 */
export function deleteFile(filename) {
  return request(`/delete/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
}

/**
 * GET /chunks?limit=&offset= → { total, chunks: [{ id, source, excerpt }] }
 */
export function getChunks(limit = 100, offset = 0) {
  return request(`/chunks?limit=${limit}&offset=${offset}`);
}

/**
 * GET /chunk/:chunkId → full chunk object
 */
export function getChunkById(chunkId) {
  return request(`/chunk/${chunkId}`);
}

// ─────────────────────────────────────────────────────────────
// Chat / RAG
// ─────────────────────────────────────────────────────────────

/**
 * POST /chat
 *
 * Request body: { message: string, session_id?: string }
 *
 * Response:
 * {
 *   intent:    "INFORMATIONAL" | "ANALYTICAL" | "ADVISORY",
 *   answer:    string,
 *   retrieved: [{ source, excerpt }]
 * }
 */
export function sendChatMessage(message, sessionId = "default") {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

// ─────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────

/**
 * GET /analytics
 *
 * Response:
 * {
 *   documents:   number,
 *   chunks:      number,
 *   violations:  [{ Parameter, Measured_Value, Limit, Condition, Violation, Escalation }],
 *   top_faults:  [{ Component, count }],
 *   numeric_cols: string[]
 * }
 *
 * We remap "top_faults" → faults with { name, count } so the store can
 * remain agnostic about the backend field name.
 */
export async function getAnalytics() {
  const raw = await request("/analytics");

  // Normalise top_faults → faults
  const faults = Array.isArray(raw?.top_faults)
    ? raw.top_faults.map((f) => ({
      name: f.Component ?? f.name ?? f.label ?? "Unknown",
      count: Number(f.count ?? f.value ?? 0),
    }))
    : [];

  return {
    ...raw,
    faults,
    // trends is not directly provided by the backend; keep as empty unless
    // the analytics endpoint evolves to return time-series data
    trends: raw?.trends ?? [],
  };
}

// ─────────────────────────────────────────────────────────────
// Vector Space  (3-D / PCA-reduced embeddings)
// ─────────────────────────────────────────────────────────────

/**
 * GET /vector-space?limit=
 *
 * Response:
 * {
 *   points: [{
 *     x, y, z,
 *     source, id, excerpt, doc_type
 *   }]
 * }
 *
 * Returns the full response so the store can access raw.points
 * directly (it already handles both raw[] and raw.points[]).
 */
export function getVectorSpace(limit = 10000) {
  return request(`/vector-space?limit=${limit}`);
}

// ─────────────────────────────────────────────────────────────
// Report & Blueprint generation (LLM-powered)
// ─────────────────────────────────────────────────────────────

/** GET /generate-report → { report: string (Markdown) } */
export function generateAuditReport() {
  return request("/generate-report");
}

/** GET /generate-blueprint → { blueprint: string (JSON text) } */
export function generateBlueprint() {
  return request("/generate-blueprint");
}

// ─────────────────────────────────────────────────────────────
// Compound: Upload → Poll until done
// ─────────────────────────────────────────────────────────────

/**
 * Uploads files and polls /jobs/:id until the backend finishes
 * processing (chunking + embedding + auto-summary).
 *
 * @param {File[] | FileList} files
 * @param {number} pollInterval  Initial poll interval in ms (doubles on each retry up to maxInterval)
 * @param {number} maxInterval   Cap for the back-off interval in ms
 * @param {number} timeout       Total timeout in ms before giving up
 * @returns {Promise<object>}    The completed job object (status:"done")
 */
export async function uploadAndWait(
  files,
  pollInterval = 2000,
  maxInterval = 10000,
  timeout = 300_000 // 5 minutes — embedding large docs can be slow
) {
  const uploadResponse = await uploadFiles(files);

  if (!uploadResponse?.job_id) {
    throw new Error("Upload did not return a job_id — check the backend.");
  }

  const jobId = uploadResponse.job_id;
  const deadline = Date.now() + timeout;
  let interval = pollInterval;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    const jobData = await checkJobStatus(jobId);

    if (jobData.status === "done") {
      return jobData;
    }

    if (jobData.status === "error") {
      throw new Error(jobData.error || "Upload processing failed on the backend.");
    }

    // Exponential back-off so we're not hammering the tunnel
    interval = Math.min(interval * 1.5, maxInterval);
  }

  throw new Error(`Upload job ${jobId} timed out after ${timeout / 1000}s.`);
}
