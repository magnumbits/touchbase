import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import formidable, { File as FormidableFile } from 'formidable';
import axios from 'axios';
import FormData from 'form-data';
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
      // Initialize PlayHT with API credentials (can be kept if other SDK functions are used, otherwise optional)
      PlayHT.init({
        apiKey: apiKey as string,
        userId: userId as string,
      });

      // Validate audio file mime type
      if (!audioFile.mimetype || !SUPPORTED_FORMATS.includes(audioFile.mimetype)) {
        logs.error = 'Unsupported audio format';
        logs.details = `Format: ${audioFile.mimetype || 'unknown'}. Supported: ${SUPPORTED_FORMATS.join(', ')}`;
        console.error('[clone-voice]', logs);
        // It's better to throw and let the outer catch handle the response for consistency
        throw new Error(`Unsupported audio format: ${audioFile.mimetype || 'unknown'}`);
      }

      console.log('[clone-voice] Creating voice clone with PlayHT via direct API call...');
      const playHTFormData = new FormData();
      playHTFormData.append('sample_file', fs.createReadStream(audioFile.filepath), {
        filename: audioFile.originalFilename || `recording-${Date.now()}.${audioFile.mimetype?.split('/')[1] || 'webm'}`,
        contentType: audioFile.mimetype || 'audio/webm',
      });
      playHTFormData.append('voice_name', 'User Voice Clone ' + Date.now()); // Add timestamp for unique voice name

      const playHTApiUrl = 'https://api.play.ht/api/v2/cloned-voices/instant';
      const playHTConfig = {
        headers: {
          'AUTHORIZATION': apiKey, // PlayHT uses the API key directly for this endpoint
          'X-USER-ID': userId,
          ...playHTFormData.getHeaders(), // This sets 'Content-Type': 'multipart/form-data; boundary=...'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      };

      let responseDataFromPlayHT;
      try {
        console.log(`[clone-voice] Posting to PlayHT: ${playHTApiUrl}`);
        const response = await axios.post(playHTApiUrl, playHTFormData, playHTConfig);
        responseDataFromPlayHT = response.data;
        console.log('[clone-voice] PlayHT API success response data:', responseDataFromPlayHT);
      } catch (axiosError: unknown) {
        // Handle Axios-specific errors for PlayHT call
        if (axios.isAxiosError(axiosError) && axiosError.response) {
          console.error('[clone-voice] PlayHT API error response:', {
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            headers: axiosError.response.headers,
            data: axiosError.response.data,
          });
          logs.playHTErrorDetails = axiosError.response.data;
          throw new Error(`PlayHT API request failed: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
        } else if (axios.isAxiosError(axiosError) && axiosError.request) {
          console.error('[clone-voice] PlayHT API no response:', axiosError.request);
          throw new Error('PlayHT API request made but no response received.');
        } else {
          console.error('[clone-voice] PlayHT API request setup error or unknown error:', axiosError);
          const message = axiosError instanceof Error ? axiosError.message : 'Unknown error during PlayHT API call';
          throw new Error(`PlayHT API request error: ${message}`);
        }
      }

      if (!responseDataFromPlayHT || !responseDataFromPlayHT.id) {
        console.error('[clone-voice] No voice ID returned from PlayHT API. Response:', responseDataFromPlayHT);
        throw new Error('No voice ID in PlayHT API response. Data: ' + JSON.stringify(responseDataFromPlayHT));
      }
      
      clonedVoice = { id: responseDataFromPlayHT.id };
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
