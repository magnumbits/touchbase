// GET /api/call-status
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  // Placeholder for call status logic
  return NextResponse.json({ status: 'ok', message: 'Call status endpoint' });
}
