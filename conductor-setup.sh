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

# Copy environment files from main repo
if [ -n "$CONDUCTOR_ROOT_PATH" ]; then
    echo "📋 Copying environment files from main repo..."

    # Copy root .env.local if it exists
    if [ -f "$CONDUCTOR_ROOT_PATH/.env.local" ]; then
        cp "$CONDUCTOR_ROOT_PATH/.env.local" .env.local
        echo "✅ Copied root .env.local"
    fi

    # Copy .env.local files from apps subfolders
    for app_dir in "$CONDUCTOR_ROOT_PATH/apps"/*; do
        if [ -d "$app_dir" ]; then
            app_name=$(basename "$app_dir")
            if [ -f "$app_dir/.env.local" ]; then
                mkdir -p "apps/$app_name"
                cp "$app_dir/.env.local" "apps/$app_name/.env.local"
                echo "✅ Copied apps/$app_name/.env.local"
            fi
        fi
    done

    echo ""
else
    echo "⚠️  Warning: CONDUCTOR_ROOT_PATH not set - cannot copy environment files"
    echo ""
fi

echo "✅ Environment files copied"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

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
