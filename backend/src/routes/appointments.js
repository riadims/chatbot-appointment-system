import express from 'express';
import {
  bookAppointment,
  cancelAppointment,
} from '../controllers/appointmentController.js';

const router = express.Router();

/**
 * Book appointment endpoint
 * POST /appointments/book
 */
router.post('/book', bookAppointment);

/**
 * Cancel appointment endpoint
 * POST /appointments/cancel
 */
router.post('/cancel', cancelAppointment);

export default router;
