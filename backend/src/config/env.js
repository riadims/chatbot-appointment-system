import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment configuration
 * Validates and exports required environment variables
 */
export const config = {
  port: process.env.PORT || 3000,
  n8nBookWebhookUrl: process.env.N8N_BOOK_WEBHOOK_URL,
  n8nCancelWebhookUrl: process.env.N8N_CANCEL_WEBHOOK_URL,
  nodeEnv: process.env.NODE_ENV || 'development',
};

/**
 * Validate that required environment variables are set
 */
export function validateConfig() {
  const errors = [];

  if (!config.n8nBookWebhookUrl) {
    errors.push('N8N_BOOK_WEBHOOK_URL is required');
  }

  if (!config.n8nCancelWebhookUrl) {
    errors.push('N8N_CANCEL_WEBHOOK_URL is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}
