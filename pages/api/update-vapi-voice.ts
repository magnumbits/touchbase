import type { NextApiRequest, NextApiResponse } from 'next';
import { updateAssistantVoice } from '@/app/lib/vapi'; // Assuming vapi.ts is in app/lib

interface UpdateVapiVoiceRequest {
  voiceId: string;
  assistantId: string;
}

interface UpdateVapiVoiceResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: unknown;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateVapiVoiceResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { voiceId, assistantId } = req.body as UpdateVapiVoiceRequest;

  if (!voiceId || !assistantId) {
    return res.status(400).json({ success: false, error: 'Missing voiceId or assistantId in request body' });
  }

  console.log(`[update-vapi-voice] Attempting to update assistant ${assistantId} with voice ${voiceId}`);

  try {
    const vapiResponse = await updateAssistantVoice(assistantId, voiceId);

    if (vapiResponse.success) {
      console.log(`[update-vapi-voice] Successfully updated VAPI assistant ${assistantId} with voice ${voiceId}`);
      return res.status(200).json({ success: true, message: 'VAPI assistant voice updated successfully' });
    } else {
      console.error(`[update-vapi-voice] Failed to update VAPI assistant ${assistantId}:`, vapiResponse.error);
      return res.status(502).json({
        success: false,
        error: 'Failed to update VAPI assistant voice',
        details: vapiResponse.error,
      });
    }
  } catch (err: unknown) {
    console.error(`[update-vapi-voice] Error updating VAPI assistant ${assistantId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
    return res.status(500).json({
      success: false,
      error: 'Internal server error while updating VAPI assistant voice',
      details: errorMessage,
    });
  }
}
