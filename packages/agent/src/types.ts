export interface AgentCapabilities {
  screenStream: boolean;
  voiceIO: boolean;
  automation: boolean;
  os: 'windows' | 'macos' | 'linux';
  version: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  serverUrl: string;
  capabilities: AgentCapabilities;
  encryptionKey?: string;
  reconnectInterval?: number;
}

export interface AutomationCommand {
  type: 'mouse-move' | 'mouse-click' | 'mouse-drag' | 'keyboard-type' | 'keyboard-press' | 'keyboard-shortcut' | 'screen-capture';
  x?: number;
  y?: number;
  button?: 'left' | 'right' | 'middle';
  text?: string;
  key?: string;
  keys?: string[];
  format?: 'png' | 'jpeg';
}

export interface ScreenCaptureResult {
  image: Buffer | string; // base64 or buffer
  format: string;
  timestamp: number;
  dimensions?: { width: number; height: number };
}

export interface AgentStatus {
  connected: boolean;
  id: string;
  capabilities: AgentCapabilities;
  lastSeen: Date;
}

