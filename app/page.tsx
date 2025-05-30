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
  const [callStatus, setCallStatus] = useState<"preparing" | "calling" | "inprogress" | "completed" | "followup">("preparing");
  const [callOutcome, setCallOutcome] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Simulate call sequence
  const triggerCall = async () => {
    setCallStatus("preparing");
    setLoading(true);
    setTimeout(() => {
      setCallStatus("calling");
      setTimeout(() => {
        setCallStatus("inprogress");
        setTimeout(() => {
          setCallStatus("completed");
          setCallOutcome("Reached voicemail, left a nice message!");
          setLoading(false);
        }, 3500);
      }, 2500);
    }, 1500);
  };

  // Step content rendering
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="w-full flex flex-col items-center gap-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-orange-700">Step 1: Record a Voice Message</h2>
            <VoiceRecorderWrapper
              onRecordingComplete={(blob: Blob) => {
                setAudioBlob(blob);
                setStep(1);
              }}
              onAssistantVoiceUpdated={() => setStep(1)}
            />
            <button
              className="mt-6 px-6 py-2 rounded bg-orange-500 text-white font-semibold shadow hover:bg-orange-600 transition"
              onClick={() => setStep(1)}
            >
              Skip and use default voice
            </button>
          </div>
        );
      case 1:
        return (
          <div className="w-full max-w-md animate-fade-in">
            <h2 className="text-2xl font-bold text-orange-700 mb-4">Step 2: Friend Details</h2>
            <FriendForm
              onSubmit={data => {
                setFriendData(data);
                setStep(2);
              }}
              initialData={friendData || undefined}
            />
            <button
              className="mt-4 text-orange-500 underline"
              onClick={() => setStep(0)}
            >
              Back to Recording
            </button>
          </div>
        );
      case 2:
        return (
          <div className="w-full flex flex-col items-center gap-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-orange-700">Step 3: Placing the Call</h2>
            <div className="w-full max-w-sm">
              <CallStatus
                status={
                  callStatus === "preparing"
                    ? "pending"
                    : callStatus === "calling"
                    ? "calling"
                    : callStatus === "inprogress"
                    ? "calling"
                    : callStatus === "completed"
                    ? "completed"
                    : "pending"
                }
                friendName={friendData?.name || "your friend"}
                outcome={callOutcome}
              />
            </div>
            <button
              className="mt-6 px-6 py-2 rounded bg-orange-500 text-white font-semibold shadow hover:bg-orange-600 transition"
              onClick={() => {
                triggerCall();
                setStep(3);
              }}
              disabled={loading}
            >
              {loading ? "Calling..." : "Start Call"}
            </button>
            <button
              className="mt-2 text-orange-500 underline"
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
              <p className="text-lg font-semibold text-green-700 mb-2">{callOutcome || "Call completed!"}</p>
              <p className="text-gray-700">Would you like to schedule a follow-up or try another friend?</p>
              <div className="flex gap-4 mt-6 justify-center">
                <button
                  className="px-4 py-2 rounded bg-orange-400 text-white font-semibold hover:bg-orange-500 transition"
                  onClick={() => {
                    setStep(0);
                    setAudioBlob(null);
                    setFriendData(null);
                    setCallStatus("preparing");
                    setCallOutcome("");
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
      <div className="w-full max-w-2xl bg-white/90 rounded-2xl shadow-xl p-6 sm:p-10 flex flex-col gap-4 animate-fade-in">
        <ProgressSteps step={step} />
        {renderStep()}
      </div>
      <footer className="mt-10 text-xs text-orange-600 opacity-70">Touchbase.fun &copy; {new Date().getFullYear()}</footer>
    </div>
  );
}
