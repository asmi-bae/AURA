import { AuraPlugin } from '@aura/plugins';
import path from 'path';
import fs from 'fs';
import chokidar, { FSWatcher } from 'chokidar';
import { VM } from 'vm2';
import rateLimit from 'express-rate-limit';

export class PluginLoader {
  private plugins: Map<string, AuraPlugin> = new Map();
  private watcher: FSWatcher | null = null;
  private vm = new VM({
    sandbox: {},
    timeout: 5000,
    allowAsync: false
  });
  private rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });

  async loadPlugins(pluginsDir: string, watch: boolean = false) {
    // Load initial plugins
    await this.reloadPlugins(pluginsDir);

    if (watch) {
      this.watcher = chokidar.watch(pluginsDir, {
        ignored: /(^|[\/\\])\./,
        persistent: true,
        ignoreInitial: true
      });

      this.watcher
        .on('add', async (filePath: string) => {
          if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            await this.loadPlugin(filePath);
          }
        })
        .on('unlink', async (filePath: string) => {
          const pluginName = this.getPluginNameFromPath(filePath);
          if (pluginName) {
            this.plugins.delete(pluginName);
          }
        });
    }
  }

  private async reloadPlugins(pluginsDir: string) {
    const pluginFiles = fs.readdirSync(pluginsDir)
      .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

    for (const file of pluginFiles) {
      await this.loadPlugin(path.join(pluginsDir, file));
    }
  }

  private async loadPlugin(pluginPath: string) {
    try {
      // Clear require cache to reload the module
      delete require.cache[require.resolve(pluginPath)];
      
      const pluginCode = fs.readFileSync(pluginPath, 'utf8');
      
      // Run plugin in sandbox
      this.vm.run(pluginCode);
      
      const pluginModule = require(pluginPath);
      
      if (!pluginModule.default) {
        console.error(`Plugin ${pluginPath} does not export a default class`);
        return;
      }
      
      const plugin = new pluginModule.default();
      if (this.isAuraPlugin(plugin)) {
        // Apply rate limiting to execute method
        const originalExecute = plugin.execute.bind(plugin);
        plugin.execute = async (params: any) => {
          return this.rateLimiter(params.req, params.res, () => {
            return originalExecute(params);
          });
        };
        
        this.plugins.set(plugin.name, plugin);
        await plugin.init();
        console.log(`Loaded plugin: ${plugin.name}`);
      } else {
        console.error(`Plugin ${pluginPath} does not implement AuraPlugin interface`);
      }
    } catch (error) {
      console.error(`Error loading plugin ${pluginPath}:`, error);
    }
  }

  private getPluginNameFromPath(pluginPath: string): string | null {
    const pluginName = path.basename(pluginPath, path.extname(pluginPath));
    return this.plugins.has(pluginName) ? pluginName : null;
  }

  getPlugin(name: string): AuraPlugin | undefined {
    return this.plugins.get(name);
  }

  private isAuraPlugin(obj: any): obj is AuraPlugin {
    return 'name' in obj && 'init' in obj && 'execute' in obj;
  }

  close() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}
