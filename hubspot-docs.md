Great, I'll generate comprehensive documentation and code samples for integrating HubSpot with your Node.js + TypeScript Express server. This will include:

- **Authentication Setup:** Using HubSpot Private App Token.
- **Creating & Updating Contacts:** API calls and best practices.
- **Managing Engagements:** Logging calls, meetings, and notes in HubSpot.
- **Handling Deal Pipelines:** Creating and updating deals.
- **Scheduling Meetings:** Booking appointments and tracking them.
- **Express Routes & API Calls:** Setting up endpoints to trigger HubSpot API calls post-call.
- **Webhooks:** Handling real-time updates from HubSpot.
- **Deployment Guidance:** Considerations for Render.com and production setup.

I’ll put together detailed step-by-step implementation guides, API request structures, and full code samples to ensure seamless integration. I’ll let you know once the documentation is ready!

# Integrating HubSpot with a Node.js & TypeScript Express Server

This guide provides a comprehensive walkthrough for integrating HubSpot’s CRM via its API with a Node.js Express server written in TypeScript. We’ll cover everything from authentication and basic contact management to logging engagements, handling deals, scheduling meetings, setting up webhooks, and deploying your integration. Code examples (in TypeScript) and best practices are included throughout for a maintainable and secure implementation.

## 1. Authentication Setup

Successful integration with HubSpot’s API starts with proper authentication. HubSpot has deprecated legacy API keys in favor of **Private App access tokens** and OAuth. For our server-to-HubSpot integration, a Private App token is the simplest approach.

### Using a HubSpot Private App Token

- **Generate a Private App Token:** In your HubSpot account, navigate to **Settings > Integrations > Private Apps** and create a new private app. Assign the appropriate scopes (e.g., contacts, deals, etc., based on the data you need to access). Once created, HubSpot will provide a long access token (a string starting with `pat-`...). **Copy this token** – you won’t be able to see it again later for security reasons ([](https://www.npmjs.com/package/@hubspot/api-client#:~:text=You%27ll%20need%20to%20create%20a,can%20obtain%20OAuth2%20access%20token)).
- **Use the Token in API Calls:** The private app token is used as a Bearer token in HTTP Authorization headers. For example, when making requests to HubSpot’s API, include `Authorization: Bearer <your_token>` in the header. If you use HubSpot’s official Node.js SDK (`@hubspot/api-client`), you can initialize the client with this token directly. For example: 

  ```typescript
  import { Client } from "@hubspot/api-client";
  const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN });
  ```

  This client will attach the token to all requests automatically. (The HubSpot Node client has TypeScript definitions built-in ([](https://www.npmjs.com/package/@hubspot/api-client#:~:text=Image%3A%20TypeScript%20icon%2C%20indicating%20that,in%20type%20declarations)).)

- **Token Scope:** Private app tokens are account-specific and carry the permissions (scopes) you set. Ensure your token has all needed scopes (crm.objects.contacts.write, crm.objects.deals.write, etc.) for the data you’ll manage. If a request tries an action outside the token’s scopes, HubSpot will return a 403 Forbidden.

### Secure Storage of the Token (Best Practices)

Treat the HubSpot token like a password or secret:

- **Environment Variables:** **Never hard-code the token** in your code. Instead, store it in an environment variable (e.g., in a `.env` file for local development, and in your hosting provider’s config for production). For example, in a `.env` file: 

  ```env
  HUBSPOT_PRIVATE_APP_TOKEN=pat-eu1-abc123...   # (example token)
  ```

  Load this using a library like `dotenv` at startup: 

  ```typescript
  import * as dotenv from 'dotenv';
  dotenv.config();
  const hubspotToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  ```

- **.gitignore the .env:** Ensure your `.env` file is listed in `.gitignore` so it’s not committed to version control. For production (e.g., Render.com), add the token in the environment settings on the hosting platform rather than shipping it with code.

- **Scoped Access:** Only enable the minimal required scopes for the token. For instance, if you only need contact and deal access, do not also enable scopes for tickets or content.

- **Rotation:** If you suspect the token is compromised or after a period of time, rotate it (HubSpot allows regenerating the token for your private app). Update the environment variable accordingly and redeploy.

Using a private app token with the official HubSpot SDK might look like:

```typescript
// hubspotClient.ts - a module to initialize and export a configured HubSpot client
import { Client } from "@hubspot/api-client";
import * as dotenv from 'dotenv';
dotenv.config();

export const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN || ""  // ensure token is provided
});
```

This can be imported wherever you need to call HubSpot APIs. The token will be included automatically in all requests via the `Authorization: Bearer` header.

**Why Private App Tokens?** They are the recommended method for authenticating API calls to HubSpot (as opposed to now-deprecated API keys). Private tokens are easier than full OAuth for server-to-server integrations and provide fine-grained scope control ([](https://www.npmjs.com/package/@hubspot/api-client#:~:text=You%27ll%20need%20to%20create%20a,can%20obtain%20OAuth2%20access%20token)).

## 2. Creating & Updating Contacts

Contacts are a fundamental CRM object in HubSpot. In our Express API, we might need to create new contacts, retrieve details about existing contacts, update their information, or delete contacts. HubSpot’s CRM API (v3) provides endpoints for all these operations. Below are examples of how to implement each, along with best practices for handling duplicates and merging.

### API Endpoints for Contacts

HubSpot’s REST API for contacts lives under the path `/crm/v3/objects/contacts`. Key endpoints include:

- **Create a contact:** `POST /crm/v3/objects/contacts`
- **Retrieve a contact:** `GET /crm/v3/objects/contacts/{contactId}`
- **Update a contact:** `PATCH /crm/v3/objects/contacts/{contactId}`
- **Delete a contact:** `DELETE /crm/v3/objects/contacts/{contactId}`
- **Search for contacts:** `POST /crm/v3/objects/contacts/search` (useful for finding by email).

These require an Authorization header with your token. With the Node SDK, the corresponding methods are available (e.g., `hubspotClient.crm.contacts.basicApi.create`, `.getById`, `.update`, `.archive` for delete).

### Creating a New Contact

When adding a contact, you’ll supply at least an email address and any other properties you have (first name, last name, phone, etc.). HubSpot will return a unique ID for the contact.

**Example Express route (TypeScript) to create a contact:**

```typescript
import { Router, Request, Response } from 'express';
import { hubspotClient } from './hubspotClient';  // our configured client
const router = Router();

interface CreateContactBody {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  [key: string]: any; // for any additional properties
}

router.post('/contacts', async (req: Request<{}, {}, CreateContactBody>, res: Response) => {
  const { email, firstName, lastName, phone, ...rest } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required to create a contact" });
  }
  try {
    const contactPayload = {
      properties: {
        email: email,
        firstname: firstName || "",
        lastname: lastName || "",
        phone: phone || "",
        ...rest  // include any other fields provided
      }
    };
    // Create contact via HubSpot API
    const createResponse = await hubspotClient.crm.contacts.basicApi.create(contactPayload);
    const newContact = createResponse.body;
    res.status(201).json({ message: "Contact created in HubSpot", contactId: newContact.id, contact: newContact });
  } catch (err: any) {
    console.error("Error creating contact in HubSpot:", err.response?.body || err);
    res.status(500).json({ error: "Failed to create contact in HubSpot" });
  }
});
```

In the above code, we construct a payload with a `properties` object as required by HubSpot. For example, a JSON payload to create a contact might look like:

```json
{
  "properties": {
    "email": "alice@example.com",
    "firstname": "Alice",
    "lastname": "Doe",
    "phone": "555-123-4567",
    "company": "Acme Inc"
  }
}
```

HubSpot will respond with the newly created contact’s data, including an `id` (the contact’s internal ID), and echo back the properties (with some additional metadata like `createdAt`, `updatedAt`). For instance, a successful response might be:

```json
{
  "id": "10401",
  "properties": {
    "createdate": "2023-11-01T12:00:00.000Z",
    "email": "alice@example.com",
    "firstname": "Alice",
    "lastname": "Doe",
    "phone": "555-123-4567",
    "company": "Acme Inc",
    "hs_object_id": "10401"
  },
  "createdAt": "2023-11-01T12:00:00.000Z",
  "updatedAt": "2023-11-01T12:00:00.000Z",
  "archived": false
}
```

*(Note: HubSpot might not include all fields if they are empty. Also, `hs_object_id` is an internal ID alias.)*

### Retrieving a Contact

To fetch a contact’s details by ID, use a GET request. For example:

```typescript
router.get('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const contactId = req.params.id;
    // Retrieve contact by ID from HubSpot
    const contactResponse = await hubspotClient.crm.contacts.basicApi.getById(contactId, ["firstname","lastname","email","phone"], undefined, undefined, undefined, false);
    // The second argument is an array of property names to fetch; we specified common ones.
    const contact = contactResponse.body;
    res.json(contact);
  } catch (err: any) {
    console.error("Error fetching contact:", err.response?.body || err);
    if (err.response?.statusCode === 404) {
      res.status(404).json({ error: "Contact not found" });
    } else {
      res.status(500).json({ error: "Failed to retrieve contact" });
    }
  }
});
```

With the HubSpot SDK, `getById` allows specifying which properties to retrieve. If using direct HTTP, you can pass `?properties=firstname,lastname,email,phone` as query params to the GET URL to limit the response to those fields.

### Updating an Existing Contact

Updates are done via a `PATCH` request to the contact’s endpoint. You only need to include the fields that are changing. The contact is identified by ID (or email, discussed below).

**Example Express route to update a contact:**

```typescript
router.patch('/contacts/:id', async (req: Request, res: Response) => {
  const contactId = req.params.id;
  const updates = req.body;  // expect a similar structure: { properties: { field: value, ... } }
  try {
    await hubspotClient.crm.contacts.basicApi.update(contactId, { properties: updates });
    res.json({ message: "Contact updated successfully" });
  } catch (err: any) {
    console.error("Error updating contact:", err.response?.body || err);
    res.status(500).json({ error: "Failed to update contact" });
  }
});
```

For example, sending a `PATCH /contacts/10401` with body `{"firstname": "Alicia"}` would update the first name of that contact to "Alicia". The API requires the `properties` wrapper when using the official client or raw JSON (`{ "properties": { "firstname": "Alicia" } }`).

**Note:** If a property does not exist or isn’t included in the scopes, HubSpot will return an error. Also, certain properties like email have special behavior (you generally shouldn’t update email to one that already exists on another contact, to avoid duplicates).

### Deleting a Contact

To delete (archive) a contact, use the DELETE endpoint. For example:

```typescript
router.delete('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const contactId = req.params.id;
    await hubspotClient.crm.contacts.basicApi.archive(contactId);
    res.json({ message: "Contact deleted (archived) successfully" });
  } catch (err: any) {
    console.error("Error deleting contact:", err.response?.body || err);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});
```

“Archive” in HubSpot means the contact is soft-deleted (recoverable). If you truly want to **permanently** delete (GDPR delete) a contact, there is a separate endpoint for GDPR delete, which is not reversible. Use that with caution.

### Handling Duplicate Contacts & Merging Strategies

HubSpot uses the contact’s email address as the **primary unique identifier** by default ([CRM API | Contacts - HubSpot](https://developers.hubspot.com/docs/guides/api/crm/objects/contacts#:~:text=It%20is%20recommended%20to%20always,GET%20request%20to%20%2Fcrm%2Fv3%2Fproperties%2Fcontacts)). Here’s how to handle duplicates and ensure data integrity:

- **Avoiding duplicates on create:** If you try to create a contact with an email that already exists in HubSpot, HubSpot will typically create a second contact with the same email *if* your portal allows duplicates (HubSpot now allows multiple contacts with the same email if the "allow duplicates" setting is on). To avoid accidental duplicates, you should **check for an existing contact** before creating a new one. Use the **Search API** to find contacts by email. For example, you can call `POST /crm/v3/objects/contacts/search` with a filter for email:

  ```typescript
  const searchPayload = {
    filterGroups: [{
      filters: [{ propertyName: "email", operator: "EQ", value: email }]
    }],
    properties: ["firstname", "lastname", "email"]
  };
  const searchRes = await hubspotClient.crm.contacts.searchApi.doSearch(searchPayload);
  const results = searchRes.body.results;
  if (results.length > 0) {
    const existingContact = results[0];
    // ... perhaps update instead of creating
  } else {
    // ... create new contact
  }
  ```

  If using direct HTTP calls, the search endpoint returns JSON with any matching records. This check can prevent duplicate contact creation.

- **Upsert by email:** HubSpot’s API supports an **upsert** operation using the `idProperty` query parameter. For example, a `POST /crm/v3/objects/contacts?idProperty=email` with a body containing the contact properties (including `"email": "alice@example.com"`) will **update** the existing contact with that email if found, or create a new one if not. This is a convenient way to do “create or update” in one call ([Unable to Update Contacts Via Email - HubSpot](https://community.hubspot.com/t5/CRM/Unable-to-Update-Contacts-Via-Email/m-p/710045#:~:text=Unable%20to%20Update%20Contacts%20Via,added%20to%20the%20request%20body)) ([CRM API | Contacts - HubSpot](https://developers.hubspot.com/docs/guides/api/crm/objects/contacts#:~:text=It%20is%20recommended%20to%20always,GET%20request%20to%20%2Fcrm%2Fv3%2Fproperties%2Fcontacts)). Be cautious: ensure the email field is included in the body exactly.

- **Merging contacts:** If you end up with duplicate contact records (e.g., one person has two contact records), HubSpot has a **Merge Contacts** API. The v3 API does not yet have a merge endpoint, but you can use the legacy v1 endpoint for merging two contacts by their IDs. It involves specifying one contact as the “primary” (the one to keep) and merging another into it. According to HubSpot’s docs, the merge endpoint is `POST /contacts/v1/contact/merge-vids/:contactId/`: it takes a JSON body with the ID of the contact to merge into the primary. After a merge, HubSpot moves all engagements (notes, emails, etc.) to the primary and keeps the primary’s email. If using this, authenticate via your private app token in the header (it works even though it’s a v1 legacy endpoint, as long as your token has contacts scope). 

  **Example merge call (pseudo-code):**
  ```typescript
  await axios.post(
    `https://api.hubapi.com/contacts/v1/contact/merge-vids/${primaryId}/`, 
    { "vidToMerge": secondaryId },
    { headers: { Authorization: `Bearer ${hubspotToken}` } }
  );
  ```
  This will merge the contact with ID `secondaryId` into the contact with `primaryId`. Use this carefully – merged contacts cannot be separated, and one of the records will be removed.

- **Deduplication best practice:** It’s best to design your integration to not create dupes in the first place. Always include an email when creating contacts (so HubSpot can use it as a unique key) ([CRM API | Contacts - HubSpot](https://developers.hubspot.com/docs/guides/api/crm/objects/contacts#:~:text=It%20is%20recommended%20to%20always,GET%20request%20to%20%2Fcrm%2Fv3%2Fproperties%2Fcontacts)). If your system has an internal unique ID for contacts, you might store that in a custom property in HubSpot to help identify duplicates or to use as an external key.

In summary, **check before create** (or use upsert) to handle duplicates, and if duplicates happen, use HubSpot's merge functionality or manual cleanup.

## 3. Managing Engagements (Calls, Meetings, Notes)

Engagements in HubSpot are activities associated with CRM records (contacts, companies, deals, etc.), such as calls, meetings, notes, tasks, and emails. Logging engagements via the API allows your Express app to record interactions (like a call or meeting) on a contact’s timeline.

HubSpot’s v3 API treats engagements as objects under the CRM API. You have separate endpoints for each engagement type:
- Calls: `/crm/v3/objects/calls`
- Meetings: `/crm/v3/objects/meetings`
- Notes: `/crm/v3/objects/notes`
- Tasks: `/crm/v3/objects/tasks`
- Emails: `/crm/v3/objects/emails` (for logged sales emails)

Each of these endpoints supports similar operations (create, get, update, delete). The key is to provide the correct **properties** for the engagement and the **associations** to link it to other records (like a contact or deal).

### Logging Calls via API

To log a call, you’ll use the Calls API. This typically involves specifying details like the call duration, outcome, timestamps, etc., and associating the call with a contact (and optionally a company or deal).

**Example: Log a call engagement and associate it with a contact**

```typescript
router.post('/contacts/:id/log-call', async (req: Request, res: Response) => {
  const contactId = req.params.id;
  const { note, callDurationMs, callOutcome, timestamp } = req.body;
  // `note`: text notes about the call, `callDurationMs`: duration in milliseconds, 
  // `callOutcome`: e.g. "ANSWERED" or "NO_ANSWER" etc (HubSpot uses dispositions GUIDs internally for outcomes)
  try {
    const callPayload = {
      properties: {
        hs_timestamp: timestamp || new Date().toISOString(),  // when the call happened
        hs_call_body: note || "Call logged via API",
        hs_call_duration: callDurationMs?.toString() || "0",  // duration as string (ms)
        hs_call_disposition: callOutcome || "",  // call outcome (if any)
        hs_call_status: "COMPLETED"  // typically "COMPLETED" for a finished call
      },
      associations: [
        {
          to: { id: contactId, type: "contact" }
        }
      ]
    };
    const result = await hubspotClient.crm.calls.basicApi.create(callPayload);
    res.status(201).json({ message: "Call logged in HubSpot", callId: result.body.id });
  } catch (err: any) {
    console.error("Error logging call:", err.response?.body || err);
    res.status(500).json({ error: "Failed to log call in HubSpot" });
  }
});
```

In this code, we use `hubspotClient.crm.calls.basicApi.create` to create a call engagement. The payload contains `properties` and `associations`:
- `hs_timestamp`: When the call took place (required).
- `hs_call_body`: Notes about the call.
- `hs_call_duration`: Duration in milliseconds (as a string).
- `hs_call_disposition`: The outcome of the call. HubSpot expects a specific GUID or key for outcome (e.g., default outcomes include "CONNECTED", "LEFT_LIVE_MESSAGE" etc., each represented by an internal ID). You can retrieve those via API if needed; for simplicity we pass an empty string if unknown.
- `hs_call_status`: Usually "COMPLETED" for a logged call (as opposed to "Scheduled" if it were upcoming).

The `associations` array here associates the call with a contact record (by specifying the contact’s ID and type). We could also associate the call with a company or deal by adding additional items in the associations array.

*Note:* The HubSpot API for calls may also accept a slightly different association format (some APIs use an object like `"associations": { "contactIds": ["123"] }`). The above format works with the Node client’s payload structure. Under the hood, this results in a request to `POST /crm/v3/objects/calls` with the JSON body containing properties and associations. Using the API directly, you would do the same ([Creating a Disposition Through an API Call - community.hubspot.com](https://community.hubspot.com/t5/APIs-Integrations/Creating-a-Disposition-Through-an-API-Call/m-p/690425#:~:text=Hey%2C%20You%20can%20do%20this,Best%2C%20Jaycee)).

### Logging Meetings (Engagements) via API

Meetings logged via the API are similar to calls in structure. You provide details like the meeting start/end time, subject, notes, and associate with contact, etc. The endpoint is `POST /crm/v3/objects/meetings`.

**Example: Log a past meeting with a contact**

```typescript
router.post('/contacts/:id/log-meeting', async (req: Request, res: Response) => {
  const contactId = req.params.id;
  const { subject, notes, startTime, endTime, outcome } = req.body;
  try {
    const meetingPayload = {
      properties: {
        hs_timestamp: startTime || new Date().toISOString(),  // start time of meeting
        hs_meeting_title: subject || "Meeting",
        hs_meeting_notes: notes || "",
        hs_meeting_start_time: startTime || new Date().toISOString(),
        hs_meeting_end_time: endTime || new Date().toISOString(),
        hs_meeting_outcome: outcome || ""  // e.g., "COMPLETED", "RESCHEDULED" etc., if any
      },
      associations: [
        { to: { id: contactId, type: "contact" } }
      ]
    };
    const result = await hubspotClient.crm.meetings.basicApi.create(meetingPayload);
    res.status(201).json({ message: "Meeting logged in HubSpot", meetingId: result.body.id });
  } catch (err: any) {
    console.error("Error logging meeting:", err.response?.body || err);
    res.status(500).json({ error: "Failed to log meeting in HubSpot" });
  }
});
```

This logs a meeting engagement on the contact’s timeline. The properties include `hs_meeting_title` (subject or title of meeting) and optional notes/outcome. Like calls, you must supply `hs_timestamp` (which indicates when it happened). 

Under the hood, this hits the same type of endpoint (CRM objects). According to HubSpot’s guide, to create a meeting engagement you make a POST to `/crm/v3/objects/meetings` with the meeting details and associations, just like above ([Meetings - v3 | HubSpot API](https://developers.hubspot.com/docs/reference/api/crm/engagements/meetings/v3#:~:text=post%20%2Fcrm%2Fv3%2Fobjects%2Fmeetings%20Copy%20full%20URL,creating%20standard%20meetings%20is%20provided)) ([Meetings - v3 | HubSpot API](https://developers.hubspot.com/docs/reference/api/crm/engagements/meetings#:~:text=The%20meetings%20engagements%20API%20allows,the%20rest%20of%20your%20team)).

### Logging Notes via API

Notes are simpler—just text notes attached to records (contacts, deals, etc.). The endpoint: `POST /crm/v3/objects/notes`. HubSpot requires a timestamp and the note body.

**Example: Log a note on a contact**

```typescript
router.post('/contacts/:id/notes', async (req: Request, res: Response) => {
  const contactId = req.params.id;
  const { note } = req.body;
  try {
    const notePayload = {
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: note || ""  // the content of the note
      },
      associations: [
        { to: { id: contactId, type: "contact" } }
      ]
    };
    const result = await hubspotClient.crm.notes.basicApi.create(notePayload);
    res.status(201).json({ message: "Note added to contact", noteId: result.body.id });
  } catch (err: any) {
    console.error("Error creating note:", err.response?.body || err);
    res.status(500).json({ error: "Failed to create note in HubSpot" });
  }
});
```

The note payload must include:
- `hs_timestamp`: a timestamp (in milliseconds or ISO date) for when the note is created – this determines where it appears on the timeline ([Notes API | HubSpot Public API Workspace | Postman API Network](https://www.postman.com/hubspot/hubspot-public-api-workspace/folder/ca90vni/notes-api#:~:text=)).
- `hs_note_body`: the text content of the note (up to 65k characters) ([Notes API | HubSpot Public API Workspace | Postman API Network](https://www.postman.com/hubspot/hubspot-public-api-workspace/folder/ca90vni/notes-api#:~:text=)).

We associate the note with a contact via the associations array. HubSpot’s documentation confirms that you include note details in `properties` and an `associations` object to link to records (e.g. contacts or companies) ([Notes API | HubSpot Public API Workspace | Postman API Network](https://www.postman.com/hubspot/hubspot-public-api-workspace/folder/ca90vni/notes-api#:~:text=In%20the%20request%20body%2C%20add,contacts%2C%20companies)). 

**Viewing logged engagements:** Once calls, meetings, or notes are created, they will appear on the associated contact’s timeline in HubSpot just as if they were logged through the HubSpot UI. The API returns an ID for the engagement (which you can use to update or delete it later if needed via `PATCH /crm/v3/objects/{engagementType}/{engagementId}` or `DELETE ...`).

### Structuring Engagement API Requests

The pattern for all engagements is similar:
- **Endpoint:** `/crm/v3/objects/{engagementType}`
- **Method:** `POST` to create, `PATCH` to update, `GET` to retrieve, `DELETE` to delete.
- **Request Body (for create/update):** 
  - A `properties` object with the relevant fields (each engagement type has specific property names, as shown above).
  - An `associations` object/array to link the engagement to one or more records (at minimum, a contact ID for most cases, but can also link to companies, deals, etc., as needed).

- **Response:** Returns the engagement record (with an `id` and the properties). 

By structuring your Express route handlers to take in the necessary fields (from `req.body` or `req.params`), you can log activities as needed. For example, after a sales call is completed in your system, you could call the `/contacts/:id/log-call` route to immediately record that in HubSpot.

### Example Implementation in Express Routes

We already provided sample Express routes. In practice, you might group these into a router or controller for “activities” or include them as part of a contact management router. Always validate input (make sure required fields are present before calling HubSpot API, to avoid unnecessary API calls that will error out).

You can also abstract common logic. For instance, if many engagement types share similar structure, you could write a generic function to create an engagement given a type and properties, but clarity is often better if each is slightly different.

One more example: logging a task (to-do) follow-up in HubSpot (tasks are another engagement type):

```typescript
router.post('/contacts/:id/tasks', async (req: Request, res: Response) => {
  const contactId = req.params.id;
  const { taskTitle, dueDate } = req.body;
  try {
    const taskPayload = {
      properties: {
        hs_task_body: taskTitle || "Follow up",
        hs_timestamp: dueDate || new Date().toISOString(),
        hs_task_status: "NOT_STARTED"
      },
      associations: [
        { to: { id: contactId, type: "contact" } }
      ]
    };
    const result = await hubspotClient.crm.tasks.basicApi.create(taskPayload);
    res.status(201).json({ message: "Task created in HubSpot", taskId: result.body.id });
  } catch (err: any) {
    console.error("Error creating task:", err.response?.body || err);
    res.status(500).json({ error: "Failed to create task in HubSpot" });
  }
});
```

This would create a new task on the contact with a status and due date. The process is analogous for other engagement types.

By logging engagements through your Node server, you ensure all your interactions (calls made, meetings held, notes taken) are tracked in HubSpot for a 360° view of the customer.

## 4. Handling Deal Pipelines

In HubSpot, **Deals** represent sales opportunities and typically go through stages in a pipeline (e.g., "Appointment Scheduled" → "Qualified" → ... → "Closed Won/Lost"). Integrating deals via API allows your application to create and update deals, associate them with contacts/companies, and track their progress.

### Creating Deals

The endpoint to create a deal is `POST /crm/v3/objects/deals`. A deal has its own properties; important ones include:
- `dealname`: The name of the deal (often something like the opportunity or project name).
- `amount`: The monetary value of the deal (if applicable).
- `pipeline`: The pipeline ID the deal belongs to (HubSpot has a default pipeline, but you may have multiple; each pipeline has an ID).
- `dealstage`: The stage ID within that pipeline.

**Example: Create a deal and associate it with a contact and company**

```typescript
router.post('/deals', async (req: Request, res: Response) => {
  const { dealName, amount, pipelineId, stageId, contactId, companyId } = req.body;
  if (!dealName || !pipelineId || !stageId) {
    return res.status(400).json({ error: "dealName, pipelineId, and stageId are required" });
  }
  try {
    const dealPayload = {
      properties: {
        dealname: dealName,
        amount: amount ? amount.toString() : undefined,
        pipeline: pipelineId,
        dealstage: stageId
      },
      associations: [] as { to: { id: string, type: string } }[]
    };
    // If associations provided, add them
    if (contactId) {
      dealPayload.associations.push({ to: { id: contactId, type: "contact" } });
    }
    if (companyId) {
      dealPayload.associations.push({ to: { id: companyId, type: "company" } });
    }
    const createRes = await hubspotClient.crm.deals.basicApi.create(dealPayload);
    const newDeal = createRes.body;
    res.status(201).json({ message: "Deal created in HubSpot", dealId: newDeal.id, deal: newDeal });
  } catch (err: any) {
    console.error("Error creating deal:", err.response?.body || err);
    res.status(500).json({ error: "Failed to create deal in HubSpot" });
  }
});
```

In this snippet, we gather deal info from `req.body`. We must have a pipeline and stage. HubSpot by default has a pipeline (often with internal ID "default" or a GUID) and a set of stages with internal IDs (like `appointmentscheduled`, `qualifiedtobuy`, etc., or GUIDs). You can retrieve pipeline and stage IDs via HubSpot API (`GET /crm/v3/pipelines/deals`). For simplicity, those are provided to the API route.

We also handle associations at creation: the code above associates the new deal with a contact and/or company if IDs are provided. HubSpot also allows adding associations after creation via a separate API call (using the **Associations API**), but doing it at creation is efficient.

The response will include the new deal’s ID and properties.

### Updating Deals (and Moving Stages)

Updating a deal (e.g., changing its stage or amount) uses `PATCH /crm/v3/objects/deals/{dealId}`. 

**Example: Update a deal’s stage or other properties**

```typescript
router.patch('/deals/:id', async (req: Request, res: Response) => {
  const dealId = req.params.id;
  const updates = req.body; // e.g. { dealstage: "newStageId", amount: "5000" }
  try {
    await hubspotClient.crm.deals.basicApi.update(dealId, { properties: updates });
    res.json({ message: "Deal updated successfully" });
  } catch (err: any) {
    console.error("Error updating deal:", err.response?.body || err);
    res.status(500).json({ error: "Failed to update deal" });
  }
});
```

This is similar to updating contacts. You provide only the properties you want to change. For instance, to move a deal to a new stage, send `{ dealstage: "<stageId>" }`. To change pipeline (and stage accordingly), send both new `pipeline` and `dealstage` (the stage must belong to the new pipeline).

### Associating Deals with Contacts and Companies

Often, you’ll want to link deals to the relevant contact (the person) and company (the organization). There are multiple ways:
- As shown above, include associations during deal creation (under `associations`). HubSpot will then automatically link them.
- If you have an existing deal that needs an association, use the Associations API endpoint: `PUT /crm/v3/objects/deals/{dealId}/associations/{toObjectType}/{toObjectId}/{associationType}`. However, HubSpot’s newer API also allows a simpler call with `hubspotClient.crm.associations.v4.basicApi.create(fromObjectType, fromObjectId, toObjectType, toObjectId, [associationType])` ([](https://www.npmjs.com/package/@hubspot/api-client#:~:text=const%20createContactResponse%20%3D%20await%20hubspotClient,id)). For example, to associate a deal with a contact:
  
  ```typescript
  await hubspotClient.crm.associations.v4.basicApi.create('deals', dealId, 'contacts', contactId, [
    {
      associationCategory: "HUBSPOT_DEFINED",
      associationTypeId: 3  // Typically, 3 might be the ID for deal->contact association in HubSpot’s default schema.
    }
  ]);
  ```
  
  (The associationTypeId for "deal has contact" can be found in HubSpot documentation or via the API. HubSpot defines default associations between standard objects.)

  If using direct HTTP, you could also POST to an associations endpoint with a JSON body. The Node SDK abstracts a lot of that. In many cases, specifying associations on creation is simpler.

- **Merging contacts and deals:** If a contact is merged (as described in section 2), any associated deals from the merged (secondary) contact will usually carry over to the primary contact (HubSpot handles this).

### Tracking Deal Progress and Status

Once deals are in HubSpot, you might want to track their progress through the pipeline stages. There are a few approaches:

- **Polling / Fetching:** Your app can fetch deals data periodically or on-demand. For example, you can retrieve all deals in a certain stage via the Search API or by listing deals and filtering client-side. The endpoint `GET /crm/v3/objects/deals` can list deals (with pagination), and you can include query params for properties to only retrieve pipeline and stage if needed.

- **Webhooks:** A more real-time approach (discussed in section 7) is to subscribe to deal property change events (e.g., dealstage changes) via HubSpot webhooks. That way, when a deal moves from one stage to another, HubSpot will notify your application, and you can react (update internal systems, send alerts, etc.).

- **Reporting via API:** HubSpot’s API also offers analytics endpoints or you can use the deals data to compute metrics (e.g., how many deals in each stage). That’s outside the scope of basic integration, but know that once deals are updated, you can leverage that data.

**Deal Pipelines in Code:** If your integration needs to create deals in specific pipelines or stages by name, you’ll first need to map those names to HubSpot’s internal IDs. Use `GET /crm/v3/pipelines/deals` to get pipelines and their stages. The response will include something like:

```json
{
  "results": [
    {
      "id": "default",
      "label": "Sales Pipeline",
      "stages": [
        { "id": "appointmentscheduled", "label": "Appointment Scheduled", ... },
        { "id": "qualifiedtobuy", "label": "Qualified to Buy", ... },
        ...
      ]
    }
  ]
}
```

For custom pipelines, the IDs might be GUIDs. Store these or configure them so your app knows which ID to use for each stage when making API calls.

**Example:** To mark a deal as Closed Won, you’d PATCH the deal with `{ dealstage: "<ClosedWonStageId>", pipeline: "<PipelineId>" }`. HubSpot will then mark it accordingly (and you might also set a property like `closedate` to now, if needed).

### Additional Considerations for Deals

- **Required properties:** HubSpot might require `dealname` and `pipeline`/`dealstage` on creation. If you omit required fields, you’ll get a 400 error with details about which field is missing.
- **Associations on deals in HubSpot UI:** When you create associations via API, they will appear in the HubSpot UI (e.g., on the deal record, you’ll see the associated contact under "Associated Contacts").
- **Deal custom properties:** If your HubSpot instance has custom deal properties (e.g., "Product Category" or "Region"), you can also set those via the API. Just include them in the `properties` payload with their internal name as the key.

By integrating deals through your Node.js app, your external sales processes (like an e-commerce purchase or a sales quote system) can stay in sync with HubSpot’s CRM, ensuring your pipeline in HubSpot reflects the reality of your business.

## 5. Scheduling Meetings (Appointments) via API

Scheduling meetings can refer to two things in HubSpot:
- Logging a meeting engagement (which we covered in section 3, as an activity on a timeline).
- Using HubSpot’s **Meetings scheduling tool** to actually book a meeting (which sends calendar invites, etc.).

This section focuses on the latter: booking appointments via HubSpot’s meetings API, and handling confirmations, reschedules, and cancellations. 

**Important:** HubSpot’s Meetings tool allows you to create a public scheduling page for sales reps. The Meetings **API** can interact with those scheduling pages (to some extent). However, note that the standard engagement creation API will *not* send calendar invites or confirmation emails – it just logs the event ([Need help with API's for sending mails and scheduling ... - HubSpot](https://community.hubspot.com/t5/APIs-Integrations/Need-help-with-API-s-for-sending-mails-and-scheduling-meetings/m-p/779788#:~:text=HubSpot%20community,with%20the%20HubSpot%20meetings%20tool)). To trigger actual invite emails and calendar sync, you need to book through the scheduling system.

### Booking an Appointment via the Meetings API

HubSpot’s documentation indicates you *can* book a meeting via API using a scheduling page ([Using Meeting API to schedule a meeting - HubSpot](https://community.hubspot.com/t5/Marketing-Integrations/Using-Meeting-API-to-schedule-a-meeting/m-p/862011#:~:text=can%20see%20the%20call%20in,Thank%20you)). The general process would be:
1. **Have a HubSpot Meetings link** set up for a user (each scheduling page has an ID or URL).
2. **Find available times** (the API may allow querying for available slots on that link).
3. **Submit a booking** via API, which would create a meeting (as an engagement of type meeting, with a special property indicating it's scheduled) and trigger HubSpot’s confirmation email/invite workflow.

Currently, HubSpot’s public API for scheduling meetings is limited. There isn’t an officially documented endpoint to directly provide a date/time and book a meeting on behalf of someone via their meeting link. Some developers have used a workaround by simulating the form submission to the HubSpot meetings endpoint (often an undocumented endpoint or using the HubSpot Form Submission API with the meeting form).

**One approach:** Use HubSpot’s **Meetings embed link** or scheduling URL and have the user pick a time (which goes through HubSpot’s UI or embed). If needing to do it purely via API (say your app already picked a time slot), you might:
- Use the engagement API to log a meeting (as shown earlier) **and additionally** send your own calendar invite email, since HubSpot’s invite won’t trigger through the engagement API alone ([Need help with API's for sending mails and scheduling ... - HubSpot](https://community.hubspot.com/t5/APIs-Integrations/Need-help-with-API-s-for-sending-mails-and-scheduling-meetings/m-p/779788#:~:text=HubSpot%20community,with%20the%20HubSpot%20meetings%20tool)).
- Alternatively, use an external calendar integration (outside HubSpot) to schedule the meeting and then just log it in HubSpot for record.

However, assuming HubSpot meetings API is available for booking:
HubSpot’s Meetings API for scheduling likely requires:
- The **owner (user)** who the meeting is with.
- The time slot chosen.
- Contact information of the person scheduling (name, email) – so HubSpot knows who to send confirmation to.
- Possibly the meeting type or meeting link ID.

If such an endpoint exists, it might look like: `POST /meetings/v1/meetings/schedule` (hypothetical) with a payload containing the above. (This is not confirmed in documentation).

**Best Practice for Confirmations:** When a meeting is scheduled (whether via HubSpot’s UI or API), HubSpot will send a confirmation email to the contact (provided the HubSpot user’s calendar is connected and the meetings tool is configured). This email contains an .ics calendar invite. It also sends an invite to the HubSpot user’s calendar.

If you **manually log a meeting via API**, **no invite is sent** ([Need help with API's for sending mails and scheduling ... - HubSpot](https://community.hubspot.com/t5/APIs-Integrations/Need-help-with-API-s-for-sending-mails-and-scheduling-meetings/m-p/779788#:~:text=HubSpot%20community,with%20the%20HubSpot%20meetings%20tool)). In that case, you have two options:
- Trigger an email yourself (perhaps using HubSpot’s SMTP API or a transactional email integration) with an .ics file attachment for the calendar invite.
- Or use a third-party calendar API (Google Calendar API or Microsoft Graph API if you have access to the user’s calendar) to create an event and invite the contact.

### Sending Confirmation Emails and Calendar Invites

Assuming you booked through HubSpot’s scheduling page (either via API or by redirecting the user to it), HubSpot handles the confirmation. If not, you need to handle it:
- **Confirmation Email:** This should include details (date/time, location or video conference link, etc.). You might compose this in your Node app or trigger a HubSpot workflow email if the meeting (engagement) is logged – though HubSpot’s workflow can send an email when an engagement is created, that might be a workaround.
- **Calendar Invite (.ics):** You can generate an .ics file in Node (there are libraries to create calendar invites) and send it to the participant. Or use an email service to do so. The .ics ensures the recipient can add it to their calendar.

### Rescheduling and Cancellation

**Rescheduling:** If a meeting was scheduled via HubSpot’s tool, the contact or user can typically reschedule via a link (HubSpot provides a link in the confirmation email to reschedule). If you want to handle reschedules via API:
- Cancel or delete the original meeting engagement (if you created it).
- Schedule a new one at the new time.
- Send updated invites.

HubSpot’s meetings (scheduling) system does have reschedule links for meetings booked through it. If a meeting is rescheduled through HubSpot’s system, the old engagement is updated to reflect the new time automatically (and HubSpot sends update emails). If you want your system to know about it, set up a webhook for engagement.creation or update for meetings, or a contact property "Next meeting date" if that fits.

**Cancellation:** Similar idea – if canceled via HubSpot (through the calendar or HubSpot UI), a cancellation email is sent to the contact by HubSpot. If you cancel via API, you likely:
- Delete the meeting engagement (`DELETE /crm/v3/objects/meetings/{meetingId}` to remove from HubSpot timeline).
- And additionally, send a cancellation email if HubSpot’s tool wasn’t used.

One thing to consider: If you are heavily relying on scheduling, it might be worth using HubSpot’s Meetings links directly (even embedding them in an iframe or via a custom UI) to leverage the built-in scheduling flow. The API can then be used to just log or fetch these meetings.

**Recap / Use Case:** Suppose your Express app has an endpoint for customers to book a demo call. You could:
- Use the HubSpot Meetings embed (which automatically handles booking, emailing, etc.), and then use webhooks to notify your app of the booking.
- Or accept a date/time in your app, call a HubSpot API to book it (if available), or log it and manually email.

Given HubSpot’s current limitations, many choose the first approach (embed or redirect to the HubSpot scheduling page) for the heavy lifting.

### Example (Pseudo-Code) of Booking via HubSpot Meetings (if API supported)

```typescript
router.post('/schedule-meeting', async (req: Request, res: Response) => {
  const { hubspotOwnerId, contactEmail, contactName, dateTime } = req.body;
  try {
    // Hypothetical endpoint usage - not actual documented:
    await axios.post('https://api.hubspot.com/meetings/v1/meetings', {
      ownerId: hubspotOwnerId,
      startTime: dateTime,
      email: contactEmail,
      firstName: contactName.split(' ')[0],
      lastName: contactName.split(' ')[1] || "",
    }, {
      headers: { Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN}` }
    });
    res.json({ message: "Meeting scheduled, confirmation will be sent by HubSpot" });
  } catch (err) {
    console.error("Error scheduling meeting:", err.response?.data || err);
    res.status(500).json({ error: "Failed to schedule meeting" });
  }
});
```

*The above is illustrative.* If HubSpot provides a way to do this, the real implementation details may vary. Always check the latest HubSpot API documentation for Meetings to see what’s possible in terms of booking through API.

**Note:** As of now, creating a meeting engagement via API does not send invites ([Need help with API's for sending mails and scheduling ... - HubSpot](https://community.hubspot.com/t5/APIs-Integrations/Need-help-with-API-s-for-sending-mails-and-scheduling-meetings/m-p/779788#:~:text=HubSpot%20community,with%20the%20HubSpot%20meetings%20tool)). HubSpot’s own community forums have acknowledged that the Meetings tool’s full functionality (like sending the actual calendar invite) can’t be triggered purely via an API call. So plan accordingly: possibly combine HubSpot’s logging with your own email notifications.

## 6. Express Routes & API Call Workflows

This section discusses how to design your Express server routes to trigger HubSpot API calls at the right times, how to handle incoming data (from forms or other sources) and transform it to HubSpot's format, and some logic considerations.

### Setting Up Routes to Trigger HubSpot API Calls (Post-Call, Form Submission, etc.)

**Post-Call Scenario:** Imagine a scenario where your sales reps make calls using a phone system and you want to log those calls in HubSpot after the call. If your phone system can send a webhook or call your API when a call ends, you’d create an Express route (e.g., `/api/calls/completed`) to receive that data and then use the HubSpot API to log the call.

For example:
```typescript
app.post('/api/calls/completed', async (req: Request, res: Response) => {
  const { agentId, contactPhone, callDuration, callNotes, callOutcome } = req.body;
  // Look up contact by phone (you might need to search HubSpot by phone to get contactId)
  // Then log call via HubSpot API as shown earlier.
});
```
In the above:
- You might first search HubSpot by phone to find the contact ID (since the phone system gave you phone number). HubSpot’s search API can filter by phone number similar to email.
- If found, you use the contactId to log the call (as in section 3).
- If not found, you might decide to create a new contact with that phone number before logging the call.

This demonstrates transforming inbound data (phone call info) into HubSpot API calls.

**Form Submission Scenario:** If you have a custom form on your website (instead of using HubSpot’s forms), and you want to push that data into HubSpot:
- Create an Express route, e.g., `POST /form/lead` that your form submits to.
- In that route, extract form fields (name, email, etc.), create a contact in HubSpot (as in section 2), and perhaps create a follow-up task or deal.
- Example:

  ```typescript
  app.post('/form/lead', async (req: Request, res: Response) => {
    const { name, email, message } = req.body;
    // Split name into first and last
    const [firstname, ...lastParts] = name.split(' ');
    const lastname = lastParts.join(' ');
    // Create contact in HubSpot
    try {
      const contactPayload = { properties: { email, firstname, lastname } };
      const contactRes = await hubspotClient.crm.contacts.basicApi.create(contactPayload);
      const contactId = contactRes.body.id;
      // Optionally, log a note with the message
      if (message) {
        await hubspotClient.crm.notes.basicApi.create({
          properties: { hs_note_body: message, hs_timestamp: new Date().toISOString() },
          associations: [ { to: { id: contactId, type: "contact" } } ]
        });
      }
      res.status(201).send("Thank you for submitting, we'll be in touch.");
    } catch (err) {
      console.error("Error processing lead form:", err.response?.body || err);
      res.status(500).send("An error occurred. Please try again.");
    }
  });
  ```
  This route takes the form input, maps it to HubSpot’s contact fields, and creates a contact + note. If the form had fields that map to custom HubSpot properties, ensure you use the internal names of those properties in the payload.

**General Tips for Express Routes:**
- Use `express.json()` middleware to parse JSON bodies. HubSpot’s APIs expect JSON, and your webhooks from HubSpot (in section 7) will send JSON.
- Validate inputs: don’t trust that the request will have all required fields. Send back a 400 Bad Request if something is missing, rather than calling HubSpot with bad data.
- Use async/await for clarity. Wrap calls in try/catch to handle promise rejections from the HubSpot client.
- Respond to the client or source of the request indicating success or failure appropriately (as in examples above).

### Handling Inbound Data Transformation

Often the data you receive will not be in the exact format that HubSpot expects:
- **Field naming differences:** Your form might have `phoneNumber` but HubSpot expects `phone`. Or `company_name` vs `company`.
- **Data types:** Some fields might need specific formats (dates should be ISO strings or UNIX timestamps in ms for HubSpot). For example, if you have a date of birth from a form as "2025-03-01", and you want to store it in a date property in HubSpot, you should convert it to a timestamp (milliseconds since epoch) or ISO8601 string.
- **Associations logic:** If your input comes with an email and a company name, and you want to associate the contact to a company in HubSpot, you’d need to:
  - See if a company with that name (or domain) exists (HubSpot Companies API has search by domain).
  - If exists, get companyId; if not, create a new company.
  - Then associate via API (either at contact creation or afterward using associations API).

Essentially, your Express route acts as a mediator: taking whatever comes in and turning it into one or multiple HubSpot API calls with the correct JSON shape.

A simple transformation example:
```typescript
// Transform a lead object to HubSpot contact properties
function mapLeadToHubSpotContact(lead: any) {
  return {
    properties: {
      email: lead.email,
      firstname: lead.firstName || lead.name, // support different naming
      lastname: lead.lastName || "",
      phone: lead.phoneNumber || lead.phone || ""
      // add other mappings...
    }
  };
}
```

Then use `hubspotClient.crm.contacts.basicApi.create(mapLeadToHubSpotContact(req.body))`.

### Express Route Logic and Order of Operations

If a single event in your app triggers multiple HubSpot actions, be mindful of order and dependencies:
- If you need an ID from the first call for the second (e.g., create contact then create deal associated with that contact), you must await the first before the second.
- If the operations are independent, you can do them in parallel (Promise.all). But if one failing should cancel the others, handle that logic (perhaps use try/catch around each and decide how to respond if one fails).

For maintainability, you might move HubSpot API call logic into separate **service functions** or classes. For example, create a `hubspotService.ts` that has methods like `createContact(contactData)`, `logCall(contactId, callData)`, etc. These methods would internally call `hubspotClient` and return results or throw errors. Your Express routes would then just call these service methods. This makes it easier to unit test the logic (mocking the HubSpot client if needed) and keeps your route handlers cleaner.

### Example: Using a Service for HubSpot Calls

```typescript
// hubspotService.ts
export async function createOrUpdateContactByEmail(email: string, properties: any) {
  // Check if contact exists
  const searchPayload = { filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }] };
  const searchRes = await hubspotClient.crm.contacts.searchApi.doSearch(searchPayload);
  if (searchRes.body.total === 0) {
    // create
    const createRes = await hubspotClient.crm.contacts.basicApi.create({ properties });
    return createRes.body;
  } else {
    // update first match
    const contactId = searchRes.body.results[0].id;
    await hubspotClient.crm.contacts.basicApi.update(contactId, { properties });
    return searchRes.body.results[0]; // return the existing contact info
  }
}
```

Now in your route:
```typescript
router.post('/newsletter-signup', async (req, res) => {
  const { email, firstName, lastName } = req.body;
  try {
    await createOrUpdateContactByEmail(email, { email, firstname: firstName, lastname: lastName });
    res.send("Subscribed successfully");
  } catch (err) {
    res.status(500).send("Error subscribing");
  }
});
```

This approach encapsulates the HubSpot logic (including the search for duplicate) in one place.

**Summary:** Design your Express routes around your app’s workflows (form submissions, call completions, sales pipeline updates, etc.), use the HubSpot API to reflect those events in HubSpot, and ensure you properly transform and validate data going in and coming out.

## 7. Webhooks for Real-Time Updates

Webhooks allow HubSpot to notify your application when certain events happen in HubSpot, enabling real-time sync. For example, if a contact’s property is updated or a deal moves stages, a webhook can be sent to your Express server so you can respond (update your database, send a notification, etc.).

### Setting Up HubSpot Webhooks (Private App Subscription)

With Private Apps, you can subscribe to events via the HubSpot UI (as of late 2023, HubSpot enabled webhooks for private apps). To set up:
1. Go to **Settings > Integrations > Private Apps** in HubSpot.
2. Edit your private app, and find the **Webhooks** section/tab.
3. Click **Add subscription** (or similar) and choose the event types you want (e.g., Contact property change, Deal property change, Contact creation, etc.).
4. Enter the **Target URL** which is an endpoint on your Express server that will receive the webhook POSTs ([Create and edit webhook subscriptions in private apps - HubSpot](https://developers.hubspot.com/docs/guides/apps/private-apps/create-and-edit-webhook-subscriptions-in-private-apps#:~:text=Create%20and%20edit%20webhook%20subscriptions,make%20a%20POST%20request)).
5. Save the subscription. HubSpot will likely send a test ping (or you can manually test from the UI).

For example, you might subscribe to:
- **Contact creation** (to know when a new contact is added in HubSpot).
- **Contact property changed** (like if a lead status changes to "Qualified").
- **Deal stage changed** (to act when deals progress).
- **Company creation/updates** as needed.

Your Express app needs to have routes to handle these. A common pattern is to have a single endpoint like `/hubspot/webhook` that all events are posted to, and inside, you route based on event type.

### Processing Webhook Payloads in Express

HubSpot webhooks will send an HTTP POST with a JSON body containing one or more events. The structure is typically:
```json
{
  "eventId": 12345,
  "subscriptionId": 67890,
  "portalId": 111111,
  "occurredAt": 1690912332000,
  "subscriptionType": "contact.propertyChange",
  "attemptNumber": 0,
  "objectId": 10401,
  "propertyName": "firstname",
  "propertyValue": "Alice"
}
```
(For a property change event, for example.)

If multiple events occur in a short time, HubSpot may batch them in an array and send together. So the webhook handler should handle both a single object or an array of objects in the request body.

**Example Express webhook handler:**

```typescript
app.post('/hubspot/webhook', express.json(), async (req: Request, res: Response) => {
  // Acknowledge receipt first to avoid timeouts
  res.status(200).send('OK');  // send a quick response to HubSpot

  const events = Array.isArray(req.body) ? req.body : [req.body];
  for (const event of events) {
    try {
      const type = event.subscriptionType;
      if (type === 'contact.creation') {
        const contactId = event.objectId;
        console.log(`New contact created in HubSpot with ID ${contactId}`);
        // You could fetch full details with an API call if needed, e.g., get contact by ID
      } else if (type === 'contact.propertyChange') {
        if (event.propertyName === 'lifecyclestage') {
          const newStage = event.propertyValue;
          const contactId = event.objectId;
          console.log(`Contact ${contactId} lifecycle stage changed to ${newStage}`);
          // Perhaps update this info in your system or trigger something
        }
      } else if (type === 'deal.propertyChange') {
        if (event.propertyName === 'dealstage') {
          const dealId = event.objectId;
          const newStageId = event.propertyValue;
          console.log(`Deal ${dealId} moved to stage ${newStageId}`);
          // Fetch deal to get more info, update internal DB, etc.
        }
      }
      // ...handle other event types similarly...
    } catch (err) {
      console.error("Error processing webhook event:", err);
      // (Optional) add retry logic or store for later processing
    }
  }
});
```

In this code, we immediately respond with 200 OK to HubSpot. **This is important**: HubSpot webhooks expect a fast response. If you take too long (over ~5 seconds) or return a non-200 status, HubSpot will mark it as failed and retry later ([Webhook rules for connecting and retrying requests - HubSpot](https://community.hubspot.com/t5/APIs-Integrations/Webhook-rules-for-connecting-and-retrying-requests/td-p/526229#:~:text=HubSpot%20community,4XX%20series%20response%20status%20codes)) ([Solved: HubSpot Community - Webhooks response - HubSpot Community](https://community.hubspot.com/t5/APIs-Integrations/Webhooks-response/m-p/277558#:~:text=Community%20community.hubspot.com%20%205XX%20,do%20not%20want%20the%20notification)). Quick response ensures HubSpot doesn’t unnecessarily retry. You can process the events asynchronously (as shown, after sending the OK).

Some best practices for handling HubSpot webhooks:
- **Respond quickly:** As mentioned. If you have heavy work (like making multiple API calls or database operations), consider offloading that to a background job or queue after acknowledging the webhook.
- **Idempotency:** HubSpot might retry events, so design your handlers to handle duplicates (e.g., use an event ID to ignore duplicates or ensure updates are idempotent).
- **Security:** HubSpot webhooks can be verified via signatures. For public apps, HubSpot includes an `X-HubSpot-Signature` header which you can verify using your app secret ([Webhooks | Validating Requests - HubSpot](https://developers.hubspot.com/docs/guides/apps/authentication/validating-requests#:~:text=If%20your%20app%20is%20handling,with%20details%20of%20the%20request)) ([Webhooks API - HubSpot](https://developers.hubspot.com/docs/guides/api/app-management/webhooks#:~:text=You%20must%20set%20up%20a,request%20body%20HubSpot%20is%20sending)). For private apps, signature verification might not be straightforward (since private apps don’t have a traditional client secret). If your endpoint is open, consider at least checking the `hubspot.com` source IP or requiring a secret token in the URL (HubSpot allows adding query params to webhook URL). Alternatively, if behind an API gateway, use authentication there. Since this is internal integration, many simply rely on the obscurity of the URL and HTTPS.
- **Use cases:** With webhooks you can achieve things like:
  - When a lead’s status changes to "Customer" in HubSpot, automatically call your billing system API to provision something.
  - When a deal is won, trigger a celebration message in your team’s Slack (your Express app could receive the event and then call Slack API).
  - Keep an external database in sync with HubSpot: e.g., whenever a contact is modified, update a local CRM database.

### Examples of Useful Webhook Subscriptions

- **contact.creation** – notify or log new sign-ups.
- **contact.propertyChange** – e.g., monitor `lifecyclestage`, `hs_lead_status`, or custom properties. If a sales rep updates a field in HubSpot, your app finds out.
- **deal.propertyChange** – track `dealstage` to know when deals move or close.
- **deal.creation** – if deals are sometimes created in HubSpot manually, you can catch that.
- **company.propertyChange or creation** – if relevant to your use case (like territory changes).
- **conversation.creation** (if using HubSpot conversations) – possibly to log chats.
- **ticket.creation/propertyChange** – if using Service Hub tickets.

After setting up, test your webhooks:
- You can use a tool like ngrok to expose your local server (see next section) and then in HubSpot settings, trigger a test webhook to your URL (HubSpot provides a "Test" function when setting up the webhook).
- Ensure your Express app is logging or handling the event as expected.

### Using Ngrok for Local Development and Testing Webhooks

Ngrok is an excellent tool to test webhooks locally. It creates a public URL (HTTPS) that tunnels to your local machine. Steps:
1. Install ngrok (e.g., via npm or download binary).
2. Run `ngrok http 3000` (if your Express app runs on port 3000).
3. Ngrok will output a URL like `https://random-id.ngrok.io` – copy this.
4. In your HubSpot private app webhook config, set the target URL to this ngrok URL + your endpoint, e.g. `https://random-id.ngrok.io/hubspot/webhook`.
5. Perform an action in HubSpot to trigger the webhook or use the test button. Watch your Express app logs to see if it received it.

Using ngrok means you can debug the webhook logic in real time without deploying to a server. Just remember to update the webhook URL when you deploy (you don’t want the ngrok URL in production, but rather your real domain).

### Webhook Reliability and Retries

HubSpot webhook delivery is robust: if your endpoint is down or returns non-200, HubSpot will retry several times with exponential backoff. According to their documentation, they retry up to 10 times over about 10 minutes, doubling the interval each time (roughly) ([Updated Webhook Retry Logic - HubSpot](https://developers.hubspot.com/changelog/2018-12-10-updated-webhook-retry-logic#:~:text=Updated%20Webhook%20Retry%20Logic%20,13%20minutes)). Also:
- If your endpoint returns a 4xx (client error) like 404 or 400, HubSpot will **not retry** (it assumes the URL or request is bad and retrying won’t help) ([Solved: HubSpot Community - Webhooks response - HubSpot Community](https://community.hubspot.com/t5/APIs-Integrations/Webhooks-response/m-p/277558#:~:text=Community%20community.hubspot.com%20%205XX%20,do%20not%20want%20the%20notification)).
- If it returns 5xx or timeouts, it will retry (assuming it’s a temporary issue).

Log incoming webhooks (at least at the debug level) so you have a trace of what happened. If something goes wrong (like you missed an event due to downtime), you can fetch data manually from HubSpot as a fallback (e.g., get all recent deals updated after a certain time).

By leveraging webhooks, your integration becomes a two-way sync: not only can you push data to HubSpot, but HubSpot can push data to you, keeping everything aligned in near real-time.

## 8. Deployment Guidance

When it comes time to deploy your Node.js + TypeScript Express app that integrates with HubSpot, there are a few considerations to ensure it runs smoothly in production. We will discuss hosting (using Render.com as mentioned), using ngrok for development (covered above), and security best practices for API keys (tokens) in a deployed environment.

### Hosting on Render.com (or Similar)

**Render.com** is a popular cloud hosting platform that can easily deploy Node.js applications from a Git repository. Key points for deploying on Render (or any platform):
- **Build and Start Command:** Since this is a TypeScript project, you likely need to compile TS to JS before running. You can either:
  - Precompile and commit the JS (not ideal), 
  - Use Render’s build command to compile TS. For example, you might set your Render **Build Command** to `npm install && npm run build` (assuming `build` script runs tsc), and the **Start Command** to `npm run start` (which runs the compiled JS, e.g. `node dist/index.js`).
- **Environment Variables:** In Render’s dashboard, set the `HUBSPOT_PRIVATE_APP_TOKEN` (and any other secrets like perhaps a database URL) in the **Environment** section ([Environment Variables and Secrets – Render Docs](https://render.com/docs/configure-environment-variables#:~:text=Environment%20Variables%20and%20Secrets%20%E2%80%93,env%20to%20add%20environment)). Render will supply these to your app. You do *not* include the .env file in your repository (for security). Instead, use Render’s config. Locally, you use .env + dotenv, in Render, those environment variables are automatically available.
- **Server Port:** Render sets an environment variable (e.g. `PORT`) that your app should use. Make sure your Express app listens on `process.env.PORT || 3000` rather than a hardcoded port. Render will expose the service on its own URL.
- **Domains and Webhooks:** Once deployed, you’ll have a stable URL (like `your-app.onrender.com`). Use that in your HubSpot webhook settings (e.g., `https://your-app.onrender.com/hubspot/webhook`). Ensure your app is using HTTPS (Render does that by default with its URL).
- **Scaling:** If you expect high volume (like many webhooks or heavy usage), consider the plan or instance size on Render. Also, you might use a background job system for heavy tasks if needed (Render supports worker services too).
- **Logging:** Render provides logs; make sure to log errors (without sensitive info) so you can debug any issues in production.

### Using Ngrok for Local Development

We touched on ngrok in the webhook section. To reiterate:
- It’s mainly for development/testing. Do not use ngrok in production.
- It helps simulate the production environment for external callbacks. For example, testing OAuth redirects or webhooks from HubSpot.
- Always turn off ngrok when not needed, and remember that each time you run it, the URL might change unless you have a paid plan with a fixed subdomain.

### Security Best Practices for API Key/Token Management

In production, security is paramount:
- **Never expose the HubSpot token** in client-side code or logs. Keep it on the server side. If someone gains access to your private app token, they essentially have the keys to your HubSpot data.
- **Use environment-specific configuration:** In a development environment, you might use a HubSpot sandbox with a separate token, to avoid messing with real data. Keep those tokens separate and use env vars like `HUBSPOT_TOKEN_DEV` vs `HUBSPOT_TOKEN_PROD` if needed.
- **Limit access:** If deploying on a platform like Render, ensure only authorized team members have access to the dashboard (where they could see the env vars). The fewer places the token is stored, the better.
- **Monitoring:** Consider monitoring and alerts for your integration. If HubSpot API credentials fail (e.g., token revoked) or if your app is returning errors frequently, you want to know. This could be as simple as logging and manually checking, or integrating with a monitoring service.
- **HTTPS:** Always use HTTPS for any webhooks or any endpoints that involve sensitive data. Render and similar services provide HTTPS by default. If you host elsewhere, ensure you set up TLS.
- **Dependency updates:** Keep the `@hubspot/api-client` and other dependencies updated to get security patches and latest features.

### Additional Deployment Notes (e.g., CI/CD)

If your code is in GitHub, you can connect Render to auto-deploy on pushes to a branch. Always double-check that the environment variables are set on Render before deploying (to avoid your app starting without the token).

For TypeScript, some like to use `ts-node` in development and compile for production. On Render, it’s usually better to compile to plain JS (for performance). Ensure your build outputs the necessary files to run.

Finally, test your production deployment with a test event (e.g., create a test contact from HubSpot and see if your webhook catches it, or hit your endpoints with a tool like Postman to ensure they call HubSpot properly).

## 9. Error Handling & Logging

Robust error handling and logging are essential for maintaining your integration. Here we cover how to handle HubSpot API errors (including rate limits) and implement logging and retry logic for a reliable integration.

### Handling HubSpot API Errors and Rate Limits

The HubSpot API may return errors for various reasons:
- Bad requests (400) – e.g., required field missing, invalid data format.
- Unauthorized (401/403) – token is invalid or missing required scopes.
- Not found (404) – trying to access or update an object that doesn’t exist.
- Too Many Requests (429) – hitting rate limits.
- Server errors (500/502) – HubSpot side issues (rare but possible).

**Best practices:**
- Always check the status code of the response (the HubSpot Node client will throw an exception for non-2xx responses). In `catch`, inspect `err.response?.body` which often contains a message and context.
- Implement conditional logic: for example, if a 404 occurs on getting a contact, you might decide to create it (if that was your logic).
- For 400 errors, log the response error message; it often explains what went wrong (e.g., "Property X does not exist" or "Invalid input for property Y").

**Rate Limits:** HubSpot’s standard API rate limit for private apps (and OAuth apps) is **100 requests per 10 seconds** ([](https://www.npmjs.com/package/@hubspot/api-client#:~:text=Bottleneck%20is%20used%20for%20rate,on%20don%27t%20apply)). If you exceed this, you’ll get HTTP 429 errors. HubSpot’s SDK automatically handles some rate limiting using a library called Bottleneck ([](https://www.npmjs.com/package/@hubspot/api-client#:~:text=Bottleneck%20is%20used%20for%20rate,on%20don%27t%20apply)). By default, it allows ~9 requests per second burst and max 6 concurrent, which helps avoid hitting the 100/10 limit ([](https://www.npmjs.com/package/@hubspot/api-client#:~:text=Default%20settings%20for%20the%20limiter,are)).

If you are not using the SDK’s built-in features, you should implement your own:
- Throttle calls if you foresee bursts. (For example, if processing a webhook that results in 50 HubSpot calls, you might add slight delays or queue them.)
- When a 429 is encountered, back off and retry after a delay. The SDK can automatically retry 429s if configured with `numberOfApiCallRetries` option ([](https://www.npmjs.com/package/@hubspot/api-client#:~:text=It%27s%20possible%20to%20turn%20on,value)).

**Example of handling 429 manually:**
```typescript
try {
  await hubspotClient.crm.contacts.basicApi.create(contactPayload);
} catch (err: any) {
  if (err.response?.statusCode === 429) {
    console.warn("Rate limit hit, retrying after 10 seconds...");
    setTimeout(async () => {
      try {
        await hubspotClient.crm.contacts.basicApi.create(contactPayload);
      } catch (e: any) {
        console.error("Retry failed:", e.response?.body || e);
      }
    }, 10000);
  } else {
    throw err; // rethrow others or handle accordingly
  }
}
```

The above is simplistic; in production you might implement a more robust retry with backoff for multiple attempts. The official client’s retry logic (when enabled) will wait 10 seconds and retry up to 3 times for 429 and certain 5xx statuses ([](https://www.npmjs.com/package/@hubspot/api-client#:~:text=It%27s%20possible%20to%20turn%20on,value)) – you can enable this by `new Client({ accessToken: token, numberOfApiCallRetries: 3 })`.

- **Caution:** Do not blindly retry on 4xx errors (other than 429). If you get 401/403, retrying won’t help – you need to fix the token or scopes. If 400, fix the request. Only 429 and 5xx are typically retryable errors.

### Logging Requests and Responses for Debugging

Implement logging in your Express app to record interactions with HubSpot. However, avoid logging sensitive data (like full contact info or tokens). Key things to log:
- When making a call to HubSpot, log the intent (e.g., "Creating contact for email X").
- If it fails, log the error status and message from HubSpot’s response.
- Webhook events: log at least the type of event and objectId received.
- Significant decisions, e.g., "Contact not found, creating new one", or "Merging duplicate contacts".

Use a logging library like **winston** or **pino** for more structure, or `console.log` for simplicity. In production, structured logs (JSON) are easier to feed into monitoring systems.

For example:
```typescript
console.info(`HubSpot API: creating deal for contact ${contactId} in pipeline ${pipelineId}`);
```
On error:
```typescript
console.error(`HubSpot API Error: ${err.response?.statusCode} - ${err.response?.body?.message || err.message}`);
```
This will output the HTTP status and the error message HubSpot provided, which is crucial for debugging (HubSpot often provides descriptive errors).

**Logging sensitive info:** Never log the token. Also, be mindful if logging entire request/response objects; they may contain personal data (PII). Log just what’s necessary (IDs, status, etc.). If you need deeper debugging, do it in a controlled way or on dev environment.

### Implementing Retry Logic

We already discussed retry for rate limits. More generally:
- If a HubSpot API call fails due to network issues or 5xx, a simple strategy is to retry a couple of times after a short delay. The client’s `numberOfApiCallRetries` covers this for you up to 6 retries max ([](https://www.npmjs.com/package/@hubspot/api-client#:~:text=It%27s%20possible%20to%20turn%20on,value)). You can rely on that or implement custom if not using the official client.
- For webhooks: if your processing fails after acknowledging to HubSpot, you might store that event in a "dead letter queue" or log file to revisit later. HubSpot will retry the webhook if you didn't acknowledge, but if you did (by responding 200) and then your internal logic failed, HubSpot won’t resend. So consider wrapping your webhook processing in a try/catch and if something fails, maybe alert a dev or store the data to be handled manually.

**Example:** If adding a contact to your database fails in the webhook handler, you could catch and enqueue the event to retry that DB operation later.

### Monitoring and Alerts

While not explicitly asked, as part of best practices:
- Set up alerts for certain failure scenarios. For example, if you get a lot of 429s (meaning you might need to increase capacity or adjust limits), or if webhooks are failing.
- You can use CloudWatch, Sentry, or even simple email alerts in code (e.g., send an email if a critical section fails) to get notified.

### Graceful Degradation

If HubSpot API is down or your token expired, your app should not crash. Handle exceptions and decide:
- Could you queue the action and try later?
- Should you temporarily stop accepting certain requests (e.g., if contact creation fails, maybe respond to user "We will follow up shortly" and queue their info).

### Example of Comprehensive Error Handling in a Route

```typescript
router.post('/order', async (req, res) => {
  try {
    // 1. Create contact in HubSpot
    // 2. Create deal in HubSpot
    // 3. Associate deal with contact
    // (Wrap each in try/catch or use Promise.all with a global try)
    const contactRes = await hubspotClient.crm.contacts.basicApi.create({ properties: {...} });
    const dealRes = await hubspotClient.crm.deals.basicApi.create({ properties: {...}, associations: [...] });
    res.status(201).send("Order and CRM entry created.");
  } catch (err: any) {
    // Determine type of error
    const status = err.response?.statusCode;
    const message = err.response?.body?.message || err.message;
    console.error(`HubSpot API error during order processing: [${status}] ${message}`);
    if (status === 429) {
      res.status(503).send("Service is busy, please try again shortly.");  // maybe advise retry
    } else if (status === 401 || status === 403) {
      res.status(500).send("CRM integration misconfigured (auth issue).");
      // Possibly alert internal team to check token/scopes
    } else {
      res.status(500).send("An error occurred while syncing with CRM.");
    }
  }
});
```

In this example, we tailor the response based on error. We don’t expose HubSpot’s internal error to the end user, but we log it for ourselves. For a 429, we return 503 (Service Unavailable) to hint the client it was a temporary issue.

### Conclusion & README Tips

We’ve covered a lot of ground: from authentication, CRUD operations on contacts, logging engagements, managing deals, scheduling meetings, to webhooks and deployment. By following the patterns and examples above, you can build a robust integration between a Node.js/TypeScript server and HubSpot.

**Sample `.env` (for reference):**
```
# .env
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-YourTokenHere1234567890
PORT=3000  # port for Express (optional if you want to fix it, else use default/Render)
```

**README Documentation Tips:**
In your project’s README, include:
- Setup instructions: how to install (`npm install`), how to run dev server (`npm run dev` perhaps), how to build (`npm run build`).
- Environment config: list required environment variables like `HUBSPOT_PRIVATE_APP_TOKEN` and any others (and mention to create a HubSpot private app to get that token).
- Quick start: For example, "Rename `.env.example` to `.env` and fill in your token. Then run `npm run dev` to start the server locally."
- Brief description of what the app does (e.g., "This server integrates with HubSpot to sync contacts and deals...").

By documenting these in a README, any new developer or your future self can quickly get the project running and understand how to use it.

Lastly, always refer to HubSpot’s official API documentation for any changes or new features. The integration you build should evolve as you add more use cases, but the patterns of secure auth, data mapping, and robust error handling will remain key to a successful integration. Happy coding!

