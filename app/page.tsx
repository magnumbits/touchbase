"use client";
import React, { useState } from "react";

import ProgressSteps from "./components/ProgressSteps";
import VoiceRecorderWrapper from "./components/VoiceRecorderWrapper";
import FriendForm from "./components/FriendForm";
import CallStatus from "./components/CallStatus";
import type { FriendData } from "../types";



export default function Home() {
  const [step, setStep] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [friendData, setFriendData] = useState<FriendData | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [callSummary, setCallSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Handle call completion - update state and move to results step
  const handleCallCompleted = (summary: string) => {
    setCallSummary(summary);
    // After call is complete, move to the results step
    setStep(3);
  };

  // Step content rendering
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="w-full flex flex-col items-center gap-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-orange-700">Step 1: Clone your voice</h2>
            <VoiceRecorderWrapper
              onRecordingComplete={(blob: Blob) => {
                setAudioBlob(blob);
                setStep(1);
              }}
              onAssistantVoiceUpdated={() => setStep(1)}
              setStep={setStep}
            />
            
          </div>
        );
      case 1:
        return (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center animate-fade-in">
            <h2 className="text-2xl font-bold text-orange-700 mb-4 text-center">Step 2: Friend Details</h2>
            <FriendForm
              initialData={friendData || undefined}
              onBack={() => setStep(0)}
              onCallInitiated={(newCallId, formData) => {
                // Convert CallFormData to FriendData
                setFriendData({
                  name: formData.friendName,
                  userName: formData.userName,
                  phone: formData.phone,
                  lastMemory: formData.lastMemory,
                  introduction: formData.introduction
                });
                setCallId(newCallId);
                setStep(2); // Move to Call Status step
              }}
            />
          </div>
        );
      case 2:
        return (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-orange-700 text-center">Step 3: Call Status</h2>
            <div className="w-full flex justify-center">
              <div className="w-full max-w-md">
                <CallStatus
                  callId={callId || undefined}
                  friendName={friendData?.name || "your friend"}
                  onCallCompleted={handleCallCompleted}
                />
              </div>
            </div>
            <button
              className="mt-2 text-orange-500 underline text-center"
              onClick={() => setStep(1)}
            >
              Back to Friend Details
            </button>
          </div>
        );
      case 3:
        return (
          <div className="w-full flex flex-col items-center gap-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-orange-700">Step 4: Results & Next Steps</h2>
            <div className="bg-white/80 rounded-xl shadow p-6 max-w-md w-full text-center">
              <p className="text-lg font-semibold text-green-700 mb-2">Call completed!</p>
              {callSummary && (
                <div className="bg-white p-4 rounded border border-gray-200 my-4 text-left">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">Call Summary:</h3>
                  <p className="text-gray-800">{callSummary}</p>
                </div>
              )}
              <p className="text-gray-700 mt-4">Would you like to schedule a follow-up or try another friend?</p>
              <div className="flex gap-4 mt-6 justify-center">
                <button
                  className="px-4 py-2 rounded bg-orange-400 text-white font-semibold hover:bg-orange-500 transition"
                  onClick={() => {
                    setStep(0);
                    setAudioBlob(null);
                    setFriendData(null);
                    setCallId(null);
                    setCallSummary("");
                  }}
                >
                  Start Over
                </button>
                <button
                  className="px-4 py-2 rounded bg-orange-200 text-orange-800 font-semibold hover:bg-orange-300 transition"
                  onClick={() => setStep(1)}
                >
                  New Friend
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-orange-200 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white/90 rounded-2xl shadow-xl p-6 sm:p-10 flex flex-col gap-4 animate-fade-in">
        <ProgressSteps step={step} />
        {renderStep()}
      </div>
      <footer className="mt-10 text-xs text-orange-600 opacity-70">Touchbase.fun &copy; {new Date().getFullYear()}</footer>
    </div>
  );
}
