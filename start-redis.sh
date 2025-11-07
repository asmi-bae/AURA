#!/bin/bash
# Quick Redis installation and start script for macOS

echo "🔍 Checking for Redis..."

# Check if Redis is already running
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is already running!"
    exit 0
fi

# Check if Redis is installed but not running
if command -v redis-server &> /dev/null; then
    echo "📦 Redis is installed, starting it..."
    redis-server --daemonize yes
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis started successfully!"
        exit 0
    fi
fi

# Try to find Homebrew
BREW_PATH=""
if [ -x "/opt/homebrew/bin/brew" ]; then
    BREW_PATH="/opt/homebrew/bin/brew"
elif [ -x "/usr/local/bin/brew" ]; then
    BREW_PATH="/usr/local/bin/brew"
fi

if [ -n "$BREW_PATH" ]; then
    echo "📦 Installing Redis via Homebrew..."
    $BREW_PATH install redis
    $BREW_PATH services start redis
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis installed and started successfully!"
        exit 0
    fi
fi

echo "❌ Redis installation failed. Please install Redis manually:"
echo ""
echo "Option 1: Install Homebrew first, then Redis:"
echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
echo "  brew install redis"
echo "  brew services start redis"
echo ""
echo "Option 2: Use Docker (if installed):"
echo "  docker run -d -p 6379:6379 --name redis redis:7-alpine"
echo ""
echo "Option 3: Download from https://redis.io/download"
exit 1

