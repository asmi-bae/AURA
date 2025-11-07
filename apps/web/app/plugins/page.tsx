"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";

interface Plugin {
  id: string;
  name?: string;
  enabled: boolean;
  version?: string;
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlugins();
  }, []);

  const fetchPlugins = async () => {
    try {
      const response = await fetch(`${GATEWAY_URL}/api/v1/plugins`);
      if (response.ok) {
        const data = await response.json();
        setPlugins(data.plugins || []);
      }
    } catch (error) {
      console.error("Error fetching plugins:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      const endpoint = enabled ? "enable" : "disable";
      const response = await fetch(
        `${GATEWAY_URL}/api/v1/plugins/${pluginId}/${endpoint}`,
        { method: "POST" }
      );
      if (response.ok) {
        fetchPlugins(); // Refresh list
      }
    } catch (error) {
      console.error("Error toggling plugin:", error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Plugins</h1>
        <button className={styles.installButton}>Install Plugin</button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading plugins...</div>
      ) : plugins.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No plugins installed. Install your first plugin to get started.</p>
          <button className={styles.installButton}>Install Plugin</button>
        </div>
      ) : (
        <div className={styles.pluginsGrid}>
          {plugins.map((plugin) => (
            <div key={plugin.id} className={styles.pluginCard}>
              <h3>{plugin.name || plugin.id}</h3>
              <div className={styles.pluginMeta}>
                {plugin.version && (
                  <span className={styles.version}>v{plugin.version}</span>
                )}
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={plugin.enabled}
                    onChange={(e) => togglePlugin(plugin.id, e.target.checked)}
                  />
                  <span>{plugin.enabled ? "Enabled" : "Disabled"}</span>
                </label>
              </div>
              <div className={styles.pluginActions}>
                <button>Configure</button>
                <button>Uninstall</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
