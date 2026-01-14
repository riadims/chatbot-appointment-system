import express from 'express';
import {
  createCalendarEvent,
  searchCalendarEvents,
  deleteCalendarEvent,
} from '../services/googleCalendarService.js';

const router = express.Router();

/**
 * POST /api/google-calendar/create
 * Create a calendar event
 */
router.post('/create', async (req, res) => {
  try {
    const { eventData, calendarId } = req.body;
    
    if (!eventData || !eventData.summary || !eventData.start || !eventData.end) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: eventData.summary, eventData.start, eventData.end'
      });
    }
    
    // Remove attendees field if present - service accounts cannot invite attendees
    // without Domain-Wide Delegation, so we strip this field to avoid 403 errors
    const { attendees, ...eventDataWithoutAttendees } = eventData;
    if (attendees) {
      console.warn('Removed attendees field from event data (service accounts cannot invite attendees)');
    }
    
    const event = await createCalendarEvent(eventDataWithoutAttendees, calendarId);
    
    res.json({
      success: true,
      event: {
        id: event.id,
        htmlLink: event.htmlLink,
        summary: event.summary,
        start: event.start,
        end: event.end
      }
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/google-calendar/search
 * Search for calendar events
 */
router.post('/search', async (req, res) => {
  try {
    const { calendarId, timeMin, timeMax } = req.body;
    
    if (!timeMin || !timeMax) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: timeMin, timeMax'
      });
    }
    
    const events = await searchCalendarEvents(calendarId, timeMin, timeMax);
    
    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error searching calendar events:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/google-calendar/delete/:eventId
 * Delete a calendar event
 */
router.delete('/delete/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId } = req.query;
    
    await deleteCalendarEvent(eventId, calendarId);
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
