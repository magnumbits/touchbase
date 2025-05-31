"use client";
import React, { useState, useRef, useEffect } from 'react';
// Note: no router needed for this component

export interface VoiceRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void; // used by wrapper
  maxDuration?: number; // seconds, default 30
  onAssistantVoiceUpdated?: () => void;
  setStep: (step: number) => void;
}

interface RecordingState {
  isRecording: boolean;
  recordingTime: number; // 0-30 seconds
  audioBlob: Blob | null;
  isPlaying: boolean;
  isCloning: boolean;
  voiceId: string | null;
  error: string | null;
  cloneSuccess: boolean;
  cloneError: string | null;
  clonedVoiceId: string | null;
  isUpdatingAssistant: boolean;
  updateAssistantSuccess: boolean;
  updateAssistantError: string | null;
}

const FRIEND_SCRIPT = `Hey Sarah! It's John from college. How have you been? I was just thinking about that crazy finals week when we pulled all-nighters together in the library. Can't believe that was so long ago! I've been meaning to reach out and catch up. What's new with you? I'd love to hear about everything you've been up to. Are you free for a longer chat this weekend? It would be awesome to properly reconnect!`;

const READING_TIPS = [
  "Read naturally with energy, as if talking to a real friend.",
  "Speak clearly and naturally.",
  "Imagine you're genuinely excited to reconnect.",
  "Use your normal speaking voice and pace.",
  "Avoid long pauses between sentences."
];

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onRecordingComplete, 
  maxDuration = 30, 
  onAssistantVoiceUpdated, 
  setStep 
}) => {
  
  // Unified state for all recording aspects
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    recordingTime: 0,
    audioBlob: null,
    isPlaying: false,
    isCloning: false,
    voiceId: null,
    error: null,
    cloneSuccess: false,
    cloneError: null,
    clonedVoiceId: null,
    isUpdatingAssistant: false,
    updateAssistantSuccess: false,
    updateAssistantError: null,
  });
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [timeLeft, setTimeLeft] = useState(maxDuration);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Format timer as MM:SS
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // Start recording
  const startRecording = async () => {
    setState(s => ({ ...s, error: null }));
    setState(s => ({ ...s, audioBlob: null }));
    setAudioUrl(null);
    setTimeLeft(maxDuration);
    try {
      if (!navigator.mediaDevices || typeof window.MediaRecorder === 'undefined') {
        setState((s: RecordingState) => ({ ...s, error: 'Your browser does not support audio recording.' }));
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermission('granted');
      streamRef.current = stream;
      // Use the standard WebM format which is well-supported by browsers
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setState((s: RecordingState) => ({ ...s, audioBlob: blob }));
        setAudioUrl(URL.createObjectURL(blob));
        // Do not call onRecordingComplete here. Wait for user to confirm.
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      mediaRecorder.start();
      setState((s: RecordingState) => ({ ...s, isRecording: true }));
      setTimeLeft(maxDuration);
    } catch {

      setState((s: RecordingState) => ({ ...s, error: 'Microphone access denied or unavailable.' }));
      setPermission('denied');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setState((s: RecordingState) => ({ ...s, isRecording: false }));
    }
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (state.isRecording && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  
  }, [state.isRecording, timeLeft]);

  // Re-record
  const handleReRecord = () => {
    setState(s => ({ ...s, audioBlob: null }));
    setAudioUrl(null);
    setTimeLeft(maxDuration);
    setState(s => ({ ...s, error: null }));
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 px-2 md:px-4">
      {/* Script and Reading Tips Section */}
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="font-semibold mb-1 text-gray-700">Read this aloud:</div>
          <blockquote className="italic text-gray-800 whitespace-pre-line">{FRIEND_SCRIPT}</blockquote>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 shadow-sm">
          <div className="font-semibold mb-1 text-blue-700">Tips for best results:</div>
          <ul className="list-disc list-inside text-blue-900 text-sm">
            {READING_TIPS.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
      {/* Centered recording controls below text */}
      <div className="flex flex-col items-center mt-6 w-full">
        <button
          onClick={state.isRecording ? stopRecording : startRecording}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 text-white text-2xl ${state.isRecording ? 'bg-red-600 animate-pulse' : 'bg-orange-500 hover:bg-orange-600'}`}
          aria-label={state.isRecording ? 'Stop Recording' : 'Start Recording'}
          disabled={permission === 'denied'}
        >
          {state.isRecording ? <span>&#9632;</span> : <span>&#9679;</span>}
        </button>
        <div className="mt-2 text-lg font-mono text-gray-800">
          {formatTime(timeLeft)}
        </div>
        {state.isRecording && (
          <div className="mt-1 text-xs text-red-500 animate-pulse">Recording...</div>
        )}
        {/* Main CTA: Record your voice */}
        {!state.isRecording && !state.audioBlob && (
          <button
            onClick={startRecording}
            className="mt-6 px-8 py-3 rounded-lg bg-orange-500 text-white font-semibold shadow hover:bg-orange-600 transition text-lg"
            type="button"
          >
            Record your voice
          </button>
        )}
        {/* Subtle link: Skip and use default voice */}
        {!state.isRecording && !state.audioBlob && (
          <button
            onClick={() => setStep(1)}
            className="mt-2 text-orange-500 underline bg-transparent border-0 shadow-none text-base cursor-pointer"
            type="button"
          >
            Skip and use default voice
          </button>
        )}
      </div>



      {state.cloneSuccess && state.clonedVoiceId && (
        <div className="mt-2 text-green-600 text-sm text-center">
          Voice cloned!<br />
          <span className="font-mono">Voice ID: {state.clonedVoiceId}</span>
          <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded text-blue-800">
            <p className="font-semibold">Voice was cloned successfully!</p>
            <p className="mt-1">Please sync the voice in the Vapi dashboard to use it.</p>
          </div>
          <button
            className={`mt-4 px-4 py-2 text-white rounded transition w-full ${
              state.isUpdatingAssistant 
                ? 'bg-gray-500' 
                : state.updateAssistantSuccess 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
            onClick={async () => {
              if (!state.clonedVoiceId || state.isUpdatingAssistant) return;
              setState(s => ({ ...s, isUpdatingAssistant: true, updateAssistantError: null }));
              try {
                const VAPI_ASSISTANT_ID = 'faf48696-c2f6-4ef8-b140-d9d96cc12719';
                const response = await fetch('/api/update-assistant-voice', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    assistantId: VAPI_ASSISTANT_ID,
                    voiceId: state.clonedVoiceId
                  }),
                });
                
                const data = await response.json();
                
                if (data.success) {
                  setState(s => ({ ...s, isUpdatingAssistant: false, updateAssistantSuccess: true }));
                  // Call the callback to inform parent to move to the next section
                  if (typeof onAssistantVoiceUpdated === 'function') {
                    onAssistantVoiceUpdated();
                  }
                } else {
                  setState(s => ({ 
                    ...s, 
                    isUpdatingAssistant: false, 
                    updateAssistantError: data.error || 'Failed to update assistant voice'
                  }));
                }
              } catch (err: unknown) {
                console.error('Error updating assistant voice:', err);
                setState(s => ({
                  ...s,
                  isUpdatingAssistant: false,
                  updateAssistantError: (err && typeof err === 'object' && 'message' in err)
                    ? (err as { message?: string }).message ?? 'Error updating assistant voice'
                    : 'Error updating assistant voice'
                }));
              }
            }}
            type="button"
            disabled={state.isUpdatingAssistant || state.updateAssistantSuccess}
          >
            {state.isUpdatingAssistant 
              ? 'Updating assistant voice...' 
              : state.updateAssistantSuccess 
              ? 'Updated! Moving to Friend Details...' 
              : 'Update assistant voice'}
          </button>
          {state.updateAssistantError && (
            <div className="mt-2 text-red-600 text-sm text-center">{state.updateAssistantError}</div>
          )}
        </div>
      )}

      {state.audioBlob && audioUrl && !state.isRecording && (
        <div className="flex flex-col items-center gap-2 w-full mt-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition w-full"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
                setState((s: RecordingState) => ({ ...s, isPlaying: true }));
              }
            }}
            type="button"
            disabled={state.isPlaying}
          >
            {state.isPlaying ? 'Playing...' : 'Play Recording'}
          </button>
          <audio
            ref={audioRef}
            src={audioUrl}
            style={{ display: 'none' }}
            onEnded={() => setState(s => ({ ...s, isPlaying: false }))}
            onPause={() => setState(s => ({ ...s, isPlaying: false }))}
          />
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition w-full"
            onClick={handleReRecord}
            type="button"
            disabled={state.isPlaying}
          >
            Re-record
          </button>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition w-full"
            onClick={async () => {
              if (!state.audioBlob || state.isCloning) return;
              setState(s => ({ ...s, isCloning: true, cloneError: null, cloneSuccess: false, clonedVoiceId: null }));
              try {
                const formData = new FormData();
                formData.append('audio', state.audioBlob, 'recording.webm');
                const res = await fetch('/api/clone-voice', {
                  method: 'POST',
                  body: formData,
                });
                const data = await res.json();
                if (data.success && data.voiceId) {
                  setState(s => ({ ...s, isCloning: false, cloneSuccess: true, clonedVoiceId: data.voiceId }));
                } else {
                  setState(s => ({ ...s, isCloning: false, cloneError: data.error || 'Voice cloning failed', cloneSuccess: false }));
                }
              } catch (err: unknown) {
                console.error('Error during voice cloning:', err);
                setState(s => ({
                  ...s,
                  isCloning: false,
                  cloneError: (err && typeof err === 'object' && 'message' in err) 
                    ? (err as { message?: string }).message ?? 'Error during voice cloning' 
                    : 'Error during voice cloning'
                }));
              }
            }}
            type="button"
            disabled={state.isPlaying || state.isCloning}
          >
            {state.isCloning ? 'Cloning your voice...' : 'Use This Recording'}
          </button>
          {state.cloneSuccess && (
            <div className="mt-2 text-green-600 text-sm text-center">
              Voice cloned!<br />
              <span className="font-mono">Voice ID: {state.clonedVoiceId}</span>
              <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded text-blue-800">
                <p className="font-semibold">Voice was cloned successfully!</p>
                <p className="mt-1">Please sync the voice in the Vapi dashboard to use it.</p>
              </div>
              <button
                className={`mt-4 px-4 py-2 text-white rounded transition w-full ${
                  state.isUpdatingAssistant 
                    ? 'bg-gray-500' 
                    : state.updateAssistantSuccess 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
                onClick={async () => {
                  if (!state.clonedVoiceId || state.isUpdatingAssistant) return;
                  setState(s => ({ ...s, isUpdatingAssistant: true, updateAssistantError: null }));
                  try {
                    const VAPI_ASSISTANT_ID = 'faf48696-c2f6-4ef8-b140-d9d96cc12719';
                    const response = await fetch('/api/update-assistant-voice', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        assistantId: VAPI_ASSISTANT_ID,
                        voiceId: state.clonedVoiceId
                      }),
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                      setState(s => ({ ...s, isUpdatingAssistant: false, updateAssistantSuccess: true }));
                      // Call the callback to inform parent to move to the next section
                      if (typeof onAssistantVoiceUpdated === 'function') {
                        onAssistantVoiceUpdated();
                      }
                    } else {
                      setState(s => ({ 
                        ...s, 
                        isUpdatingAssistant: false, 
                        updateAssistantError: data.error || 'Failed to update assistant voice'
                      }));
                    }
                  } catch (err: unknown) {
                    setState(s => ({ 
                      ...s, 
                      isUpdatingAssistant: false, 
                      updateAssistantError: (err && typeof err === 'object' && 'message' in err) 
                        ? String((err as { message: unknown }).message) || 'Failed to update assistant voice'
                        : 'Failed to update assistant voice'
                    }));
                  }
                }}
                type="button"
                disabled={state.isUpdatingAssistant || state.updateAssistantSuccess}
              >
                {state.isUpdatingAssistant 
                  ? 'Updating assistant voice...' 
                  : state.updateAssistantSuccess 
                  ? 'Updated! Redirecting...' 
                  : 'Update assistant voice'}
              </button>
              {state.updateAssistantError && (
                <div className="mt-2 text-red-600 text-sm text-center">{state.updateAssistantError}</div>
              )}
            </div>
          )}
          {state.cloneError && (
            <div className="mt-2 text-red-600 text-sm text-center">{state.cloneError}</div>
          )}
        </div>
      )}
      {state.error && (
        <div className="mt-2 text-red-600 text-sm text-center">{state.error}</div>
      )}
      {typeof window !== 'undefined' && typeof window.MediaRecorder === 'undefined' && (
        <div className="mt-2 text-red-600 text-sm text-center">
          Your browser does not support audio recording.
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
