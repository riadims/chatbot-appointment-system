import {
  validateBookingRequest,
  validateCancellationRequest,
} from '../validators/appointmentValidator.js';
import {
  sendBookingToN8n,
  sendCancellationToN8n,
} from '../services/n8nService.js';

/**
 * Controller for appointment-related operations
 * Handles business logic and coordinates between validators and services
 */

/**
 * Handles health check request
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export async function healthCheck(req, res) {
  res.status(200).json({ status: 'ok' });
}

/**
 * Handles appointment booking request
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export async function bookAppointment(req, res) {
  try {
    // Validate input
    const validation = validateBookingRequest(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
      });
    }

    // Prepare booking data
    const bookingData = {
      name: req.body.name.trim(),
      email: req.body.email.trim().toLowerCase(),
      date: req.body.date,
      time: req.body.time,
      reason: req.body.reason.trim(),
    };

    // Forward to n8n
    const n8nResponse = await sendBookingToN8n(bookingData);

    // Return success response with n8n result
    res.status(200).json({
      success: true,
      message: 'Appointment booking request processed successfully',
      data: bookingData,
      n8nResult: n8nResponse,
    });
  } catch (error) {
    // Log error for debugging (in production, use proper logging)
    console.error('Error booking appointment:', error.message);

    // Return error response
    res.status(500).json({
      success: false,
      error: 'Failed to process booking request',
      message: error.message,
    });
  }
}

/**
 * Handles appointment cancellation request
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export async function cancelAppointment(req, res) {
  try {
    // Validate input
    const validation = validateCancellationRequest(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
      });
    }

    // Prepare cancellation data
    const cancellationData = {
      email: req.body.email.trim().toLowerCase(),
      date: req.body.date,
      time: req.body.time,
    };

    // Forward to n8n
    const n8nResponse = await sendCancellationToN8n(cancellationData);

    // Return success response with n8n result
    res.status(200).json({
      success: true,
      message: 'Appointment cancellation request processed successfully',
      data: cancellationData,
      n8nResult: n8nResponse,
    });
  } catch (error) {
    // Log error for debugging (in production, use proper logging)
    console.error('Error canceling appointment:', error.message);

    // Return error response
    res.status(500).json({
      success: false,
      error: 'Failed to process cancellation request',
      message: error.message,
    });
  }
}
