"use client";
import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import VoiceRecorder with SSR disabled
const VoiceRecorder = dynamic(
  () => import('./VoiceRecorder'),
  { ssr: false }
);

interface VoiceRecorderWrapperProps {
  onRecordingComplete: (blob: Blob) => void;
}

export default function VoiceRecorderWrapper({ onRecordingComplete }: VoiceRecorderWrapperProps) {
  return <VoiceRecorder onRecordingComplete={onRecordingComplete} />;
}
