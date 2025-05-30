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
  const logs: any = { received: Date.now(), method: req.method };

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
    } catch (err: any) {
      logs.error = 'Form parsing failed';
      logs.details = err.message;
      console.error('[clone-voice]', logs);
      res.status(400).json({ success: false, error: 'Failed to parse form data', details: err.message });
      return;
    }
    logs.sessionId = sessionId;
    if (!audioFile) {
      logs.error = 'No audio file uploaded';
      console.error('[clone-voice]', logs);
      res.status(400).json({ success: false, error: 'No audio file uploaded.' });
      return;
    }
    console.log('[clone-voice] Uploaded mimetype:', audioFile.mimetype);
    if (!SUPPORTED_FORMATS.includes(audioFile.mimetype || '')) {
      logs.error = `Unsupported audio format: ${audioFile.mimetype}`;
      console.error('[clone-voice]', logs);
      res.status(400).json({ success: false, error: `Unsupported audio format (${audioFile.mimetype}). Please upload a .webm, .mp3, or .wav file.` });
      return;
    }
    if (audioFile.size > MAX_AUDIO_SIZE) {
      logs.error = `Audio file too large: ${audioFile.size}`;
      console.error('[clone-voice]', logs);
      res.status(400).json({ success: false, error: 'Audio file too large. Please keep recordings under 30 seconds.' });
      return;
    }

    // Read audio file buffer
    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.promises.readFile(audioFile.filepath);
    } catch (err: any) {
      logs.error = 'Failed to read audio file buffer';
      logs.details = err.message;
      console.error('[clone-voice]', logs);
      res.status(400).json({ success: false, error: 'Failed to process audio file', details: err.message });
      return;
    }

    // Initialize PlayHT
    try {
      PlayHT.init({ apiKey, userId });
    } catch (err: any) {
      logs.error = 'Failed to initialize PlayHT';
      logs.details = err.message;
      console.error('[clone-voice]', logs);
      res.status(500).json({ success: false, error: 'Voice cloning service unavailable', details: err.message });
      return;
    }

    // Use PlayHT API directly as per documentation
    let clonedVoice: any;
    let responseData: any;
    try {
      console.log('[clone-voice] Using direct PlayHT API with multipart/form-data...');

      // Create a FormData instance using the form-data package (already compatible with Node.js)
      const FormData = require('form-data');
      const form = new FormData();
      
      // Create a temporary file path for the audio
      const tempFilePath = `${audioFile.filepath}.wav`;
      
      // Write the buffer to the temp file
      await fs.promises.writeFile(tempFilePath, fileBuffer);
      
      try {
        // Append the temporary file to the form data
        // This ensures Axios can properly handle the file upload with the correct content type
        form.append('sample_file', fs.createReadStream(tempFilePath));
        form.append('voice_name', 'user-voice-clone');
        form.append('gender', 'male');
        
        // API endpoint for instant voice cloning
        const apiUrl = 'https://api.play.ht/api/v2/cloned-voices/instant/';
        console.log('[clone-voice] Sending request to PlayHT API with Axios:', apiUrl);
        
        // Use Axios for the request - it handles multipart/form-data correctly
        const response = await axios.post(apiUrl, form, {
          headers: {
            ...form.getHeaders(), // This is critical - it sets the correct Content-Type with boundary
            'Authorization': `Bearer ${apiKey}`,
            'X-User-ID': userId,
          },
          // Add timeout and other options
          timeout: 60000, // 60 seconds timeout
          maxContentLength: Infinity,
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
      } catch (err: any) {
        // Clean up temp file on error
        await fs.promises.unlink(tempFilePath).catch(() => {});
        
        // Handle Axios errors
        if (err.response) {
          // The request was made and the server responded with a status code outside of 2xx
          console.error('[clone-voice] PlayHT API error response:', {
            status: err.response.status,
            statusText: err.response.statusText,
            headers: err.response.headers,
            data: err.response.data
          });
          throw new Error(`PlayHT API error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
        } else if (err.request) {
          // The request was made but no response was received
          console.error('[clone-voice] PlayHT API no response:', err.request);
          throw new Error(`PlayHT API error: No response received - ${err.message}`);
        } else {
          // Something happened in setting up the request
          console.error('[clone-voice] PlayHT API request setup error:', err.message);
          throw new Error(`PlayHT API request error: ${err.message}`);
        }
      }
      
      // Extract voice ID from response
      if (!responseData.id) {
        throw new Error('No voice ID returned from PlayHT API');
      }
      
      clonedVoice = { id: responseData.id };
      console.log('[clone-voice] Success! Voice cloned with ID:', clonedVoice.id);
    } catch (err: any) {
      logs.error = 'PlayHT API error';
      logs.details = err.message;
      console.error('[clone-voice]', logs);
      res.status(502).json({ success: false, error: 'Voice cloning failed', details: err.message });
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
  } catch (err: any) {
    console.error('[clone-voice]', { ...logs, error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Internal server error', details: err.message });
  }
}
