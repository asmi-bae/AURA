"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";

interface Workflow {
  id: string;
  name: string;
  status: string;
  lastRun?: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch(`${GATEWAY_URL}/api/v1/workflows`);
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error("Error fetching workflows:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Workflows</h1>
        <button className={styles.createButton}>Create Workflow</button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading workflows...</div>
      ) : workflows.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No workflows found. Create your first workflow to get started.</p>
          <button className={styles.createButton}>Create Workflow</button>
        </div>
      ) : (
        <div className={styles.workflowsGrid}>
          {workflows.map((workflow) => (
            <div key={workflow.id} className={styles.workflowCard}>
              <h3>{workflow.name || workflow.id}</h3>
              <div className={styles.workflowMeta}>
                <span className={`${styles.status} ${styles[workflow.status]}`}>
                  {workflow.status}
                </span>
                {workflow.lastRun && (
                  <span className={styles.lastRun}>
                    Last run: {new Date(workflow.lastRun).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className={styles.workflowActions}>
                <button>Edit</button>
                <button>Run</button>
                <button>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
