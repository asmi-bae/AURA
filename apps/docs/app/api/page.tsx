export default function APIPage() {
  return (
    <div style={{ maxWidth: "900px" }}>
      <h1>API Reference</h1>
      <p>
        Complete API documentation for all AURA services.
      </p>

      <h2>Services</h2>
      <ul>
        <li>
          <a href="/api/gateway">Gateway API</a> (Port 3000) - Main API gateway
        </li>
        <li>
          <a href="/api/workflow-engine">Workflow Engine API</a> (Port 3001) -
          Workflow execution
        </li>
        <li>
          <a href="/api/agent">Agent Service API</a> (Port 3006) - Agent
          management
        </li>
        <li>
          <a href="/api/plugin">Plugin Service API</a> (Port 3007) - Plugin
          management
        </li>
        <li>
          <a href="/api/registry">Registry Service API</a> (Port 3008) -
          Service discovery
        </li>
        <li>
          <a href="/api/messaging">Messaging Service API</a> (Port 3009) -
          Messaging channels
        </li>
        <li>
          <a href="/api/analytics">Analytics Service API</a> (Port 3010) -
          Statistics and metrics
        </li>
        <li>
          <a href="/api/rag">RAG Service API</a> (Port 3011) - RAG operations
        </li>
        <li>
          <a href="/api/vector">Vector Service API</a> (Port 3012) - Vector
          operations
        </li>
      </ul>

      <h2>Authentication</h2>
      <p>
        Most API endpoints require authentication using JWT tokens. Include the
        token in the Authorization header:
      </p>
      <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "4px" }}>
        {`Authorization: Bearer <your-token>`}
      </pre>

      <h2>Base URLs</h2>
      <ul>
        <li>
          <strong>Development:</strong> http://localhost:3000
        </li>
        <li>
          <strong>Production:</strong> https://api.aura.example.com
        </li>
      </ul>

      <h2>Common Endpoints</h2>
      <ul>
        <li>
          <code>GET /health</code> - Health check (all services)
        </li>
        <li>
          <code>GET /api/v1/agents</code> - List agents
        </li>
        <li>
          <code>GET /api/v1/workflows</code> - List workflows
        </li>
        <li>
          <code>GET /api/v1/plugins</code> - List plugins
        </li>
      </ul>
    </div>
  );
}
