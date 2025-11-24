export async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    // Ensure same-origin credentials so cookies are sent and received
    const merged: RequestInit = { ...init, credentials: init?.credentials ?? "same-origin" };
    const res = await fetch(input, merged);
    if (res.status !== 401) return res;

    // Try to refresh session by calling /api/auth/me which will set a new access cookie
    try {
        const r = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (r.ok) {
            // Retry original request once
            const retry = await fetch(input, merged);
            return retry;
        }
    } catch (e) {
        // ignore and fall through to return original 401
    }
    return res;
}
