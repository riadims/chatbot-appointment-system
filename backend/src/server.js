import app from './app.js';
import { config, validateConfig } from './config/env.js';

/**
 * Server bootstrap
 * Validates configuration and starts the Express server
 */

// Validate environment configuration
try {
  validateConfig();
  console.log('✓ Configuration validated');
} catch (error) {
  console.error('✗ Configuration error:', error.message);
  process.exit(1);
}

// Start server
const server = app.listen(config.port, () => {
  console.log(`✓ Server running on port ${config.port}`);
  console.log(`✓ Environment: ${config.nodeEnv}`);
  console.log(`✓ Health check: http://localhost:${config.port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
