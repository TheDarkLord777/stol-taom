// Shared Telegram Gateway client utilities
export const TELEGRAM_GATEWAY_URL =
  process.env.TELEGRAM_GATEWAY_URL || "https://gatewayapi.telegram.org";

// Enable mocking in non-production or when explicitly set
const MOCK =
  (process.env.TELEGRAM_GATEWAY_MOCK || "").toLowerCase() === "true" ||
  process.env.TELEGRAM_GATEWAY_MOCK === "1";

// If we're running in non-production and no token is provided, default to mock
const USE_MOCK_FALLBACK = !process.env.TELEGRAM_GATEWAY_TOKEN && process.env.NODE_ENV !== "production";

function getToken() {
  const token = process.env.TELEGRAM_GATEWAY_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_GATEWAY_TOKEN not set in environment");
  }
  return token;
}

async function gatewayRequest<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  // Use mock behavior if explicitly enabled or in non-prod without token
  if (MOCK || USE_MOCK_FALLBACK) {
    console.log(`[Gateway Mock] ${endpoint}`, { body });
    // Simple mock behaviors for local development
    if (endpoint === "checkSendAbility") {
      return {
        ok: true,
        result: {
          request_id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          phone_number: body.phone_number,
        },
      } as unknown as T;
    }
    if (endpoint === "sendVerificationMessage") {
      const reqBody = body as Record<string, unknown>;
      return {
        ok: true,
        result: {
          sent: true,
          request_id:
            (reqBody as Record<string, unknown>).request_id ??
            `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          ttl: 300,
        },
      } as unknown as T;
    }
    if (endpoint === "checkVerificationStatus") {
      const reqBody = body as Record<string, unknown>;
      const code = String(reqBody.code ?? "");
      const verified = code === "123456" || code === "000000";
      return {
        ok: true,
        result: {
          verified,
          status: verified ? "verified" : "invalid",
          request_id: reqBody.request_id,
        },
      } as unknown as T;
    }
  }

  try {
    const token = getToken();
    console.log(`[Gateway] ${endpoint} Request:`, {
      url: `${TELEGRAM_GATEWAY_URL}/${endpoint}`,
      headers: {
        Authorization: 'Bearer [hidden]',
        "Content-Type": "application/json",
      },
      body,
    });

    const res = await fetch(`${TELEGRAM_GATEWAY_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error(`[Gateway] ${endpoint} invalid JSON response:`, text);
      throw new Error(`Gateway ${endpoint} invalid response: ${text}`);
    }

    if (!res.ok) {
      console.error(`[Gateway] ${endpoint} failed:`, {
        status: res.status,
        statusText: res.statusText,
        response: data,
      });
      throw new Error(`Gateway ${endpoint} failed: ${res.status} ${text}`);
    }

    console.log(`[Gateway] ${endpoint} success:`, data);
    return data as T;
  } catch (error) {
    console.error(`[Gateway] ${endpoint} error:`, error);
    throw error;
  }
}

function normalizePhoneForGateway(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, "");

  // Remove all + signs first
  normalized = normalized.replace(/\+/g, "");

  // Remove leading zeros
  normalized = normalized.replace(/^0+/, "");

  // Handle various formats:
  // 1. If starts with 998, it's already a full number
  // 2. If it's 9 digits, assume it's without country code
  // 3. Otherwise, treat as partial number
  if (!normalized.startsWith("998")) {
    if (normalized.length === 9) {
      normalized = "998" + normalized;
    } else {
      // Remove any partial country code and add full one
      normalized = "998" + normalized.slice(-9);
    }
  }

  // Some gateways prefer without +, test both formats
  const withPlus = "+" + normalized;
  const withoutPlus = normalized;

  console.log("[Gateway] Normalized phone:", {
    original: phone,
    normalized: withPlus,
    alternateFormat: withoutPlus,
    digitsOnly: normalized
  });

  // Try without + first as some gateways prefer this
  return withoutPlus;
}

export async function checkSendAbility(phone: string) {
  const normalized = normalizePhoneForGateway(phone);

  try {
    // First try without +
    const result = await gatewayRequest("checkSendAbility", { phone_number: normalized });
    return result;
  } catch (error) {
    // If that fails, try with +
    console.log("[Gateway] First attempt failed, trying with + prefix");
    return gatewayRequest("checkSendAbility", { phone_number: "+" + normalized });
  }
}

export async function sendVerificationMessage(
  phone: string,
  requestId?: string,
) {
  const normalized = normalizePhoneForGateway(phone);
  const payload: Record<string, unknown> = {
    phone_number: normalized,
    code_length: 6,
    ttl: 300,
  };
  if (requestId) (payload as Record<string, unknown>).request_id = requestId;
  return gatewayRequest("sendVerificationMessage", payload);
}

export async function checkVerificationStatus(requestId: string, code: string) {
  return gatewayRequest("checkVerificationStatus", {
    request_id: requestId,
    code,
  });
}
