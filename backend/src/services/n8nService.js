import axios from 'axios';
import { config } from '../config/env.js';

/**
 * Service for communicating with n8n webhooks
 * Handles HTTP requests to n8n automation workflows
 */

const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Sends booking request to n8n webhook
 * @param {object} bookingData - Validated booking data
 * @returns {Promise<object>} - Response from n8n
 * @throws {Error} - If request fails or times out
 */
export async function sendBookingToN8n(bookingData) {
  if (!config.n8nBookWebhookUrl) {
    throw new Error('N8N_BOOK_WEBHOOK_URL is not configured');
  }

  try {
    const response = await axios.post(
      config.n8nBookWebhookUrl,
      bookingData,
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    // Handle different types of errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request to n8n timed out');
    }

    if (error.response) {
      // n8n returned an error response
      throw new Error(
        `n8n returned error: ${error.response.status} - ${error.response.statusText}`
      );
    }

    if (error.request) {
      // Request was made but no response received
      throw new Error('No response received from n8n webhook');
    }

    // Other errors
    throw new Error(`Failed to send booking to n8n: ${error.message}`);
  }
}

/**
 * Sends cancellation request to n8n webhook
 * @param {object} cancellationData - Validated cancellation data
 * @returns {Promise<object>} - Response from n8n
 * @throws {Error} - If request fails or times out
 */
export async function sendCancellationToN8n(cancellationData) {
  if (!config.n8nCancelWebhookUrl) {
    throw new Error('N8N_CANCEL_WEBHOOK_URL is not configured');
  }

  try {
    const response = await axios.post(
      config.n8nCancelWebhookUrl,
      cancellationData,
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    // Handle different types of errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request to n8n timed out');
    }

    if (error.response) {
      // n8n returned an error response
      throw new Error(
        `n8n returned error: ${error.response.status} - ${error.response.statusText}`
      );
    }

    if (error.request) {
      // Request was made but no response received
      throw new Error('No response received from n8n webhook');
    }

    // Other errors
    throw new Error(`Failed to send cancellation to n8n: ${error.message}`);
  }
}
