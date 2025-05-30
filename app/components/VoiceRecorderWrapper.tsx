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
  onAssistantVoiceUpdated?: () => void;
  setStep: (step: number) => void;
}

export default function VoiceRecorderWrapper({ onRecordingComplete, onAssistantVoiceUpdated, setStep }: VoiceRecorderWrapperProps) {
  return <VoiceRecorder onRecordingComplete={onRecordingComplete} onAssistantVoiceUpdated={onAssistantVoiceUpdated} setStep={setStep} />;
}
