# AI Model Providers

This directory contains implementations for different AI model providers.

## Structure

Each provider should be organized in its own directory with the following structure:

```
provider-name/
├── index.ts          # Exports for the provider
├── provider.service.ts  # Main service implementation
├── types.ts          # Provider-specific types
└── README.md         # Provider-specific documentation
```

## Adding a New Provider

1. Create a new directory under `providers/` with your provider name
2. Implement the provider service extending `BaseModel` or implementing `IModel`
3. Export the service from `index.ts`
4. Register the provider in `providers/index.ts`
5. Add configuration in `config/model-config.ts`

## Example

See `custom/` directory for a template implementation.

