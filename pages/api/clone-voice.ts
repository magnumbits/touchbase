import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import formidable, { File as FormidableFile } from 'formidable';
import axios from 'axios';
// Define types locally to avoid import errors
interface VoiceCloneResponse {
  success: boolean;
  voiceId?: string;
  error?: string;
  details?: string | null;
  sessionId?: string;
  message?: string;
}
import * as PlayHT from 'playht';

const SUPPORTED_FORMATS = [
  'audio/webm',
  'audio/mp3',
  'audio/wav',
  'audio/mpeg', // common for mp3
  'audio/x-wav', // common for wav
  'audio/wave',
  'audio/ogg',
  'audio/x-m4a', // for m4a if needed
  'audio/mp4' // for m4a/mp4 if needed
];
const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB

// Helper to parse multipart form data using formidable
function parseFormidable(req: NextApiRequest): Promise<{ audioFile: FormidableFile | null, sessionId?: string }> {
  return new Promise((resolve, reject) => {
    // Enable more debug options
    const form = formidable({
      keepExtensions: true,
      maxFileSize: MAX_AUDIO_SIZE,
      multiples: false, // Don't allow multiple files with same field name
      allowEmptyFiles: false,
      filename: (_name, _ext, part) => {
        // Log part details to help debug
        console.log('[clone-voice] Receiving part:', {
          name: part.name, 
          mime: part.mimetype,
          originalFilename: part.originalFilename
        });
        return `recording-${Date.now()}.webm`;
      },
    });

    form.parse(req, (err, fields, files) => {
      // Log what we received
      console.log('[clone-voice] Parsed form data:', {
        err: err ? err.message : undefined,
        fieldKeys: Object.keys(fields),
        fileKeys: Object.keys(files),
        audioFile: files.audio ? 'exists' : 'missing'
      });

      if (err) return reject(err);
      
      // Try to get the audio file in different ways
      let audioFile = null;
      if (files.audio) {
        // Handle both array and single file cases
        if (Array.isArray(files.audio)) {
          audioFile = files.audio[0];
        } else {
          audioFile = files.audio;
        }
      }
      
      const sessionId = fields.sessionId ? String(fields.sessionId) : undefined;
      resolve({ audioFile, sessionId });
    });
  });
}

export const config = {
  api: {
    bodyParser: false, // Disallow Next.js default body parsing so formidable can handle it
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logs: Record<string, unknown> = { received: Date.now(), method: req.method };

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    // Check PlayHT credentials
    const apiKey = process.env.PLAYHT_API_KEY;
    const userId = process.env.PLAYHT_USER_ID;
    if (!apiKey || !userId) {
      logs.error = 'Missing PLAYHT credentials';
      console.error('[clone-voice]', logs);
      res.status(500).json({ success: false, error: 'Voice cloning is temporarily unavailable. Please contact support.', details: 'Missing PlayHT credentials' });
      return;
    }

    // Parse form data
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
      res.status(400).json({ success: false, error: 'Content-Type must be multipart/form-data', details: null });
      return;
    }
    let audioFile: FormidableFile | null = null;
    let sessionId: string | undefined = undefined;
    try {
      ({ audioFile, sessionId } = await parseFormidable(req));
    } catch (err: unknown) {
      logs.error = 'Form parsing failed';
      logs.details = err instanceof Error ? err.message : 'Unknown error';
      console.error('[clone-voice]', logs);
      res.status(400).json({ success: false, error: 'Failed to parse form data', details: err instanceof Error ? err.message : 'Unknown error' });
      return;
    }
    logs.sessionId = sessionId;
    if (!audioFile) {
      logs.error = 'No audio file uploaded';
      console.error('[clone-voice]', logs);
      res.status(400).json({ success: false, error: 'No audio file uploaded.' });
      return;
    }

    // Validate audio file size
    const fileStats = fs.statSync(audioFile.filepath);
    logs.fileSize = fileStats.size;
    if (fileStats.size === 0) {
      logs.error = 'Empty file uploaded';
      console.error('[clone-voice]', logs);
      res.status(400).json({ success: false, error: 'Audio file is empty.', details: null });
      return;
    }
    if (fileStats.size > MAX_AUDIO_SIZE) {
      logs.error = 'File too large';
      console.error('[clone-voice]', logs);
      res.status(400).json({ success: false, error: 'Audio file too large. Maximum size is 5MB.', details: null });
      return;
    }
    
    // Need to clone the voice using PlayHT API
    let clonedVoice: { id: string } | null = null;
    try {
      // Initialize PlayHT with API credentials
      PlayHT.init({
        apiKey: apiKey as string,
        userId: userId as string,
      });

      // Validate audio file mime type
      if (!audioFile.mimetype || !SUPPORTED_FORMATS.includes(audioFile.mimetype)) {
        throw new Error(`Unsupported audio format: ${audioFile.mimetype || 'unknown'}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
      }

      // Copy audio to a temp file with correct extension
      const fileExt = audioFile.mimetype === 'audio/webm' ? 'webm' : 'mp3';
      const tempFilePath = `/tmp/recording-${Date.now()}.${fileExt}`;
      try {
        fs.copyFileSync(audioFile.filepath, tempFilePath);
        console.log('[clone-voice] Copied audio file to temp path:', tempFilePath);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown file copy error';
        logs.error = 'Failed to copy audio file';
        logs.details = errorMessage;
        console.error('[clone-voice]', logs);
        throw new Error(`Failed to copy audio file: ${errorMessage}`);
      }

      // Submit to PlayHT
      console.log('[clone-voice] Creating voice clone with PlayHT...');
      let responseData;
      try {
        // Use axios directly for better error handling
        const formData = new FormData();
        // Type assertion for Node.js ReadStream to work with FormData
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formData.append('file', fs.createReadStream(tempFilePath) as any);
        formData.append('voice_name', 'User Voice Clone');
        formData.append('description', 'Voice clone for user');
        
        const response = await axios.post('https://api.play.ht/api/v2/cloned-voices/instant', formData, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-USER-ID': userId,
            'accept': 'application/json',
          },
          maxBodyLength: Infinity,
        });
        
        // Log the successful response
        console.log('[clone-voice] PlayHT API success response status:', response.status);
        console.log('[clone-voice] PlayHT API success response headers:', response.headers);
        
        // Parse successful response
        responseData = response.data;
        console.log('[clone-voice] PlayHT API success response data:', responseData);
        
        // Clean up the temporary file
        await fs.promises.unlink(tempFilePath).catch(e => 
          console.error('[clone-voice] Failed to delete temp file:', e)
        );
      } catch (err: unknown) {
        // Clean up temp file on error
        await fs.promises.unlink(tempFilePath).catch(() => {});
        
        // Handle Axios errors
        if (typeof err === 'object' && err !== null) {
          // Type guard for Axios error response
          if ('response' in err && err.response && typeof err.response === 'object') {
            // The request was made and the server responded with a status code outside of 2xx
            const axiosErr = err as { 
              response: { 
                status?: number; 
                statusText?: string; 
                headers?: unknown; 
                data?: unknown 
              } 
            };
            console.error('[clone-voice] PlayHT API error response:', {
              status: axiosErr.response.status,
              statusText: axiosErr.response.statusText,
              headers: axiosErr.response.headers,
              data: axiosErr.response.data
            });
            throw new Error(`PlayHT API error: ${axiosErr.response.status || 'unknown'} - ${JSON.stringify(axiosErr.response.data || {})}`);
          } else if ('request' in err && err.request) {
            // The request was made but no response was received
            console.error('[clone-voice] PlayHT API no response:', err.request);
            const message = 'message' in err && typeof err.message === 'string' ? err.message : 'Unknown error';
            throw new Error(`PlayHT API error: No response received - ${message}`);
          } else if ('message' in err && typeof err.message === 'string') {
            // Something happened in setting up the request
            console.error('[clone-voice] PlayHT API request setup error:', err.message);
            throw new Error(`PlayHT API request error: ${err.message}`);
          }
        }
        // Fallback for any other type of error
        console.error('[clone-voice] Unknown error type:', err);
        throw new Error('Unknown PlayHT API error occurred');
      }
      
      // Extract voice ID from response
      if (!responseData.id) {
        throw new Error('No voice ID returned from PlayHT API');
      }
      
      clonedVoice = { id: responseData.id };
      console.log('[clone-voice] Success! Voice cloned with ID:', clonedVoice.id);
    } catch (err: unknown) {
      logs.error = 'PlayHT API error';
      logs.details = err instanceof Error ? err.message : 'Unknown error';
      console.error('[clone-voice]', logs);
      res.status(502).json({ success: false, error: 'Voice cloning failed', details: err instanceof Error ? err.message : 'Unknown error' });
      return;
    }

    if (!clonedVoice || !clonedVoice.id) {
      logs.error = 'No voice ID returned from PlayHT';
      console.error('[clone-voice]', logs);
      res.status(500).json({ success: false, error: 'Voice cloning failed', details: 'No voice ID returned from PlayHT' });
      return;
    }

    // Update VAPI assistant with the new voice ID
    const VAPI_ASSISTANT_ID = 'faf48696-c2f6-4ef8-b140-d9d96cc12719';
    try {
      // Import using ES module syntax instead of require()
      const { updateAssistantVoice } = await import('../../app/lib/vapi');
      const vapiResponse = await updateAssistantVoice(VAPI_ASSISTANT_ID, clonedVoice.id);
      
      if (!vapiResponse.success) {
        console.error('[clone-voice] Failed to update VAPI assistant:', vapiResponse.error);
        logs.vapiError = vapiResponse.error;
      } else {
        console.log('[clone-voice] Successfully updated VAPI assistant');
        logs.vapiSuccess = true;
      }
    } catch (err: unknown) {
      console.error('[clone-voice] Error updating VAPI assistant:', err);
      logs.vapiError = err instanceof Error ? err.message : 'Unknown error';
    }

    // Session and response
    const sessionCookie = sessionId || Math.random().toString(36).slice(2);
    res.setHeader('Set-Cookie', `voice_session=${sessionCookie}; Path=/; HttpOnly; SameSite=Lax`);
    const response: VoiceCloneResponse = {
      success: true,
      voiceId: clonedVoice.id,
      sessionId: sessionCookie,
      message: 'Voice cloned successfully',
    };
    logs.success = true;
    logs.voiceId = clonedVoice.id;
    console.log('[clone-voice]', logs);
    res.status(200).json(response);
  } catch (err: unknown) {
    console.error('[clone-voice]', { 
      ...logs, 
      error: err instanceof Error ? err.message : 'Unknown error', 
      stack: err instanceof Error ? err.stack : 'No stack trace'
    });
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
}
