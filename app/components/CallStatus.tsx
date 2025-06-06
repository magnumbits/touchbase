"use client";
import React, { useState, useEffect, useCallback } from 'react';

interface CallStatusProps {
  callId?: string;
  friendName?: string;
  onCallCompleted?: (summary: string) => void;
}

type CallState = {
  status: 'loading' | 'preparing' | 'calling' | 'in-progress' | 'completed' | 'failed' | 'unknown';
  summary: string | null;
  recordingUrl: string | null;
  error: string | null;
  pollingActive: boolean;
};

// Helper function to parse DD-MM-YYYY HH:MM string
const parseDateTimeFromSummary = (summary: string): Date | null | 'NO_CALL_SCHEDULED' => {
  if (summary.includes('<NO CALL SCHEDULED>')) {
    return 'NO_CALL_SCHEDULED';
  }
  const dateTimeRegex = /(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/;
  const match = summary.match(dateTimeRegex);
  if (match) {
    const [, day, month, year, hours, minutes] = match.map(Number);
    // Month is 0-indexed in JavaScript Date objects
    return new Date(year, month - 1, day, hours, minutes);
  }
  return null;
};

// Helper function to generate Google Calendar link
const generateGoogleCalendarLink = (
  startDate: Date,
  friendName: string,
  summary: string
): string | null => {
  if (!startDate) return null;

  const endDate = new Date(startDate.getTime() + 30 * 60000); // Add 30 minutes

  // Format dates as YYYYMMDDTHHMMSSZ (UTC)
  const formatDateForGoogle = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '');
  };

  const googleCalendarUrl = new URL('https://www.google.com/calendar/render');
  googleCalendarUrl.searchParams.append('action', 'TEMPLATE');
  googleCalendarUrl.searchParams.append('text', `Chat with ${friendName}`);
  googleCalendarUrl.searchParams.append('dates', `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`);
  googleCalendarUrl.searchParams.append('details', summary);
  googleCalendarUrl.searchParams.append('ctz', 'UTC'); // Assuming times are UTC or convert as needed

  return googleCalendarUrl.toString();
};


export default function CallStatus({ callId, friendName = "your friend", onCallCompleted }: CallStatusProps) {
  const [callState, setCallState] = useState<CallState>({
    status: callId ? 'loading' : 'preparing',
    summary: null,
    recordingUrl: null,
    error: null,
    pollingActive: !!callId,
  });
  const [calendarLink, setCalendarLink] = useState<string | null>(null);
  
  const POLLING_INTERVAL = 3000;
  const TERMINAL_STATES = React.useMemo(() => ['completed', 'failed'], []);
  
  const fetchCallStatus = useCallback(async () => {
    if (!callId || !callState.pollingActive) return;
    
    try {
      const response = await fetch(`/api/call-status?callId=${callId}`);
      const data = await response.json();
      
      if (!response.ok) {
        setCallState(prev => ({
          ...prev,
          status: 'failed',
          error: data.error || 'Failed to fetch call status',
          pollingActive: false
        }));
        return;
      }
      
      let uiStatus: CallState['status'] = 'unknown';
      if (data.status === 'scheduled') uiStatus = 'preparing';
      else if (data.status === 'ringing') uiStatus = 'calling';
      else if (data.status === 'in-progress') uiStatus = 'in-progress';
      else if (data.status === 'completed') uiStatus = 'completed';
      else if (data.status === 'failed') uiStatus = 'failed';
      
      if (uiStatus === 'completed' && data.summary && typeof onCallCompleted === 'function') {
        onCallCompleted(data.summary);
      }
      
      setCallState(prev => ({
        ...prev,
        status: uiStatus,
        summary: data.summary,
        recordingUrl: data.recordingUrl,
        error: null,
        pollingActive: !TERMINAL_STATES.includes(uiStatus)
      }));
    } catch (err: unknown) {
      console.error('Error fetching call status:', err);
      setCallState(prev => ({
        ...prev,
        error: (err && typeof err === 'object' && 'message' in err)
          ? (err as { message?: string }).message ?? 'Error fetching call status'
          : 'Error fetching call status',
      }));
    }
  }, [callId, callState.pollingActive, onCallCompleted, TERMINAL_STATES]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (callId && callState.pollingActive) {
      fetchCallStatus();
      intervalId = setInterval(fetchCallStatus, POLLING_INTERVAL);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [callId, callState.pollingActive, fetchCallStatus]);
  
  useEffect(() => {
    if (callId) {
      setCallState({
        status: 'loading',
        summary: null,
        recordingUrl: null,
        error: null,
        pollingActive: true,
      });
      setCalendarLink(null); // Reset calendar link too
    }
  }, [callId]);

  useEffect(() => {
    if (callState.summary && friendName) {
      const parsedDateOrSignal = parseDateTimeFromSummary(callState.summary);
      if (parsedDateOrSignal instanceof Date) {
        const link = generateGoogleCalendarLink(parsedDateOrSignal, friendName, callState.summary);
        setCalendarLink(link);
      } else {
        setCalendarLink(null); // No date or explicitly no call scheduled
      }
    } else {
      setCalendarLink(null);
    }
  }, [callState.summary, friendName]);
  
  let statusMessage = "";
  switch (callState.status) {
    case "loading": statusMessage = `Loading call status...`; break;
    case "preparing": statusMessage = `Preparing to call...`; break;
    case "calling": statusMessage = `Calling ${friendName}...`; break;
    case "in-progress": statusMessage = `Call in progress with ${friendName}...`; break;
    case "completed": statusMessage = `Call with ${friendName} completed!`; break;
    case "failed": statusMessage = `Call failed. Please try again.`; break;
    default: statusMessage = `Unknown call status`;
  }
  
  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center mb-2">
          <div className="mr-3">
            {callState.status === 'loading' && <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>}
            {(callState.status === 'preparing' || callState.status === 'calling') && <div className="w-6 h-6 rounded-full bg-blue-500 animate-pulse"></div>}
            {callState.status === 'in-progress' && <div className="w-6 h-6 rounded-full bg-green-500 animate-pulse"></div>}
            {callState.status === 'completed' && <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>}
            {callState.status === 'failed' && <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>}
          </div>
          <h3 className="text-lg font-semibold">{statusMessage}</h3>
        </div>
        {callState.error && <div className="text-red-500 text-sm mt-2">Error: {callState.error}</div>}
      </div>
      
      {callState.summary && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h4 className="text-md font-semibold mb-2">Call Summary</h4>
          <p className="text-gray-700 whitespace-pre-wrap">{callState.summary}</p>
        </div>
      )}
      
      {callState.recordingUrl && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h4 className="text-md font-semibold mb-2">Call Recording</h4>
          <audio className="w-full mt-2" controls src={callState.recordingUrl}></audio>
        </div>
      )}

      {/* Add to Calendar button moved here, appears only if summary and link exist */} 
      {callState.summary && calendarLink && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 text-center">
          <a
            href={calendarLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition duration-300"
          >
            Add to Calendar
          </a>
        </div>
      )}
    </div>
  );
}