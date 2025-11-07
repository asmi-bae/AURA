export default function DocsHome() {
  return (
    <div style={{ maxWidth: "900px" }}>
      <h1>Welcome to AURA Documentation</h1>
      <p>
        AURA is an AI-powered automation platform that enables you to build,
        deploy, and manage intelligent agents, workflows, and plugins.
      </p>

      <h2>Quick Start</h2>
      <ol>
        <li>Install dependencies: <code>pnpm install</code></li>
        <li>Configure environment variables</li>
        <li>Start services: <code>pnpm dev</code></li>
        <li>Access the dashboard at <code>http://localhost:3000</code></li>
      </ol>

      <h2>Getting Started</h2>
      <p>
        Learn the basics of AURA and how to get started with your first
        automation.
      </p>

      <h2>Core Concepts</h2>
      <ul>
        <li>
          <strong>Agents:</strong> Intelligent AI agents that can perform tasks
          autonomously
        </li>
        <li>
          <strong>Workflows:</strong> Automated workflows that orchestrate
          multiple steps
        </li>
        <li>
          <strong>Plugins:</strong> Extensible plugins that add functionality
        </li>
        <li>
          <strong>Triggers:</strong> Events that start workflows (webhooks,
          timers, AI)
        </li>
      </ul>

      <h2>Resources</h2>
      <ul>
        <li>
          <a href="/guides">Developer Guides</a> - Step-by-step guides
        </li>
        <li>
          <a href="/api">API Reference</a> - Complete API documentation
        </li>
        <li>
          <a href="/plugins">Plugin Development</a> - Build custom plugins
        </li>
        <li>
          <a href="/integrations">Integrations</a> - Third-party integrations
        </li>
      </ul>
    </div>
  );
}