export default function IntegrationsPage() {
  return (
    <div style={{ maxWidth: "900px" }}>
      <h1>Integrations</h1>
      <p>
        AURA integrates with various third-party services and platforms.
      </p>

      <h2>Messaging Platforms</h2>
      <ul>
        <li>
          <strong>Discord</strong> - Send messages and receive events
        </li>
        <li>
          <strong>Telegram</strong> - Bot integration
        </li>
        <li>
          <strong>Email</strong> - SMTP integration
        </li>
        <li>
          <strong>WebSocket</strong> - Real-time communication
        </li>
      </ul>

      <h2>AI Providers</h2>
      <ul>
        <li>
          <strong>OpenAI</strong> - GPT models
        </li>
        <li>
          <strong>Anthropic</strong> - Claude models
        </li>
        <li>
          <strong>Google</strong> - Gemini models
        </li>
        <li>
          <strong>Ollama</strong> - Local models
        </li>
      </ul>

      <h2>Vector Stores</h2>
      <ul>
        <li>
          <strong>Pinecone</strong> - Managed vector database
        </li>
        <li>
          <strong>Weaviate</strong> - Open-source vector database
        </li>
        <li>
          <strong>Memory</strong> - In-memory store (development)
        </li>
      </ul>

      <h2>Authentication</h2>
      <ul>
        <li>
          <strong>OAuth2</strong> - Google, GitHub
        </li>
        <li>
          <strong>JWT</strong> - Token-based authentication
        </li>
      </ul>

      <h2>Notification Services</h2>
      <ul>
        <li>
          <strong>Slack</strong> - Slack notifications
        </li>
        <li>
          <strong>Email</strong> - Email notifications
        </li>
        <li>
          <strong>SMS</strong> - SMS notifications
        </li>
        <li>
          <strong>Push</strong> - Push notifications
        </li>
      </ul>

      <h2>Configuration</h2>
      <p>
        Configure integrations through environment variables or the settings
        page in the dashboard.
      </p>
    </div>
  );
}
