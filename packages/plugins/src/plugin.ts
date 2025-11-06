export interface AuraPlugin {
  name: string;
  init(): Promise<void>;
  execute(params: any): Promise<any>;
}
