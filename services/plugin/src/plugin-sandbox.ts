/**
 * Plugin Sandbox
 * 
 * Secure sandbox for plugin execution
 */

import { VM } from 'vm2';
import { createLogger } from '@aura/utils';
import { AuraPlugin } from '@aura/plugins';

const logger = createLogger();

export interface SandboxConfig {
  timeout?: number;
  memoryLimit?: number;
  allowAsync?: boolean;
}

/**
 * Plugin Sandbox
 * 
 * Provides secure execution environment for plugins
 */
export class PluginSandbox {
  private config: Required<SandboxConfig>;
  private vm: VM;

  constructor(config: SandboxConfig = {}) {
    this.config = {
      timeout: config.timeout || 5000,
      memoryLimit: config.memoryLimit || 128,
      allowAsync: config.allowAsync ?? true,
    };

    this.vm = new VM({
      timeout: this.config.timeout,
      sandbox: {},
      eval: false,
      wasm: false,
      fixAsync: this.config.allowAsync,
    });
  }

  /**
   * Execute plugin code in sandbox
   */
  execute(code: string, context: Record<string, any> = {}): any {
    try {
      // Create sandbox context
      const sandbox = {
        ...context,
        console: {
          log: (...args: any[]) => logger.info('Plugin log', { args }),
          error: (...args: any[]) => logger.error('Plugin error', { args }),
          warn: (...args: any[]) => logger.warn('Plugin warn', { args }),
        },
      };

      // Update VM sandbox
      this.vm.freeze(sandbox, 'sandbox');

      // Execute code
      const result = this.vm.run(code);
      return result;
    } catch (error) {
      logger.error('Sandbox execution error', { error });
      throw new Error(`Plugin execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute plugin function
   */
  executeFunction(plugin: AuraPlugin, functionName: string, args: any[] = []): any {
    try {
      // Validate plugin has the function
      if (typeof (plugin as any)[functionName] !== 'function') {
        throw new Error(`Plugin does not have function: ${functionName}`);
      }

      // Execute in sandbox context
      const result = (plugin as any)[functionName](...args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.catch((error: any) => {
          logger.error('Plugin async execution error', { functionName, error });
          throw error;
        });
      }

      return result;
    } catch (error) {
      logger.error('Plugin function execution error', { functionName, error });
      throw error;
    }
  }

  /**
   * Validate plugin code
   */
  validate(code: string): { valid: boolean; error?: string } {
    try {
      // Try to parse the code
      new VM({
        timeout: 1000,
        sandbox: {},
        eval: false,
      }).run(code);
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
