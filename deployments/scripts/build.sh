#!/bin/bash

# Build script for AURA services

set -e

echo "Building AURA services..."

# Build all packages
echo "Building packages..."
pnpm --filter "@aura/core" build
pnpm --filter "@aura/db" build
pnpm --filter "@aura/utils" build
pnpm --filter "@aura/types" build
pnpm --filter "@aura/auth" build
pnpm --filter "@aura/ai" build

# Build all services
echo "Building services..."
pnpm --filter "@aura/workflow-engine" build
pnpm --filter "@aura/webhook-handler" build
pnpm --filter "@aura/scheduler" build
pnpm --filter "@aura/notification" build
pnpm --filter "@aura/collaboration" build

echo "Build complete!"

