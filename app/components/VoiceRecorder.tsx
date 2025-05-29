"use client";
import React, { useState, useRef, useEffect } from 'react';

export interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  maxDuration?: number; // seconds, default 60
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, maxDuration = 60 }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(maxDuration);
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [isPlaying, setIsPlaying] = useState(false);

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
    setError(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setTimeLeft(maxDuration);
    try {
      if (!navigator.mediaDevices || typeof window.MediaRecorder === 'undefined') {
        setError('Your browser does not support audio recording.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermission('granted');
      streamRef.current = stream;
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
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        // Do not call onRecordingComplete here. Wait for user to confirm.
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
      setTimeLeft(maxDuration);
    } catch {

      setError('Microphone access denied or unavailable.');
      setPermission('denied');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording && timeLeft > 0) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, timeLeft]);

  // Re-record
  const handleReRecord = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTimeLeft(maxDuration);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xs mx-auto p-4 rounded shadow bg-white">
      <div className="mb-4 flex flex-col items-center">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 text-white text-2xl ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-orange-500 hover:bg-orange-600'}`}
          aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
          disabled={permission === 'denied'}
        >
          {isRecording ? <span>&#9632;</span> : <span>&#9679;</span>}
        </button>
        <div className="mt-2 text-lg font-mono text-gray-800">
          {formatTime(timeLeft)}
        </div>
        {isRecording && (
          <div className="mt-1 text-xs text-red-500 animate-pulse">Recording...</div>
        )}
      </div>
      {audioBlob && audioUrl && !isRecording && (
        <div className="flex flex-col items-center gap-2 w-full mt-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition w-full"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
                setIsPlaying(true);
              }
            }}
            type="button"
            disabled={isPlaying}
          >
            {isPlaying ? 'Playing...' : 'Play Recording'}
          </button>
          <audio
            ref={audioRef}
            src={audioUrl}
            style={{ display: 'none' }}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
          />
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition w-full"
            onClick={handleReRecord}
            type="button"
            disabled={isPlaying}
          >
            Re-record
          </button>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition w-full"
            onClick={() => audioBlob && onRecordingComplete(audioBlob)}
            type="button"
            disabled={isPlaying}
          >
            Use This Recording
          </button>
        </div>
      )}
      {error && (
        <div className="mt-2 text-red-600 text-sm text-center">{error}</div>
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
