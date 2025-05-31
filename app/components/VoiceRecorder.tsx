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
  voiceId: string | null; // This seems to be unused, clonedVoiceId is used for PlayHT ID
  error: string | null;
  cloneSuccess: boolean;
  cloneError: string | null;
  clonedVoiceId: string | null; // ID from PlayHT
  isUpdatingAssistant: boolean;
  updateAssistantSuccess: boolean;
  updateAssistantError: string | null;
  // New states for VAPI update countdown and control
  countdown: number;
  showVapiButton: boolean;
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
    // Initial values for new states
    countdown: 0, // Will be set to 180 after successful cloning
    showVapiButton: false,
  });
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [timeLeft, setTimeLeft] = useState(maxDuration);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Countdown timer effect
  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined = undefined;
    if (state.clonedVoiceId && state.countdown > 0 && !state.showVapiButton) {
      timerId = setInterval(() => {
        setState(s => ({ ...s, countdown: Math.max(0, s.countdown - 1) }));
      }, 1000);
    } else if (state.clonedVoiceId && state.countdown === 0 && !state.showVapiButton) {
      setState(s => ({ ...s, showVapiButton: true }));
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [state.clonedVoiceId, state.countdown, state.showVapiButton]);

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

  // Handle uploading the recording to PlayHT for cloning
  const handleUploadRecording = async () => {
    if (!state.audioBlob) return;
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
        setState(s => ({
          ...s,
          isCloning: false,
          cloneSuccess: true,
          clonedVoiceId: data.voiceId,
          cloneError: null,
          countdown: 180, // 3 minutes
          showVapiButton: false,
          isUpdatingAssistant: false,
          updateAssistantSuccess: false,
          updateAssistantError: null,
        }));
        console.log('Voice cloned successfully, Voice ID:', data.voiceId);
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
  };

  // Handle VAPI assistant voice update
  const handleUpdateVapiVoice = async () => {
    if (!state.clonedVoiceId || state.isUpdatingAssistant || state.updateAssistantSuccess) return;
    setState(s => ({ ...s, isUpdatingAssistant: true, updateAssistantError: null }));
    try {
      const VAPI_ASSISTANT_ID = 'faf48696-c2f6-4ef8-b140-d9d96cc12719'; // Consider moving to env var
      const response = await fetch('/api/update-vapi-voice', {
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
        setState(s => ({ ...s, isUpdatingAssistant: false, updateAssistantSuccess: true, updateAssistantError: null }));
        if (typeof onAssistantVoiceUpdated === 'function') {
          onAssistantVoiceUpdated();
        }
      } else {
        setState(s => ({ 
          ...s, 
          isUpdatingAssistant: false, 
          updateAssistantSuccess: false,
          updateAssistantError: "Voice not yet synced on VAPI. Please try again in a couple of minutes." 
        }));
        console.error('VAPI Update Error:', data.error || 'Failed to update assistant voice');
      }
    } catch (err: unknown) {
      console.error('VAPI Update Exception:', err);
      setState(s => ({ 
        ...s, 
        isUpdatingAssistant: false, 
        updateAssistantSuccess: false,
        updateAssistantError: "Voice not yet synced on VAPI. Please try again in a couple of minutes." 
      }));
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 px-2 md:px-4 py-8">
      {/* Script and Reading Tips Section - only if not yet cloned */}
      {!state.cloneSuccess && (
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
      )}

      {/* Recording Controls / Review / Cloning Success UI */}
      <div className="flex flex-col items-center mt-2 w-full max-w-md">
        {/* Initial state or after re-record: Show recording button */}
        {!state.audioBlob && !state.isRecording && !state.cloneSuccess && (
          <>
            <button
              onClick={startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 text-white text-2xl ${permission === 'denied' ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'}`}
              aria-label={'Start Recording'}
              disabled={permission === 'denied'}
            >
              <span>&#9679;</span> {/* Record symbol */}
            </button>
            <div className="mt-2 text-lg font-mono text-gray-800">
              {formatTime(timeLeft)}
            </div>
            <button
              onClick={startRecording}
              className="mt-6 px-8 py-3 rounded-lg bg-orange-500 text-white font-semibold shadow hover:bg-orange-600 transition text-lg"
              type="button"
              disabled={permission === 'denied'}
            >
              Record your voice
            </button>
            <button
              onClick={() => setStep(1)} // Assuming setStep(1) is for skipping
              className="mt-3 text-sm text-orange-600 hover:text-orange-700 underline"
            >
              Skip and use default voice
            </button>
          </>
        )}

        {/* Recording in progress */}
        {state.isRecording && (
          <>
            <button
              onClick={stopRecording}
              className={'w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 text-white text-2xl bg-red-600 animate-pulse'}
              aria-label={'Stop Recording'}
            >
              <span>&#9632;</span> {/* Stop symbol */}
            </button>
            <div className="mt-2 text-lg font-mono text-gray-800">
              {formatTime(timeLeft)}
            </div>
            <div className="mt-1 text-sm text-red-500 animate-pulse">Recording...</div>
          </>
        )}

        {/* Audio recorded, show review options (before cloning) */}
        {state.audioBlob && audioUrl && !state.isRecording && !state.cloneSuccess && (
          <div className="flex flex-col items-center gap-4 w-full mt-6 p-4 bg-gray-50 rounded-lg shadow">
            <p className="text-md font-semibold text-gray-700">Review Your Recording</p>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full rounded-md"
            />
            <div className="mt-3 flex flex-col sm:flex-row justify-center items-center gap-3 w-full">
              <button
                onClick={handleReRecord}
                className="px-6 py-2 bg-orange-500 text-white rounded-md transition hover:bg-orange-600 disabled:bg-gray-400 w-full sm:w-auto font-medium"
                disabled={state.isCloning}
              >
                Re-record
              </button>
              <button
                onClick={handleUploadRecording}
                className={`px-6 py-2 text-white rounded-md transition w-full sm:w-auto font-semibold ${
                  state.isCloning ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
                disabled={state.isCloning}
              >
                {state.isCloning ? 'Cloning...' : 'Use This Recording'}
              </button>
            </div>
          </div>
        )}

        {/* Cloning in progress */}
        {state.isCloning && (
          <div className="mt-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-3 text-indigo-600 font-semibold">Cloning your voice, please wait...</p>
          </div>
        )}

        {/* Clone Success and VAPI Sync UI */}
        {state.cloneSuccess && state.clonedVoiceId && (
          <div className="mt-6 p-6 bg-green-50 border border-green-300 rounded-lg text-green-800 text-center shadow-md w-full">
            <p className="font-semibold text-xl mb-3">Voice Cloned Successfully!</p>
            
            {!state.showVapiButton ? (
              <div className="mt-2">
                <p className="text-sm mb-1">Your new voice will be ready to sync with your VAPI assistant in:</p>
                <p className="text-3xl font-bold text-green-700">{formatTime(state.countdown)}</p>
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${((180 - state.countdown) / 180) * 100}%` }}></div>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center">
                <p className="text-sm mb-3">Your voice is ready to be synced with your VAPI assistant.</p>
                <button
                  onClick={handleUpdateVapiVoice}
                  className={`px-6 py-3 text-white rounded-md transition w-full max-w-xs font-semibold ${
                    state.isUpdatingAssistant || state.updateAssistantSuccess
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  disabled={state.isUpdatingAssistant || state.updateAssistantSuccess}
                >
                  {state.isUpdatingAssistant 
                    ? 'Syncing with VAPI...' 
                    : state.updateAssistantSuccess 
                    ? 'Synced! Proceeding...' 
                    : 'Sync Voice with VAPI'}
                </button>
                {state.updateAssistantError && (
                  <div className="mt-3 text-red-600 text-sm">{state.updateAssistantError}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error messages */}
        {state.cloneError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm text-center w-full">
            {state.cloneError}
          </div>
        )}
      </div>

      {/* General recording permission error */}
      {state.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm text-center w-full max-w-md">
          {state.error}
        </div>
      )}
      {permission === 'denied' && !state.error && (
         <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-lg text-sm text-center w-full max-w-md">
          Microphone access was denied. Please enable it in your browser settings to record audio.
        </div>
      )}
      {typeof window !== 'undefined' && typeof window.MediaRecorder === 'undefined' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm text-center w-full max-w-md">
          Your browser does not support audio recording. Please try a different browser.
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
