export interface PluginConfig {
  id: string;
  name: string;
  version: string;
  type: 'integration' | 'node' | 'trigger';
  description?: string;
  icon?: string;
  credentials?: CredentialDefinition[];
  properties?: NodeProperty[];
  methods?: PluginMethods;
}

export interface CredentialDefinition {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required?: boolean;
  default?: any;
}

export interface NodeProperty {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'options' | 'array';
  required?: boolean;
  default?: any;
  options?: { name: string; value: any }[];
}

export interface PluginMethods {
  execute?: (context: ExecutionContext) => Promise<any>;
  trigger?: (context: TriggerContext) => Promise<void>;
  testConnection?: (credentials: Record<string, any>) => Promise<boolean>;
}

export interface ExecutionContext {
  node: string;
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
  inputData: any;
}

export interface TriggerContext {
  node: string;
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
  callback: (data: any) => Promise<void>;
}

