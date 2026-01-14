import axios from 'axios';
import { config } from '../config/env.js';

/**
 * Service for communicating with n8n webhooks
 * Handles HTTP requests to n8n automation workflows
 * Includes comprehensive logging for debugging and thesis documentation
 */

const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Logs request details to console
 * @param {string} operation - Operation type (booking/cancellation)
 * @param {string} url - Webhook URL
 * @param {object} payload - Request payload
 */
function logRequest(operation, url, payload) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [n8nService] Sending ${operation} request to n8n`);
  console.log(`[${timestamp}] [n8nService] URL: ${url}`);
  console.log(`[${timestamp}] [n8nService] Payload:`, JSON.stringify(payload, null, 2));
}

/**
 * Logs successful response
 * @param {string} operation - Operation type
 * @param {number} status - HTTP status code
 * @param {object} data - Response data
 */
function logSuccess(operation, status, data) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [n8nService] ${operation} request successful`);
  console.log(`[${timestamp}] [n8nService] Response Status: ${status}`);
  console.log(`[${timestamp}] [n8nService] Response Data:`, JSON.stringify(data, null, 2));
}

/**
 * Logs error details
 * @param {string} operation - Operation type
 * @param {Error} error - Error object
 * @param {object} axiosError - Original axios error object (if available)
 */
function logError(operation, error, axiosError = null) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [n8nService] ${operation} request failed`);
  console.error(`[${timestamp}] [n8nService] Error Message: ${error.message}`);
  
  // Log axios-specific error details
  if (axiosError) {
    console.error(`[${timestamp}] [n8nService] Axios Error Code: ${axiosError.code || 'N/A'}`);
    if (axiosError.code === 'ECONNREFUSED') {
      console.error(`[${timestamp}] [n8nService] Connection refused - n8n may not be running or URL is incorrect`);
    } else if (axiosError.code === 'ECONNABORTED') {
      console.error(`[${timestamp}] [n8nService] Request timed out after ${REQUEST_TIMEOUT}ms`);
    } else if (axiosError.code === 'ENOTFOUND') {
      console.error(`[${timestamp}] [n8nService] Host not found - check webhook URL`);
    } else if (axiosError.code === 'ETIMEDOUT') {
      console.error(`[${timestamp}] [n8nService] Connection timed out`);
    }
    
    if (axiosError.response) {
      console.error(`[${timestamp}] [n8nService] Response Status: ${axiosError.response.status}`);
      console.error(`[${timestamp}] [n8nService] Response Data:`, JSON.stringify(axiosError.response.data, null, 2));
    } else if (axiosError.request) {
      console.error(`[${timestamp}] [n8nService] Request was made but no response received`);
      console.error(`[${timestamp}] [n8nService] Request details:`, {
        url: axiosError.config?.url,
        method: axiosError.config?.method,
        timeout: axiosError.config?.timeout
      });
    }
  }
  
  if (error.stack) {
    console.error(`[${timestamp}] [n8nService] Stack Trace:`, error.stack);
  }
}

/**
 * Sends booking request to n8n webhook
 * @param {object} bookingData - Validated booking data
 * @returns {Promise<object>} - Response from n8n
 * @throws {Error} - If request fails or times out
 */
export async function sendBookingToN8n(bookingData) {
  if (!config.n8nBookWebhookUrl) {
    const error = new Error('N8N_BOOK_WEBHOOK_URL is not configured');
    logError('booking', error);
    throw error;
  }

  // Log request
  logRequest('booking', config.n8nBookWebhookUrl, bookingData);

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

    // Log success
    logSuccess('booking', response.status, response.data);

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    // Create appropriate error message
    let errorMessage;
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = `Request to n8n timed out after ${REQUEST_TIMEOUT}ms. Check if n8n is running at ${config.n8nBookWebhookUrl}`;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = `Connection refused. n8n may not be running or URL is incorrect: ${config.n8nBookWebhookUrl}`;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = `Host not found. Check webhook URL: ${config.n8nBookWebhookUrl}`;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = `Connection timed out. Check network connectivity to: ${config.n8nBookWebhookUrl}`;
    } else if (error.response) {
      // n8n returned an error response
      errorMessage = `n8n returned error: ${error.response.status} - ${error.response.statusText}`;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = `No response received from n8n webhook at ${config.n8nBookWebhookUrl}. Check if n8n is running and webhook is active.`;
    } else {
      // Other errors
      errorMessage = `Failed to send booking to n8n: ${error.message}`;
    }

    const n8nError = new Error(errorMessage);
    logError('booking', n8nError, error);
    throw n8nError;
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
    const error = new Error('N8N_CANCEL_WEBHOOK_URL is not configured');
    logError('cancellation', error);
    throw error;
  }

  // Log request
  logRequest('cancellation', config.n8nCancelWebhookUrl, cancellationData);

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

    // Log success
    logSuccess('cancellation', response.status, response.data);

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    // Create appropriate error message
    let errorMessage;
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = `Request to n8n timed out after ${REQUEST_TIMEOUT}ms. Check if n8n is running at ${config.n8nCancelWebhookUrl}`;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = `Connection refused. n8n may not be running or URL is incorrect: ${config.n8nCancelWebhookUrl}`;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = `Host not found. Check webhook URL: ${config.n8nCancelWebhookUrl}`;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = `Connection timed out. Check network connectivity to: ${config.n8nCancelWebhookUrl}`;
    } else if (error.response) {
      // n8n returned an error response
      errorMessage = `n8n returned error: ${error.response.status} - ${error.response.statusText}`;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = `No response received from n8n webhook at ${config.n8nCancelWebhookUrl}. Check if n8n is running and webhook is active.`;
    } else {
      // Other errors
      errorMessage = `Failed to send cancellation to n8n: ${error.message}`;
    }

    const n8nError = new Error(errorMessage);
    logError('cancellation', n8nError, error);
    throw n8nError;
  }
}
