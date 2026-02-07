/**
 * Local Development Server
 * Runs API endpoints without Vercel CLI
 */

const http = require('http');
const url = require('url');

// Load environment variables
require('dotenv').config();

// Import API handlers
const uploadResume = require('./api/upload-resume');
const generateQuestions = require('./api/generate-questions');
const submitScreening = require('./api/submit-screening');
const health = require('./api/health');

const PORT = 3000;

// Route mapping
const routes = {
  '/api/upload-resume': uploadResume,
  '/api/generate-questions': generateQuestions,
  '/api/submit-screening': submitScreening,
  '/api/health': health
};

// Add Express-like methods to response object
function addExpressMethods(res) {
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };

  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json');
    this.end(JSON.stringify(data));
    return this;
  };

  return res;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

  // Add Express-like methods to response
  addExpressMethods(res);

  // Find matching route
  const handler = routes[pathname];

  if (!handler) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  // Parse request body for POST requests
  if (req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        req.body = JSON.parse(body);
        await handler(req, res);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else {
    // For multipart/form-data or GET requests, call handler directly
    await handler(req, res);
  }
});

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 Local Development Server Started');
  console.log('='.repeat(70));
  console.log(`\n✅ Server running at: http://localhost:${PORT}`);
  console.log('\n📋 Available endpoints:');
  console.log('   - POST http://localhost:3000/api/upload-resume');
  console.log('   - POST http://localhost:3000/api/generate-questions');
  console.log('   - POST http://localhost:3000/api/submit-screening');
  console.log('   - GET  http://localhost:3000/api/health');
  console.log('\n💡 To test the API, run in another terminal:');
  console.log('   npm test');
  console.log('\n' + '='.repeat(70) + '\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
