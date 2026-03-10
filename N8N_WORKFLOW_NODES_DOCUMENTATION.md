# n8n Workflow Nodes — Thesis Documentation

This document describes every node used in the chatbot appointment system’s n8n workflows. It is intended for thesis documentation and future maintenance.

---

## Overview

The system uses two n8n workflows:

1. **Book Appointment** — Handles new appointment requests, validates input, creates a Google Calendar event, and responds to the backend.
2. **Cancel Appointment** — Handles cancellation requests, validates input, finds the matching calendar event, deletes it, and responds to the backend.

Both workflows are triggered by **webhooks** called by the Node.js backend. Google Calendar operations (create, search, delete) are performed via **HTTP Request** nodes that call the backend’s Google Calendar API, which uses a service account for authentication.

---

## Node Types Used

| Node type (n8n) | Purpose |
|------------------|--------|
| **Webhook** | Entry point; receives HTTP POST from the backend |
| **Code** | Custom JavaScript: validation, data shaping, logging |
| **IF** | Branching: route by validation result or “event found” |
| **HTTP Request** | Call backend API (Google Calendar create/search/delete) |
| **Respond to Webhook** | Send HTTP response back to the caller |

---

# Workflow 1: Book Appointment

**Trigger:** `POST /webhook/book`  
**Purpose:** Validate booking data, create a Google Calendar event, and return success or validation error.

---

## 1. Webhook - Book Appointment

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.webhook` |
| **Path** | `book` (full URL: `/webhook/book`) |
| **Method** | POST |

**Role:** Workflow trigger. Listens for HTTP POST requests at `/webhook/book`. The backend sends the booking payload here after validating the request at `/appointments/book`.

**Input:** Request body (JSON) with `name`, `email`, `date`, `time`, `reason`. In n8n the payload is available as `$input.item.json.body`.

**Output:** Passes the webhook payload (including `body`) to the next node.

---

## 2. Validate Booking Data

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.code` (Code node) |

**Role:** Validates and normalizes the booking data. Ensures all required fields are present and in the correct format before any calendar or external call.

**Validation rules:**
- **name:** Required, non-empty string.
- **email:** Required, valid email format (regex).
- **date:** Required, format `YYYY-MM-DD`, must not be in the past.
- **time:** Required, 24-hour format `HH:MM`.
- **reason:** Required, non-empty string.

**Output:**
- If valid: `{ valid: true, data: { name, email, date, time, reason }, requestId, timestamp }`.
- If invalid: `{ valid: false, errors: [...], originalData }`.

---

## 3. Log Booking Request

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.code` (Code node) |

**Role:** Debugging and audit. Logs a structured summary of the booking request (timestamp, requestId, valid flag, data or errors) to the n8n execution log. Does not change the data; passes it through to the next node.

**Output:** Same as input (validation result and data).

---

## 4. Check Validation

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.if` (IF node) |
| **Condition** | `$json.valid === true` |

**Role:** Branching. Sends the execution in one of two directions:
- **True:** Data is valid → continue to **Prepare Calendar Event**.
- **False:** Validation failed → go to **Respond - Validation Error** (400 response).

---

## 5. Prepare Calendar Event

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.code` (Code node) |

**Role:** Builds the Google Calendar event payload from the validated booking. Uses a fixed business timezone (e.g. `Europe/Berlin`) so that the user’s chosen time (e.g. 14:00) is not shifted by server UTC.

**Logic:**
- Start: `date` + `time` in the chosen timezone; end: start + 1 hour (handles day rollover for times like 23:00).
- Event summary: `"Appointment: {name}"`.
- Event description: `"Reason: {reason} | Email: {email}"`.
- No attendees (service account cannot invite; email is only in the description).

**Output:** Previous item data plus `eventData` (summary, description, start, end with `dateTime` and `timeZone`). Calendar ID is not set here; the backend uses `GOOGLE_CALENDAR_ID` from its environment.

---

## 6. Google Calendar - Create Event

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.httpRequest` |
| **URL** | `http://chatbot-backend:3000/api/google-calendar/create` |
| **Method** | POST |
| **Body** | `{ eventData: $json.eventData }` (JSON) |

**Role:** Calls the backend’s Google Calendar “create” endpoint. The backend uses the service account (JWT) to create the event in the calendar specified by `GOOGLE_CALENDAR_ID`. n8n does not hold Google credentials; it only sends the event payload.

**Output:** Backend JSON response, e.g. `{ success: true, event: { id, htmlLink, summary, start, end } }` or `{ success: false, error: "..." }`.

---

## 7. Parse Calendar Response

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.code` (Code node) |

**Role:** Interprets the backend response and merges it with the original booking data so the rest of the workflow and the webhook response have both event and booking info.

**Logic:**
- If the backend reports failure, throws an error.
- Tries to get `bookingData` from the input chain (from before the HTTP request) or from the event’s summary/description if needed.
- Returns a single object with: `id`, `htmlLink`, `summary`, `start`, `end`, `bookingData`, `requestId`.

**Output:** One item containing event details and booking data for logging and for **Respond - Success**.

---

## 8. Log Calendar Success

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.code` (Code node) |

**Role:** Audit logging. Logs a structured “calendar event created” entry (timestamp, requestId, eventId, eventLink, bookingData) to the n8n execution log. If `bookingData` is missing, it builds a minimal fallback from the event so the node does not fail.

**Output:** Object suitable for the webhook response: `{ success: true, message, eventId, eventLink, bookingData, requestId }`.

---

## 9. Respond - Success

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.respondToWebhook` |
| **Response** | JSON body = `$json` (the object from the previous node) |
| **Status** | 200 (default) |

**Role:** Sends the success response back to the backend (and thus to the client). The backend receives this after calling the webhook and can forward or transform it.

---

## 10. Respond - Validation Error

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.respondToWebhook` |
| **Response** | `{ success: false, error: "Validation Error", details: $json.errors, message: "Invalid booking data provided" }` |
| **Status** | 400 |

**Role:** When **Check Validation** takes the “false” branch, this node responds to the webhook with a 400 and the list of validation errors so the backend can return a clear error to the user.

---

# Workflow 2: Cancel Appointment

**Trigger:** `POST /webhook/cancel`  
**Purpose:** Validate cancellation data, find the matching Google Calendar event (by time window and optionally email), delete it, and return success, validation error, or “event not found”.

---

## 1. Webhook - Cancel Appointment

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.webhook` |
| **Path** | `cancel` (full URL: `/webhook/cancel`) |
| **Method** | POST |

**Role:** Workflow trigger for cancellations. Listens for POST at `/webhook/cancel`. The backend sends the cancellation payload here (e.g. after `/appointments/cancel`).

**Input:** Request body with `email`, `date`, `time`. In n8n: `$input.item.json.body`.

**Output:** Passes the webhook payload to the next node.

---

## 2. Validate Cancellation Data

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.code` (Code node) |

**Role:** Validates cancellation input. Fewer fields than booking: only email, date, and time.

**Validation rules:**
- **email:** Required, valid email format.
- **date:** Required, `YYYY-MM-DD`.
- **time:** Required, 24-hour `HH:MM`.

**Output:**
- If valid: `{ valid: true, data: { email, date, time }, requestId, timestamp }`.
- If invalid: `{ valid: false, errors: [...], originalData }`.

---

## 3. Log Cancellation Request

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.code` (Code node) |

**Role:** Same as in Book workflow: logs a structured cancellation request (timestamp, requestId, valid, data/errors) for debugging and audit. Passes data through unchanged.

---

## 4. Check Validation

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.if` |
| **Condition** | `$json.valid === true` |

**Role:** Branching:
- **True:** Continue to **Prepare Event Search**.
- **False:** Go to **Respond - Validation Error** (400).

---

## 5. Prepare Event Search

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.code` (Code node) |

**Role:** Prepares the parameters for the Google Calendar “list/search” call: time window and calendar ID.

**Logic:**
- Appointment time from `date` + `time`.
- `timeMin`: 30 minutes before that time; `timeMax`: 30 minutes after (RFC3339).
- Calendar ID: from `process.env.GOOGLE_CALENDAR_ID` if available in the n8n environment, otherwise `'primary'` (backend may still override using its own env).

**Output:** Previous item plus `searchData: { calendarId, timeMin, timeMax }` and `cancellationData` for use in later nodes.

---

## 6. Google Calendar - Search Events

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.httpRequest` |
| **URL** | `http://chatbot-backend:3000/api/google-calendar/search` |
| **Method** | POST |
| **Body** | `{ calendarId, timeMin, timeMax }` from `searchData` |

**Role:** Calls the backend search endpoint, which uses the Google Calendar API to list events in the given calendar and time range. No credentials in n8n.

**Output:** Backend response, e.g. `{ success: true, events: [ ... ] }` or `{ success: false, error: "..." }`.

---

## 7. Parse Search Response

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.code` (Code node) |

**Role:** Checks that the search succeeded and that `events` is an array, then turns each event into a separate n8n item for the filter node.

**Output:** One item per event; each item’s `json` is one calendar event object. (The cancellation context is still available from the previous step’s data in the execution.)

---

## 8. Filter Matching Event

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.code` (Code node) |

**Role:** Finds the one event that corresponds to the cancellation request. Matching can use attendee email and time.

**Logic:**
- Uses cancellation data (email, date, time) from the execution context.
- If events have `attendees`, looks for one where an attendee email matches (case-insensitive) and the event start is within 30 minutes of the given date/time.
- If no such event is found, returns a single item: `{ success: false, error: 'Event not found', message: '...', cancellationData, requestId }` (no `eventId`).
- If found, returns one item: `{ success: true, eventId, calendarId, cancellationData, requestId }`.

**Note:** Because the book workflow does not add attendees (service account limitation), events may have no `attendees`. In that case, matching may need to rely on time window and possibly description/summary; the current logic is as above.

---

## 9. Check Event Found

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.if` |
| **Condition** | `$json.success === true` |

**Role:** Branching after filtering:
- **True:** A matching event was found → **Google Calendar - Delete Event**.
- **False:** No match → **Respond - Event Not Found** (404).

---

## 10. Google Calendar - Delete Event

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.httpRequest` |
| **URL** | `http://chatbot-backend:3000/api/google-calendar/delete/{{ $json.eventId }}?calendarId={{ $json.calendarId \|\| 'primary' }}` |
| **Method** | DELETE |

**Role:** Calls the backend delete endpoint with the matched `eventId` and `calendarId`. The backend uses the service account to delete that event.

**Output:** Backend response, e.g. `{ success: true, message: "Event deleted successfully" }`.

---

## 11. Log Deletion Success

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.code` (Code node) |

**Role:** Audit logging. Logs a “calendar event deleted” entry (timestamp, requestId, deletedEventId, cancellationData). Then shapes the payload for the webhook response.

**Output:** `{ success: true, message: 'Appointment cancellation processed successfully', deletedEventId, cancellationData, requestId }`.

---

## 12. Respond - Success

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.respondToWebhook` |
| **Response** | JSON = `$json` |
| **Status** | 200 |

**Role:** Sends the success cancellation response back to the backend.

---

## 13. Respond - Validation Error

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.respondToWebhook` |
| **Response** | `{ success: false, error: "Validation Error", details: $json.errors, message: "Invalid cancellation data provided" }` |
| **Status** | 400 |

**Role:** Used when **Check Validation** is false; responds with 400 and validation errors.

---

## 14. Respond - Event Not Found

| Property | Value |
|----------|--------|
| **Type** | `n8n-nodes-base.respondToWebhook` |
| **Response** | `$json` (the “event not found” object from **Filter Matching Event**) |
| **Status** | 404 |

**Role:** When **Check Event Found** is false, sends 404 and the “event not found” payload back to the backend.

---

# Summary Table for Thesis

| Workflow | Node name | Node type | Function |
|----------|-----------|-----------|----------|
| Book | Webhook - Book Appointment | Webhook | Trigger; receive POST with booking data |
| Book | Validate Booking Data | Code | Validate name, email, date, time, reason |
| Book | Log Booking Request | Code | Log request for audit/debug |
| Book | Check Validation | IF | Branch on validation result |
| Book | Prepare Calendar Event | Code | Build calendar event payload (timezone-aware) |
| Book | Google Calendar - Create Event | HTTP Request | POST to backend create endpoint |
| Book | Parse Calendar Response | Code | Merge backend response with booking data |
| Book | Log Calendar Success | Code | Log success; build response payload |
| Book | Respond - Success | Respond to Webhook | 200 + success JSON |
| Book | Respond - Validation Error | Respond to Webhook | 400 + validation errors |
| Cancel | Webhook - Cancel Appointment | Webhook | Trigger; receive POST with cancellation data |
| Cancel | Validate Cancellation Data | Code | Validate email, date, time |
| Cancel | Log Cancellation Request | Code | Log request for audit/debug |
| Cancel | Check Validation | IF | Branch on validation result |
| Cancel | Prepare Event Search | Code | Build search params (time window, calendarId) |
| Cancel | Google Calendar - Search Events | HTTP Request | POST to backend search endpoint |
| Cancel | Parse Search Response | Code | Turn events array into one item per event |
| Cancel | Filter Matching Event | Code | Match by email/time; return eventId or “not found” |
| Cancel | Check Event Found | IF | Branch on whether a match was found |
| Cancel | Google Calendar - Delete Event | HTTP Request | DELETE to backend delete endpoint |
| Cancel | Log Deletion Success | Code | Log deletion; build response payload |
| Cancel | Respond - Success | Respond to Webhook | 200 + success JSON |
| Cancel | Respond - Validation Error | Respond to Webhook | 400 + validation errors |
| Cancel | Respond - Event Not Found | Respond to Webhook | 404 + “event not found” payload |

---

*Document generated for thesis documentation. Last updated to match the current Book and Cancel workflow definitions.*
