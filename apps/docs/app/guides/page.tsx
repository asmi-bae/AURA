export default function GuidesPage() {
  return (
    <div style={{ maxWidth: "900px" }}>
      <h1>Developer Guides</h1>
      <p>
        Step-by-step guides to help you build with AURA.
      </p>

      <div style={{ marginTop: "2rem" }}>
        <h2>Getting Started Guides</h2>
        <ul>
          <li>
            <a href="/guides/creating-your-first-agent">
              Creating Your First Agent
            </a>
          </li>
          <li>
            <a href="/guides/building-workflows">
              Building Workflows
            </a>
          </li>
          <li>
            <a href="/guides/installing-plugins">
              Installing Plugins
            </a>
          </li>
        </ul>

        <h2>Advanced Guides</h2>
        <ul>
          <li>
            <a href="/guides/custom-plugins">
              Creating Custom Plugins
            </a>
          </li>
          <li>
            <a href="/guides/workflow-triggers">
              Using Workflow Triggers
            </a>
          </li>
          <li>
            <a href="/guides/agent-capabilities">
              Agent Capabilities
            </a>
          </li>
          <li>
            <a href="/guides/rag-integration">
              RAG Integration
            </a>
          </li>
        </ul>

        <h2>Deployment Guides</h2>
        <ul>
          <li>
            <a href="/guides/docker-deployment">
              Docker Deployment
            </a>
          </li>
          <li>
            <a href="/guides/kubernetes-setup">
              Kubernetes Setup
            </a>
          </li>
          <li>
            <a href="/guides/environment-configuration">
              Environment Configuration
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
