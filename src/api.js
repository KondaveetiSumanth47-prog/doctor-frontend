const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
let normalizedApiBase = rawApiBase ? rawApiBase.replace(/\/+$/, "") : "/api";
if (normalizedApiBase.startsWith("http") && !normalizedApiBase.endsWith("/api")) {
    normalizedApiBase = `${normalizedApiBase}/api`;
}
const API_BASE = normalizedApiBase;

let csrfToken = null;

async function loadCsrfToken() {
    let response;
    try {
        response = await fetch(`${API_BASE}/auth/csrf`, {
            credentials: "include",
        });
    } catch (networkError) {
        throw new Error(
            `Unable to connect to the backend server at "${API_BASE}". Please verify the backend is running and reachable.`
        );
    }

    const contentType = response.headers.get("content-type") ?? "";
    const rawText = await response.text();

    if (!response.ok) {
        throw new Error(
            `Unable to initialize a secure session (HTTP ${response.status}). Please verify backend service availability.`
        );
    }

    if (contentType.includes("text/html") || rawText.trim().startsWith("<")) {
        throw new Error(
            `Backend API is unreachable or returned HTML instead of JSON from "${API_BASE}/auth/csrf". If deployed, ensure VITE_API_BASE_URL is set in Vercel to your deployed backend HTTPS URL.`
        );
    }

    try {
        const result = JSON.parse(rawText);
        if (!result.token) {
            throw new Error("CSRF token missing from response.");
        }
        csrfToken = result.token;
        return csrfToken;
    } catch (parseError) {
        throw new Error(
            `Failed to parse CSRF token from API (${parseError.message}).`
        );
    }
}

export async function apiFetch(path, options = {}) {
    const method = (options.method ?? "GET").toUpperCase();
    const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);

    // Always fetch a fresh CSRF token for login to avoid stale tokens
    if (path === "/auth/login") {
        csrfToken = null;
    }

    const headers = new Headers(options.headers);

    if (isMutation) {
        headers.set("X-XSRF-TOKEN", csrfToken ?? await loadCsrfToken());
    }
    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    let response = await fetch(`${API_BASE}${path}`, {
        ...options,
        method,
        headers,
        credentials: "include",
    });

    // If a mutation request fails with 403 (possible stale CSRF) and it's not login, retry once with fresh CSRF token
    if (isMutation && response.status === 403 && path !== "/auth/login") {
        try {
            csrfToken = null;
            const freshToken = await loadCsrfToken();
            const retryHeaders = new Headers(options.headers);
            retryHeaders.set("X-XSRF-TOKEN", freshToken);
            if (options.body && !retryHeaders.has("Content-Type")) {
                retryHeaders.set("Content-Type", "application/json");
            }
            response = await fetch(`${API_BASE}${path}`, {
                ...options,
                method,
                headers: retryHeaders,
                credentials: "include",
            });
        } catch {
            // If retry fails, fall back to original response
        }
    }

    return response;
}

export async function apiRequest(path, options = {}) {
    let response;
    try {
        response = await apiFetch(path, options);
    } catch (fetchError) {
        throw fetchError;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const rawText = await response.text();

    let parsedData = null;
    let isJson = false;

    if (contentType.includes("application/json") || (!rawText.trim().startsWith("<") && rawText.trim().length > 0)) {
        try {
            parsedData = JSON.parse(rawText);
            isJson = true;
        } catch {
            isJson = false;
        }
    }

    if (!response.ok) {
        if (isJson && parsedData) {
            const message = parsedData.error ?? parsedData.message;
            if (message) {
                throw new Error(message);
            }
        }

        if (contentType.includes("text/html") || rawText.trim().startsWith("<")) {
            throw new Error(
                `API endpoint "${path}" returned HTTP ${response.status} with an HTML page instead of JSON. Please check backend deployment and VITE_API_BASE_URL.`
            );
        }

        const cleanText = rawText.trim();
        const fallback = cleanText.length > 0 && cleanText.length < 200 ? cleanText : `Request failed (${response.status}).`;
        throw new Error(fallback);
    }

    if (isJson) {
        return parsedData;
    }

    if (contentType.includes("text/html") || rawText.trim().startsWith("<")) {
        throw new Error(
            `Unexpected HTML response from "${path}" (HTTP ${response.status}). API route was intercepted or not found on the backend.`
        );
    }

    if (!rawText.trim()) {
        return null;
    }

    return rawText;
}

export function resetCsrfToken() {
    csrfToken = null;
}

