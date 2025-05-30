import { NextResponse } from 'next/server';
import { updateAssistantVoice } from '@/app/lib/vapi';

export async function POST(request: Request) {
  console.log('[update-assistant-voice] Received request');
  
  try {
    // Parse request body
    const body = await request.json();
    const { assistantId, voiceId } = body;
    
    if (!assistantId || !voiceId) {
      console.error('[update-assistant-voice] Missing required fields:', { assistantId, voiceId });
      return NextResponse.json(
        { success: false, error: 'Missing required fields: assistantId or voiceId' },
        { status: 400 }
      );
    }
    
    console.log('[update-assistant-voice] Updating assistant voice:', { assistantId, voiceId });
    
    // Call VAPI to update the assistant voice
    const response = await updateAssistantVoice(assistantId, voiceId);
    
    if (!response.success) {
      console.error('[update-assistant-voice] Failed to update assistant voice:', response.error);
      return NextResponse.json(
        { success: false, error: response.error },
        { status: 500 }
      );
    }
    
    console.log('[update-assistant-voice] Successfully updated assistant voice');
    return NextResponse.json({ success: true, data: response.data });
    
  } catch (error: any) {
    console.error('[update-assistant-voice] Error updating assistant voice:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
