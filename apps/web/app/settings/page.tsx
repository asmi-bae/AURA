"use client";

import styles from "./page.module.css";

export default function SettingsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Settings</h1>
      </div>

      <div className={styles.settingsGrid}>
        <div className={styles.settingsSection}>
          <h2>General</h2>
          <div className={styles.settingItem}>
            <label>Platform Name</label>
            <input type="text" defaultValue="AURA" />
          </div>
          <div className={styles.settingItem}>
            <label>Timezone</label>
            <select defaultValue="UTC">
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h2>API Configuration</h2>
          <div className={styles.settingItem}>
            <label>Gateway URL</label>
            <input
              type="text"
              defaultValue={process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000"}
            />
          </div>
          <div className={styles.settingItem}>
            <label>API Key</label>
            <input type="password" placeholder="Enter API key" />
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h2>Services</h2>
          <div className={styles.serviceStatus}>
            <div className={styles.serviceItem}>
              <span>Gateway</span>
              <span className={styles.statusBadge}>Online</span>
            </div>
            <div className={styles.serviceItem}>
              <span>Workflow Engine</span>
              <span className={styles.statusBadge}>Online</span>
            </div>
            <div className={styles.serviceItem}>
              <span>Agent Service</span>
              <span className={styles.statusBadge}>Online</span>
            </div>
            <div className={styles.serviceItem}>
              <span>Plugin Service</span>
              <span className={styles.statusBadge}>Online</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.saveButton}>Save Changes</button>
        <button className={styles.resetButton}>Reset to Defaults</button>
      </div>
    </div>
  );
}
