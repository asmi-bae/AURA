"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";

export default function Dashboard() {
  const [stats, setStats] = useState({
    agents: 0,
    workflows: 0,
    plugins: 0,
    executions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch stats from analytics service
      const [agentsRes, workflowsRes, pluginsRes] = await Promise.all([
        fetch(`${GATEWAY_URL}/api/v1/agents`).catch(() => null),
        fetch(`${GATEWAY_URL}/api/v1/workflows`).catch(() => null),
        fetch(`${GATEWAY_URL}/api/v1/plugins`).catch(() => null),
      ]);

      const agentsData = agentsRes ? await agentsRes.json().catch(() => ({})) : {};
      const workflowsData = workflowsRes ? await workflowsRes.json().catch(() => ({})) : {};
      const pluginsData = pluginsRes ? await pluginsRes.json().catch(() => ({})) : {};

      setStats({
        agents: agentsData.total || 0,
        workflows: workflowsData.total || 0,
        plugins: pluginsData.total || 0,
        executions: 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <p>Welcome to AURA - AI Automation Platform</p>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Agents</h3>
            <p className={styles.statValue}>{stats.agents}</p>
            <p className={styles.statLabel}>Active agents</p>
          </div>

          <div className={styles.statCard}>
            <h3>Workflows</h3>
            <p className={styles.statValue}>{stats.workflows}</p>
            <p className={styles.statLabel}>Configured workflows</p>
          </div>

          <div className={styles.statCard}>
            <h3>Plugins</h3>
            <p className={styles.statValue}>{stats.plugins}</p>
            <p className={styles.statLabel}>Installed plugins</p>
          </div>

          <div className={styles.statCard}>
            <h3>Executions</h3>
            <p className={styles.statValue}>{stats.executions}</p>
            <p className={styles.statLabel}>Total executions</p>
          </div>
        </div>
      )}

      <div className={styles.sections}>
        <div className={styles.section}>
          <h2>Quick Actions</h2>
          <div className={styles.actionGrid}>
            <a href="/workflows/new" className={styles.actionCard}>
              Create Workflow
            </a>
            <a href="/agents/new" className={styles.actionCard}>
              Create Agent
            </a>
            <a href="/plugins/install" className={styles.actionCard}>
              Install Plugin
            </a>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Recent Activity</h2>
          <p className={styles.emptyState}>No recent activity</p>
        </div>
      </div>
    </div>
  );
}