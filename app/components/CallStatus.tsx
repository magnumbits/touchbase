"use client";
import React from 'react';

interface CallStatusProps {
  status: 'pending' | 'calling' | 'completed' | 'failed';
  friendName?: string;
  outcome?: string;
}

export default function CallStatus({ status, friendName = "your friend", outcome = "" }: CallStatusProps) {
  let message = "";
  switch (status) {
    case "pending":
      message = `Preparing to call...`;
      break;
    case "calling":
      message = `Calling ${friendName}...`;
      break;
    case "completed":
      message = `Call completed - ${outcome || "Success!"}`;
      break;
    case "failed":
      message = `Call failed. Please try again.`;
      break;
    default:
      message = "";
  }
  return (
    <div className="text-center my-4">
      <span className="text-lg font-semibold">{message}</span>
    </div>
  );
}
