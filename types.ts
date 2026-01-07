
export enum AgentStatus {
  IDLE = 'idle',
  THINKING = 'thinking',
  GENERATING = 'generating',
  RECORDING = 'recording',
  LIVE = 'live',
  ERROR = 'error'
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface Attachment {
  type: 'image' | 'video' | 'audio' | 'text' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'code' | 'note';
  url: string;
  data?: string;
  mimeType: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  groundingSources?: GroundingSource[];
  isThinking?: boolean;
}

export interface GenerationParams {
  prompt: string;
  mode: 'text' | 'image' | 'video' | 'search' | 'maps' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'code' | 'note';
  attachment?: Attachment;
}
