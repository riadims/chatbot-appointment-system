/**
 * Validation utilities for appointment booking and cancellation
 */

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates date format (YYYY-MM-DD)
 * @param {string} date - Date string to validate
 * @returns {boolean} - True if valid
 */
function isValidDateFormat(date) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return false;
  }

  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj);
}

/**
 * Validates time format (HH:MM in 24-hour format)
 * @param {string} time - Time string to validate
 * @returns {boolean} - True if valid
 */
function isValidTimeFormat(time) {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

/**
 * Validates that the date is not in the past
 * @param {string} date - Date string to validate
 * @returns {boolean} - True if date is today or in the future
 */
function isDateNotInPast(date) {
  const appointmentDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  appointmentDate.setHours(0, 0, 0, 0);
  return appointmentDate >= today;
}

/**
 * Validates booking request data
 * @param {object} data - Booking request data
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateBookingRequest(data) {
  const errors = [];

  // Required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }

  if (!data.email || typeof data.email !== 'string' || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.date || typeof data.date !== 'string' || !isValidDateFormat(data.date)) {
    errors.push('Date is required and must be in YYYY-MM-DD format');
  }

  if (!data.time || typeof data.time !== 'string' || !isValidTimeFormat(data.time)) {
    errors.push('Time is required and must be in HH:MM format (24-hour)');
  }

  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length === 0) {
    errors.push('Reason is required and must be a non-empty string');
  }

  // Additional validations if date format is valid
  if (data.date && isValidDateFormat(data.date)) {
    if (!isDateNotInPast(data.date)) {
      errors.push('Appointment date cannot be in the past');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates cancellation request data
 * @param {object} data - Cancellation request data
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateCancellationRequest(data) {
  const errors = [];

  if (!data.email || typeof data.email !== 'string' || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.date || typeof data.date !== 'string' || !isValidDateFormat(data.date)) {
    errors.push('Date is required and must be in YYYY-MM-DD format');
  }

  if (!data.time || typeof data.time !== 'string' || !isValidTimeFormat(data.time)) {
    errors.push('Time is required and must be in HH:MM format (24-hour)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
