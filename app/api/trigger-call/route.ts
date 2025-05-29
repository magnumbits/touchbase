// POST /api/trigger-call
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  // Placeholder for call trigger logic
  return NextResponse.json({ status: 'ok', message: 'Call trigger endpoint' });
}
