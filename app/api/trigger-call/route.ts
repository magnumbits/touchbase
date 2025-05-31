// POST /api/trigger-call
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

// --- Types ---
interface CallFormData {
  userName: string;
  friendName: string;
  phone: string;
  introduction: string;
  lastMemory: string;
}

interface VapiRequestPayload {
  assistantId: string;
  customer: { number: string };
  phoneNumberId: string;
  assistantOverrides: {
    variableValues: {
      userName: string;
      friendName: string;
      introduction: string;
      lastMemory: string;
    };
  };
}




function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+') && /^\+\d{10,15}$/.test(phone)) return phone;
  if (/^\+\d{10,15}$/.test(`+${digits}`)) return `+${digits}`;
  throw new Error('Invalid phone number format. Must be E.164.');
}

function log(...args: unknown[]) {
  console.log('[API/trigger-call]', ...args);
}

export async function POST(req: NextRequest) {
  // Validate env
  const VAPI_API_KEY = process.env.VAPI_API_KEY;
  if (!VAPI_API_KEY) {
    log('Missing VAPI_API_KEY env');
    return NextResponse.json({ success: false, error: 'Internal server error', details: 'VAPI_API_KEY not set in environment.' }, { status: 500 });
  }

  // Parse and validate body
  let body: CallFormData;
  try {
    body = await req.json();
  } catch (err) {
    log('JSON parse error', err);
    return NextResponse.json({ success: false, error: 'Invalid JSON', details: String(err) }, { status: 400 });
  }

  const requiredFields: (keyof CallFormData)[] = ['userName', 'friendName', 'phone', 'introduction', 'lastMemory'];
  for (const field of requiredFields) {
    if (!body[field] || typeof body[field] !== 'string' || !body[field].trim()) {
      log('Missing or invalid field', field, body[field]);
      return NextResponse.json({ success: false, error: `Missing or invalid field: ${field}` }, { status: 400 });
    }
  }

  // Format phone
  let formattedPhone = '';
  try {
    formattedPhone = sanitizePhone(body.phone);
  } catch (err: unknown) {
    log('Phone format error', body.phone, err);
    return NextResponse.json({ success: false, error: 'Invalid phone number', details: (err && typeof err === 'object' && 'message' in err) ? (err as { message?: string }).message : String(err) }, { status: 400 });
  }

  // Build VAPI payload
  const vapiPayload: VapiRequestPayload = {
    assistantId: 'faf48696-c2f6-4ef8-b140-d9d96cc12719',
    customer: { number: formattedPhone },
    phoneNumberId: '574c7e78-8bed-4e80-be10-09626cac910e',
    assistantOverrides: {
      variableValues: {
        userName: body.userName,
        friendName: body.friendName,
        introduction: body.introduction,
        lastMemory: body.lastMemory,
      },
    },
  };

  log('Incoming request', { ...body, phone: '***' });
  log('VAPI payload', { ...vapiPayload, customer: { number: '***' } });

  // Make VAPI request
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vapiPayload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const vapiData = await vapiRes.json();
    log('VAPI response', vapiRes.status, vapiData);
    if (!vapiRes.ok) {
      return NextResponse.json({
        success: false,
        error: vapiData?.error || 'VAPI call failed',
        details: JSON.stringify(vapiData),
      }, { status: vapiRes.status });
    }
    // Expect vapiData to have callId or similar
    return NextResponse.json({
      success: true,
      callId: vapiData.callId || vapiData.id || '',
      message: 'Call initiated successfully',
    }, { status: 200 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'AbortError') {
      log('VAPI request timed out');
      return NextResponse.json({ success: false, error: 'VAPI request timed out', details: (err as { message?: string }).message }, { status: 504 });
    }
    log('VAPI request error', err);
    return NextResponse.json({ success: false, error: 'Failed to initiate call', details: (err && typeof err === 'object' && 'message' in err) ? (err as { message?: string }).message : String(err) }, { status: 500 });
  }
}

