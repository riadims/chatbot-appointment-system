import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load service account from environment or file
function loadServiceAccount() {
  // Try environment variable first (base64 encoded)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (e) {
      try {
        return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      } catch (e2) {
        throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON');
      }
    }
  }
  
  // Fall back to file
  const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 
    path.join(__dirname, '../../../n8n/service-account.json');
  
  try {
    const content = fs.readFileSync(serviceAccountPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load service account from ${serviceAccountPath}: ${error.message}`);
  }
}

// Create JWT for service account authentication
function createJWT(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/calendar'
  };
  
  const base64url = (str) => {
    return Buffer.from(str).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };
  
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const signature = crypto.createSign('RSA-SHA256')
    .update(signatureInput)
    .sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${signatureInput}.${signature}`;
}

// Get access token from Google
async function getAccessToken(jwt) {
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt
  });
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token request failed: ${response.status} ${error}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

/**
 * Create a Google Calendar event
 * @param {Object} eventData - Event data (summary, description, start, end, attendees)
 * @param {string} calendarId - Calendar ID (default: 'primary')
 * @returns {Promise<Object>} Created event
 */
export async function createCalendarEvent(eventData, calendarId = null) {
  try {
    const serviceAccount = loadServiceAccount();
    const jwt = createJWT(serviceAccount);
    const accessToken = await getAccessToken(jwt);
    
    const calId = calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary';
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(error);
      } catch (e) {
        errorJson = { message: error };
      }
      throw new Error(`Calendar API failed: ${response.status} ${JSON.stringify(errorJson)}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to create calendar event: ${error.message}`);
  }
}

/**
 * Search for Google Calendar events
 * @param {string} calendarId - Calendar ID
 * @param {string} timeMin - Minimum time (RFC3339)
 * @param {string} timeMax - Maximum time (RFC3339)
 * @returns {Promise<Array>} Array of events
 */
export async function searchCalendarEvents(calendarId = null, timeMin, timeMax) {
  try {
    const serviceAccount = loadServiceAccount();
    const jwt = createJWT(serviceAccount);
    const accessToken = await getAccessToken(jwt);
    
    const calId = calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary';
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50'
    });
    
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Search request failed: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    throw new Error(`Failed to search calendar events: ${error.message}`);
  }
}

/**
 * Delete a Google Calendar event
 * @param {string} eventId - Event ID
 * @param {string} calendarId - Calendar ID (default: 'primary')
 * @returns {Promise<void>}
 */
export async function deleteCalendarEvent(eventId, calendarId = null) {
  try {
    const serviceAccount = loadServiceAccount();
    const jwt = createJWT(serviceAccount);
    const accessToken = await getAccessToken(jwt);
    
    const calId = calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary';
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      throw new Error(`Delete request failed: ${response.status} ${error}`);
    }
    
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to delete calendar event: ${error.message}`);
  }
}
