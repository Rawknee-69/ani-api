// build.js - Custom build script for Vercel
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run the TypeScript compiler
console.log('📦 Building the project...');
execSync('npm run build', { stdio: 'inherit' });

console.log('✅ Build completed successfully!');

// Ensure the API directory exists
if (!fs.existsSync(path.join(process.cwd(), 'api'))) {
  fs.mkdirSync(path.join(process.cwd(), 'api'));
}

// Ensure we have the API handler
const apiHandlerPath = path.join(process.cwd(), 'api', 'index.js');
if (!fs.existsSync(apiHandlerPath)) {
  console.log('📝 Creating API handler...');
  const handlerContent = `// Vercel serverless function entry point
const { default: handler } = require('../public/main');
module.exports = handler;`;
  
  fs.writeFileSync(apiHandlerPath, handlerContent);
  console.log('✅ API handler created!');
}

console.log('🚀 Ready for deployment!'); 