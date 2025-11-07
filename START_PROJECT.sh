#!/bin/bash
# Complete project startup script for AURA

set -e

echo "🚀 Starting AURA Project..."
echo ""

# Step 1: Check Redis
echo "📦 Step 1: Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running"
    echo ""
    echo "Please install and start Redis first:"
    echo ""
    echo "Option 1: Install Homebrew and Redis (recommended)"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "  brew install redis"
    echo "  brew services start redis"
    echo ""
    echo "Option 2: Use Docker"
    echo "  docker run -d -p 6379:6379 --name redis redis:7-alpine"
    echo ""
    echo "After Redis is running, run this script again:"
    echo "  ./START_PROJECT.sh"
    exit 1
fi

# Step 2: Verify .env exists
echo ""
echo "📝 Step 2: Checking .env file..."
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cat > .env << 'ENVEOF'
# Database (use SQLite for development)
DB_TYPE=sqlite
DB_HOST=localhost
DB_PORT=5432
DB_USER=aura
DB_PASS=password
DB_NAME=aura

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-change-in-production-min-32-chars

# Service URLs
GATEWAY_URL=http://localhost:3000
REGISTRY_URL=http://localhost:3008

# Optional: OAuth (leave empty if not using)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Optional: AI Services
OPENAI_API_KEY=

# Optional: Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
ENVEOF
    echo "✅ .env file created"
else
    echo "✅ .env file exists"
fi

# Step 3: Check if packages are built
echo ""
echo "🔨 Step 3: Checking if packages are built..."
if [ ! -d "packages/core/dist" ]; then
    echo "⚠️  Packages not built. Building now..."
    pnpm build
    echo "✅ Build complete"
else
    echo "✅ Packages are built"
fi

# Step 4: Start services
echo ""
echo "🚀 Step 4: Starting all services..."
echo "   This will start all AURA services in development mode."
echo "   Press Ctrl+C to stop all services."
echo ""
echo "   Services will be available at:"
echo "   - Gateway: http://localhost:3000"
echo "   - Workflow Engine: http://localhost:3001"
echo "   - Agent Service: http://localhost:3006"
echo "   - Registry: http://localhost:3008"
echo "   - Auth Service: http://localhost:3013"
echo ""

# Start with increased concurrency for all services
pnpm dev --concurrency=25

