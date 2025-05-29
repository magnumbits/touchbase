import React from 'react';
import { AudioRecorder } from 'react-audio-voice-recorder';

export default function VoiceRecorder({ onRecordingComplete }: { onRecordingComplete: (blob: Blob) => void }) {
  return (
    <div className="flex flex-col items-center">
      <AudioRecorder onRecordingComplete={onRecordingComplete} />
    </div>
  );
}
