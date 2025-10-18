#!/bin/bash

# Script to configure Convex environment variables
# Run this from the packages/convex directory

echo "Setting up Convex environment variables..."

# Check if we're in the convex package directory
if [ ! -f "convex.json" ]; then
  echo "Error: Please run this script from the packages/convex directory"
  exit 1
fi

# Source the .env.local file from the root if it exists
if [ -f "../../.env.local" ]; then
  source ../../.env.local
elif [ -f "../../../.env.local" ]; then
  source ../../../.env.local
else
  echo "Warning: .env.local not found in project root"
fi

# Set Groq API key
if [ -n "$GROQ_API_KEY" ]; then
  echo "Setting GROQ_API_KEY..."
  npx convex env set GROQ_API_KEY "$GROQ_API_KEY"
else
  echo "Warning: GROQ_API_KEY not found in environment"
fi

# Set OpenAI API key (optional)
if [ -n "$OPENAI_API_KEY" ]; then
  echo "Setting OPENAI_API_KEY..."
  npx convex env set OPENAI_API_KEY "$OPENAI_API_KEY"
else
  echo "Info: OPENAI_API_KEY not set (optional)"
fi

# Set Gemini API key (optional)
if [ -n "$GEMINI_API_KEY" ]; then
  echo "Setting GEMINI_API_KEY..."
  npx convex env set GEMINI_API_KEY "$GEMINI_API_KEY"
else
  echo "Info: GEMINI_API_KEY not set (optional)"
fi

echo "Environment setup complete!"
echo ""
echo "To verify, run: npx convex env list"