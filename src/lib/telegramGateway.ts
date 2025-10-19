// Shared Telegram Gateway client utilities
export const TELEGRAM_GATEWAY_URL = process.env.TELEGRAM_GATEWAY_URL || 'https://gatewayapi.telegram.org';

const MOCK = (process.env.TELEGRAM_GATEWAY_MOCK || '').toLowerCase() === 'true' || process.env.TELEGRAM_GATEWAY_MOCK === '1';

function getToken() {
  const token = process.env.TELEGRAM_GATEWAY_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_GATEWAY_TOKEN not set in environment');
  }
  return token;
}

async function gatewayRequest<T = any>(endpoint: string, body: Record<string, any>): Promise<T> {
  if (MOCK) {
    // Simple mock behaviors for local development
    if (endpoint === 'checkSendAbility') {
      return { ok: true, request_id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}` } as any;
    }
    if (endpoint === 'sendVerificationMessage') {
      return { ok: true, request_id: body.request_id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}` } as any;
    }
    if (endpoint === 'checkVerificationStatus') {
      const verified = body.code === '123456' || body.code === '000000';
      return { ok: verified, verified, status: verified ? 'verified' : 'invalid' } as any;
    }
  }
  const token = getToken();
  const res = await fetch(`${TELEGRAM_GATEWAY_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    // Revalidate frequently since this is an external POST
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gateway ${endpoint} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export async function checkSendAbility(phone: string) {
  return gatewayRequest('checkSendAbility', { phone_number: phone });
}

export async function sendVerificationMessage(phone: string, requestId?: string) {
  const payload: any = { phone_number: phone, code_length: 6, ttl: 300 };
  if (requestId) payload.request_id = requestId;
  return gatewayRequest('sendVerificationMessage', payload);
}

export async function checkVerificationStatus(requestId: string, code: string) {
  return gatewayRequest('checkVerificationStatus', { request_id: requestId, code });
}
