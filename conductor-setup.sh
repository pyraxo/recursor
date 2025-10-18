#!/bin/bash
set -e

echo "🔧 Setting up Conductor workspace for Recursor..."
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed."
    echo "   Please install pnpm first: npm install -g pnpm"
    echo "   Required version: pnpm@9.0.0 or higher"
    exit 1
fi

echo "✅ pnpm is installed ($(pnpm --version))"

# Check if Node.js version meets requirements
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ is required (you have Node.js $NODE_VERSION)"
    echo "   Please upgrade Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js meets requirements ($(node --version))"
echo ""

# Determine environment file source
if [ -n "$CONDUCTOR_ROOT_PATH" ]; then
    ENV_SOURCE="$CONDUCTOR_ROOT_PATH/.env.local"
    if [ ! -f "$ENV_SOURCE" ]; then
        ENV_SOURCE="$CONDUCTOR_ROOT_PATH/.env"
    fi
else
    echo "⚠️  Warning: CONDUCTOR_ROOT_PATH not set"
    ENV_SOURCE=".env.local"
fi

# Copy environment file if it exists
if [ -f "$ENV_SOURCE" ]; then
    echo "📋 Copying environment variables from $ENV_SOURCE..."
    cp "$ENV_SOURCE" .env.local
    echo "✅ Environment file copied to .env.local"
else
    echo "⚠️  No environment file found at $ENV_SOURCE"
    echo ""
    echo "   Creating template .env.local file..."
    cat > .env.local << 'EOF'
# Convex Backend
# Get these values by running: npx convex dev
CONVEX_URL=
NEXT_PUBLIC_CONVEX_URL=

# LLM API Keys (at least one required)
# Get from https://console.groq.com/keys (free tier available)
GROQ_API_KEY=

# Optional: Fallback LLM providers
# Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=

# Get from https://aistudio.google.com/apikey
GEMINI_API_KEY=
EOF
    echo "⚠️  Created .env.local template"
    echo ""
    echo "❌ REQUIRED ACTION: You must configure environment variables!"
    echo ""
    echo "   1. Run 'npx convex dev' in the base repo to get CONVEX_URL"
    echo "   2. Get a GROQ_API_KEY from https://console.groq.com (free)"
    echo "   3. Update .env.local in this workspace with those values"
    echo ""
    echo "   Critical environment variables:"
    echo "   - CONVEX_URL (required)"
    echo "   - NEXT_PUBLIC_CONVEX_URL (required)"
    echo "   - GROQ_API_KEY (required for agents)"
    echo ""
    exit 1
fi

# Validate critical environment variables
echo "🔍 Validating environment variables..."

source .env.local 2>/dev/null || true

MISSING_VARS=""

if [ -z "$CONVEX_URL" ]; then
    MISSING_VARS="${MISSING_VARS}\n  - CONVEX_URL"
fi

if [ -z "$NEXT_PUBLIC_CONVEX_URL" ]; then
    MISSING_VARS="${MISSING_VARS}\n  - NEXT_PUBLIC_CONVEX_URL"
fi

if [ -z "$GROQ_API_KEY" ] && [ -z "$OPENAI_API_KEY" ] && [ -z "$GEMINI_API_KEY" ]; then
    MISSING_VARS="${MISSING_VARS}\n  - At least one LLM API key (GROQ_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY)"
fi

if [ -n "$MISSING_VARS" ]; then
    echo "❌ Missing required environment variables in .env.local:"
    echo -e "$MISSING_VARS"
    echo ""
    echo "Please update .env.local with the required values."
    echo ""
    echo "To get CONVEX_URL:"
    echo "  1. Run 'npx convex dev' in the base repo"
    echo "  2. Copy the deployment URL from the output"
    echo ""
    echo "To get GROQ_API_KEY (recommended, free tier):"
    echo "  1. Visit https://console.groq.com"
    echo "  2. Create an account and generate an API key"
    echo ""
    exit 1
fi

echo "✅ All required environment variables are set"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo ""
echo "🔨 Building packages and workspace..."
pnpm build

echo ""
echo "✅ Workspace setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Quick Start Guide"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Start development servers:"
echo "   pnpm dev"
echo ""
echo "   This will start:"
echo "   - Dashboard at http://localhost:3002"
echo "   - Docs site"
echo "   - Web app"
echo ""
echo "2. Create your first agent:"
echo "   cd packages/agent-engine"
echo "   pnpm cli create \"MyAgent\""
echo ""
echo "3. Run an agent:"
echo "   pnpm cli run <stack_id> 10 5000"
echo ""
echo "4. Check agent status:"
echo "   pnpm cli status <stack_id>"
echo ""
echo "📖 Documentation: docs/GETTING_STARTED.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
