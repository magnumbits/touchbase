// POST /api/calendar-webhook
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  // Placeholder for calendar webhook logic
  return NextResponse.json({ status: 'ok', message: 'Calendar webhook endpoint' });
}
