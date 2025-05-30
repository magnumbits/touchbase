// GET /api/call-status?callId=xxx
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface CallStatusResponse {
  success: boolean;
  callData?: unknown; // Full Vapi call data
  status?: string;
  summary?: string;
  recordingUrl?: string;
  error?: string;
  details?: string;
}

export async function GET(req: NextRequest) {
  // Get callId from query params
  const url = new URL(req.url);
  const callId = url.searchParams.get('callId');
  
  if (!callId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Missing callId parameter' 
    }, { status: 400 });
  }

  // Get Vapi API key from env
  const VAPI_API_KEY = process.env.VAPI_API_KEY;
  if (!VAPI_API_KEY) {
    console.error('Missing VAPI_API_KEY env variable');
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error', 
      details: 'VAPI_API_KEY not set in environment.' 
    }, { status: 500 });
  }

  try {
    // Fetch call status from Vapi API
    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Vapi API error:', response.status, errorData);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch call status', 
        details: JSON.stringify(errorData)
      }, { status: response.status });
    }

    const callData = await response.json();
    
    // Extract relevant data
    const result: CallStatusResponse = {
      success: true,
      callData,
      status: callData.status,
      summary: callData.analysis?.summary || null,
      recordingUrl: callData.artifact?.recordingUrl || null,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    console.error('Error fetching call status:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch call status', 
      details: (err && typeof err === 'object' && 'message' in err) ? (err as { message?: string }).message : String(err)
    }, { status: 500 });
  }
}
