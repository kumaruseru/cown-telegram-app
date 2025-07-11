# Build script for production
echo "🚀 Starting production build..."

# Install dependencies
npm install --production

# Create public directory if not exists
mkdir -p public

# Set production environment
export NODE_ENV=production

echo "✅ Build completed successfully!"
