export interface FriendData {
  name: string; // friendName in the form
  userName: string;
  phone: string;
  lastMemory: string;
  introduction: string;
  preferredTime?: string;
}

export interface CallFormData {
  userName: string;
  friendName: string;
  phone: string;
  lastMemory: string;
  introduction: string;
}

export interface SessionData {
  id: string;
  voiceId?: string;
  friendData: FriendData;
  callStatus: 'pending' | 'calling' | 'completed' | 'failed';
  scheduledTime?: string;
  createdAt: string;
}

export interface VoiceCloneResponse {
  voice_id: string;
  status: string;
}

export interface CallResponse {
  call_id: string;
  status: string;
}

export interface VoiceCloneRequest {
  audioFile: File;
  sessionId?: string;
}

export interface VoiceCloneResponse {
  success: boolean;
  voiceId?: string;
  sessionId?: string;
  error?: string;
  details?: string;
}
