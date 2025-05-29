export interface FriendData {
  name: string;
  phone: string;
  lastMemory: string;
  introduction: string;
  preferredTime?: string;
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
