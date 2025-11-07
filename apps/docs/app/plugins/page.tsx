export default function PluginsPage() {
  return (
    <div style={{ maxWidth: "900px" }}>
      <h1>Plugin Development</h1>
      <p>
        Learn how to create custom plugins for AURA.
      </p>

      <h2>Plugin Structure</h2>
      <p>A plugin is a JavaScript/TypeScript module that exports:</p>
      <pre
        style={{
          background: "#f5f5f5",
          padding: "1rem",
          borderRadius: "4px",
          overflow: "auto",
        }}
      >
        {`export interface Plugin {
  id: string;
  name: string;
  version: string;
  execute: (input: any) => Promise<any>;
  metadata?: Record<string, any>;
}`}
      </pre>

      <h2>Creating a Plugin</h2>
      <ol>
        <li>Create a plugin file</li>
        <li>Define plugin interface</li>
        <li>Implement execute function</li>
        <li>Export plugin configuration</li>
      </ol>

      <h2>Example Plugin</h2>
      <pre
        style={{
          background: "#f5f5f5",
          padding: "1rem",
          borderRadius: "4px",
          overflow: "auto",
        }}
      >
        {`export default {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  execute: async (input) => {
    // Plugin logic here
    return { result: 'success' };
  },
  metadata: {
    description: 'A sample plugin',
  },
};`}
      </pre>

      <h2>Plugin Loading</h2>
      <p>Plugins can be loaded from:</p>
      <ul>
        <li>Local file system</li>
        <li>npm packages</li>
        <li>URL (HTTP/HTTPS)</li>
      </ul>

      <h2>Plugin API</h2>
      <p>
        Plugins have access to the AURA runtime environment and can interact
        with other services through the plugin API.
      </p>

      <h2>Best Practices</h2>
      <ul>
        <li>Keep plugins focused on a single task</li>
        <li>Handle errors gracefully</li>
        <li>Document plugin behavior</li>
        <li>Test plugins thoroughly</li>
        <li>Follow security best practices</li>
      </ul>
    </div>
  );
}
