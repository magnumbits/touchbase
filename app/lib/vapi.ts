// VAPI API helpers

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_BASE_URL = 'https://api.vapi.ai';

interface VapiResponse {
  success: boolean;
  error?: string;
  data?: any;
}

// Update assistant's voice ID
export async function updateAssistantVoice(assistantId: string, voiceId: string): Promise<VapiResponse> {
  try {
    console.log('[VAPI] Updating assistant voice:', { assistantId, voiceId });
    
    const response = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        voice: {
          provider: 'playht',
          voiceId: voiceId
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[VAPI] Error updating assistant:', data);
      return {
        success: false,
        error: data.message || 'Failed to update assistant voice'
      };
    }

    console.log('[VAPI] Successfully updated assistant voice:', data);
    return {
      success: true,
      data
    };
  } catch (error: any) {
    console.error('[VAPI] Error updating assistant:', error);
    return {
      success: false,
      error: error.message || 'Failed to update assistant voice'
    };
  }
}

// Trigger a call
export async function triggerCall(phoneNumber: string, assistantId: string) {
  try {
    console.log('[VAPI] Triggering call:', { phoneNumber, assistantId });
    
    const response = await fetch(`${VAPI_BASE_URL}/calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        to: phoneNumber
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[VAPI] Error triggering call:', data);
      return {
        success: false,
        error: data.message || 'Failed to trigger call'
      };
    }

    console.log('[VAPI] Successfully triggered call:', data);
    return {
      success: true,
      data
    };
  } catch (error: any) {
    console.error('[VAPI] Error triggering call:', error);
    return {
      success: false,
      error: error.message || 'Failed to trigger call'
    };
  }
}
