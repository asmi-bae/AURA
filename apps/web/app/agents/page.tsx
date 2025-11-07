"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";

interface Agent {
  id: string;
  name?: string;
  status: string;
  tasksCompleted?: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${GATEWAY_URL}/api/v1/agents`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Agents</h1>
        <button className={styles.createButton}>Create Agent</button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No agents found. Create your first agent to get started.</p>
          <button className={styles.createButton}>Create Agent</button>
        </div>
      ) : (
        <div className={styles.agentsGrid}>
          {agents.map((agent) => (
            <div key={agent.id} className={styles.agentCard}>
              <h3>{agent.name || agent.id}</h3>
              <div className={styles.agentMeta}>
                <span className={`${styles.status} ${styles[agent.status]}`}>
                  {agent.status}
                </span>
                {agent.tasksCompleted !== undefined && (
                  <span className={styles.tasks}>
                    Tasks: {agent.tasksCompleted}
                  </span>
                )}
              </div>
              <div className={styles.agentActions}>
                <button>View</button>
                <button>Start</button>
                <button>Stop</button>
                <button>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
