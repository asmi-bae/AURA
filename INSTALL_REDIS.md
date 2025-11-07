# Installing Redis on macOS

Redis is required for AURA to run. Here are the installation options:

## Option 1: Install Homebrew (Recommended)

1. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   Follow the on-screen instructions. This may require your password.

2. **Install Redis**:
   ```bash
   brew install redis
   ```

3. **Start Redis**:
   ```bash
   brew services start redis
   ```
   Or run it manually:
   ```bash
   redis-server
   ```

## Option 2: Install Redis from Source

1. **Download Redis**:
   ```bash
   cd /tmp
   curl -O https://download.redis.io/redis-stable.tar.gz
   tar xzf redis-stable.tar.gz
   cd redis-stable
   ```

2. **Compile and Install**:
   ```bash
   make
   sudo make install
   ```

3. **Start Redis**:
   ```bash
   redis-server
   ```

## Option 3: Use Docker (if Docker is installed)

```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

## Verify Installation

After installing Redis, verify it's running:

```bash
redis-cli ping
```

You should see: `PONG`

## Start AURA Services

Once Redis is running, start the AURA services:

```bash
pnpm dev
```

