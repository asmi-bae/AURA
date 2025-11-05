// TypeScript definitions for real-time agent
export interface AgentConfig {
  serverUrl: string;
  reconnectInterval: number;
  cachePath: string;
}

export interface WorkflowCommand {
  id: string;
  type: 'mouse-move' | 'mouse-click' | 'keyboard-type' | 'keyboard-press' | 'screen-capture';
  x?: number;
  y?: number;
  button?: 'left' | 'right' | 'middle';
  text?: string;
  key?: string;
  format?: string;
}

export interface ScreenCaptureOptions {
  format?: 'png' | 'jpeg';
  quality?: number;
  width?: number;
  height?: number;
}

export interface AgentStatus {
  connected: boolean;
  platform: string;
  version: string;
  serverUrl: string;
}

