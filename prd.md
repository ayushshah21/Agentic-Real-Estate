# Agentic Real Estate AI Assistant - Product Requirements Document

## Initial Response

I'll determine whether you need Twilio and Ngrok for other functions like messaging and webhook handling. I'll also research the best knowledge base setup for your initial demo and integration with different companies in the future.

For HubSpot CRM, I'll focus on both free-tier and paid-tier features, outlining what can be done in each. Additionally, I'll explore whether an agentic workflow using LangChain makes sense for your use case and provide relevant documentation.

I'll lay out a full development workflow, from setting up your environment to deploying the solution, including detailed steps for CRM integration, inbound call handling, appointment scheduling, and more.

## Research Findings

### 1. Twilio & Ngrok Usage with VAPI

#### Voice Calls

If you use VAPI's built-in telephony, Twilio may be optional for handling calls. VAPI can provision phone numbers or import your Twilio number directly. This means you can receive and make calls through VAPI without running a separate Twilio voice application. Twilio Media Streams or TwiML would only be needed if you choose to manage the call audio yourself instead of letting VAPI handle the voice routing. In most cases, VAPI integrates with Twilio under the hood (for telephony), so you don't need to manually handle Twilio voice logic.

#### SMS & Webhooks

For SMS messaging or additional webhook handling, Twilio is still useful. VAPI focuses on voice AI, and it doesn't natively handle SMS. If your solution requires texting leads or sending confirmations, you'd rely on Twilio's Programmable SMS API. Similarly, if you run a custom server to process events (like logging conversations or triggering CRM updates), Twilio will send webhooks to your server for incoming messages or calls. In development, ngrok is helpful for exposing your local server to Twilio's webhooks. Ngrok creates a public URL so Twilio can reach your local webhook endpoints for testing. In production, you'd replace ngrok with a deployed web service.

#### Call Forwarding

VAPI supports call transfers via its transferCall tool for connecting to live agents or departments. If you only need simple forwarding (e.g. to an agent's number), VAPI can dial out without extra Twilio code. However, for complex scenarios like placing a caller on hold while dialing a specialist, you might use Twilio's conferencing capabilities. The VAPI docs describe using Twilio to bridge calls in a conference for an "on-hold" workflow, since VAPI alone doesn't do multi-party bridging.

In summary, Twilio is not strictly required for basic voice AI with VAPI, but it remains valuable for SMS, advanced call control, and as the underlying carrier for phone calls. Ngrok is only for local testing to receive Twilio/VAPI webhooks and isn't needed once you deploy your application on a public server.

#### Best Workflow

To integrate VAPI efficiently, use VAPI for what it excels at (real-time voice AI and call handling) and Twilio for supplementary channels. For example:

1. Use a VAPI-provided number (or import a Twilio number into VAPI) for handling voice calls with the AI assistant
2. Set up Twilio webhooks (or VAPI Server URLs) to notify your backend when events occur (call started, ended, etc.), then have your backend logic respond (e.g. update a CRM, send an SMS via Twilio)
3. Only employ Twilio's voice APIs directly if you need features VAPI doesn't cover (like complex IVR flows, SMS, or transcriptions beyond VAPI's capabilities)

This keeps the architecture streamlined: VAPI manages the AI conversation, Twilio handles the telephony layer and any additional messaging.

### 2. Best Knowledge Base Setup

#### Initial Demo Knowledge Base

Start with a small, targeted knowledge base containing frequently asked questions and key property information. VAPI allows you to upload documents (PDFs, text, Word, etc.) and create a custom knowledge base from them. For a real estate demo, you might include:

- Sample property listings
- List of common real estate terms
- Q&A pairs
- Property descriptions, pricing, and agent contact info

For example, upload a Markdown or PDF file that has property descriptions, pricing, and agent contact info. VAPI's knowledge base will chunk and index this content so the AI can provide accurate answers based on it. The benefit is improved accuracy and more detailed answers on those specific properties or topics, as VAPI will use this data to ground its responses. Make sure to test the assistant on questions about these properties to refine the knowledge base content.

#### Scaling to Real Agencies

Later, you can integrate richer data sources to serve actual real estate agents and clients. One approach is to connect to MLS data. Many MLS boards provide data feeds or APIs (for example, Zillow's Bridge API allows access to MLS listings via REST, normalized to the RESO standard). An MLS property listing API can supply up-to-date property details, images, prices, and availability, which your AI can use.

You might start by periodically importing listings from a particular brokerage or region into your knowledge base. In addition to MLS, use public real estate APIs for broader info – e.g. Zillow or Realtor.com APIs for home estimates, or neighborhood data APIs for schools, crime rates, etc. Public records and property tax databases (sometimes accessible via county APIs or services like ATTOM) can enrich your data.

#### CRM and Internal Data

If the real estate agency has a CRM or database (past client inquiries, saved search criteria, etc.), that data can become part of the knowledge base. For instance, you could ingest parts of a CRM dataset (with permission) such as common inquiry responses or agent bios. Be mindful of privacy – perhaps use only aggregate or non-personal data for the AI's knowledge.

Over time, each agency might maintain its own knowledge base that includes its active listings, company FAQs, and market statistics relevant to their area. VAPI's knowledge base supports multiple files and even websites as sources, so you could integrate data from the agency's site or an MLS feed directly.

#### Recommendations

For the demo, keep the knowledge base simple and relevant (a handful of listings and Q&A). This can be done by manually curating a small set of documents. Later, automate the knowledge base updates by:

- Pulling from MLS feeds
- Using public APIs like Zillow's property API or others (RapidAPI has a collection of real estate APIs)
- Syncing with any pre-existing CRM data the agency has (e.g. a list of leads or properties in their CRM exported as CSV)

Combining these sources ensures the AI has a comprehensive and up-to-date knowledge base, which leads to more informative conversations.

### 3. Documentation Needs

Two levels of documentation are required:

#### Internal Technical Docs

Document the architecture of the AI assistant system, including all components and workflows. For example:

- Create an architecture diagram showing how calls flow from the phone network into VAPI (or Twilio), then into your backend (if applicable), and how data moves to the CRM
- Describe each module: voice input handling, AI processing, knowledge base lookup, CRM sync, etc.
- Include details like environment setup (which repositories, environment variables, API keys are needed)
- Deployment process and how to run the system locally (using ngrok for webhooks, etc.)
- Error handling, logging, and any configuration (like how to swap out the knowledge base or change phone numbers)

This internal doc is for developers on your team to maintain and extend the system. Clear internal docs ensure new developers can get the system running and understand its internals quickly.

#### External Integration Guide

This is for third-party developers (or technically inclined clients) who want to interact with your AI assistant via APIs. It should explain:

- How to trigger the assistant and what endpoints or events are available
- If you allow developers to call the AI via an API, document the REST endpoint or SDK function
- If the assistant can send webhooks (like "lead qualified" events), detail the webhook payloads and how to subscribe
- Provide clear examples for common real estate scenarios, so developers see exactly how to use the assistant

For example, include a sample Twilio webhook payload for an inbound call and how your system responds, or an example of a contact being created in HubSpot after a call (with the JSON fields).

#### Example Use Cases

It's very helpful to include scenario-based examples in the documentation. For instance:

**Inquiry Call Example:**
A buyer calls the AI assistant and asks about a property. The assistant looks up details (bedrooms, price) from the knowledge base and answers. It then asks if the caller wants to schedule a viewing. When the caller says yes, the assistant creates an appointment and logs the interaction in the CRM.

Walk through the APIs involved in that scenario:

```
Twilio voice webhook -> AI response -> HubSpot contact created -> meeting scheduled
```

**Follow-up SMS Example:**
After the call, the system sends the caller a text with the property info and a link to the listing (using Twilio SMS).

**API Example:**

```json
POST /crm/v3/objects/contacts  
{
    "properties": {
        "firstname": "John",
        "lastname": "Doe",
        "phone": "+1 512 555 1212",
        "email": "john@example.com"
    }
}
```

Explain the expected success response and how the assistant uses the contact ID going forward. Also, include an example of a VAPI call initiation via API (e.g., how to start an outbound call by hitting VAPI's /call/phone endpoint with an assistantId).

Good documentation should be comprehensive yet approachable. It might help to have a "Quick Start" section for new developers (with minimal steps to get a basic call working), followed by detailed reference sections.

### 4. HubSpot CRM Integration

#### Free vs Paid Tier Features

HubSpot's API can be used on the free CRM tier with nearly full functionality for core CRM objects. The free tier allows:

- Unlimited contacts
- Up to 40,000 API calls per day at no cost
- Create contacts, companies, deals, and log engagements (calls, meetings, notes) via the API
- Contacts API for programmatically creating and managing contact records
- Calls API (engagement endpoint) for logging call details to a contact's timeline

Paid tiers (Sales Hub Professional, etc.) don't so much "unlock the API" but offer additional features:

- Custom objects
- Multiple deal pipelines
- Advanced analytics via API
- Built-in calling tool
- Meeting scheduling links
- Greater API rate limits
- Custom properties
- Webhooks for certain events

#### Creating Contacts

To integrate with HubSpot, you'll use their CRM endpoints. Upon a new lead (say a caller who provided their name and number), use the Contacts API to create a contact record. This is a simple POST request to HubSpot's /contacts endpoint with fields like name, phone, and email.

HubSpot automatically deduplicates contacts by email, so if the person has called before (and you captured their email), HubSpot will update the existing contact instead of creating duplicates. On free tier, you can create contacts without issue – just obtain a Private App API token from HubSpot and include it in the authorization header. The response will include a contact ID which you should store for future interactions.

#### Logging Interactions

Use HubSpot Engagements APIs to log calls and notes. After each AI-driven call, you can create a Call engagement on the contact's timeline. The Calls API lets you specify details like:

- Call duration
- Outcome
- Recording URL
- Transcription text

For example, you might mark the call outcome as "Answered by AI Assistant" and include key points as a note. Similarly, if the assistant sends an email or SMS, you might log that as an Engagement (HubSpot has Email and Note engagement types too). The free tier supports creating these engagements – they will then appear in the HubSpot CRM UI under the contact, providing a history of all interactions.

#### Handling Inbound Calls

Inbound calls to the AI assistant can be reflected in HubSpot in several ways. One approach is to use HubSpot's timeline events or tickets, but a simpler method is:

1. When an inbound call starts, immediately log a Call engagement with status "In Progress" for that contact (or an unassigned contact if the identity isn't known yet)
2. Once the call concludes and the assistant qualifies the lead (gathers their info), update the engagement with outcome = "Completed" and attach any summary
3. If the caller is new (not in CRM), create the contact first, then log the call under that new contact

The webhooks capability comes into play if you want HubSpot to notify you of changes – for example, if a contact's status is updated manually by an agent later. On free tier, you can:

- Use HubSpot's APIs to poll for updates
- Set up a webhook (HubSpot allows webhooks for certain events via workflows in paid tiers, but a Private App can subscribe to contact creation events even on free)

However, initially you might not need HubSpot to call you – instead, your system will push data into HubSpot after each interaction.

#### Scheduling Appointments

There are a few ways to handle scheduling:

1. **HubSpot Meetings Feature** (Paid Sales Hub):
   - Provides a scheduling link
   - Can create calendar events for meetings booked
   - Meetings API can log meeting details but doesn't send calendar invites

2. **External Calendar Integration**:
   - Use Google Calendar API or Outlook API to create an event and invite both parties
   - Create a Meeting engagement in HubSpot to record the appointment
   - Better for free tier where HubSpot's native scheduling isn't available

A practical flow:

1. AI proposes a time
2. User accepts
3. Assistant then:
   a. Creates a Meeting engagement via API (so it's noted in HubSpot that a meeting is scheduled)
   b. Uses a calendar API or email to send an invite to the user and agent

#### Implementation Steps

1. **API Access**
   - Create a Private App in HubSpot to get an API token
   - This token will be used for all API calls (contacts, engagements, etc.)

2. **Contacts**
   - Use the HubSpot Contacts API to create or update a contact whenever a new lead is identified
   - Minimum info: name and phone, and email if available
   - This ensures every caller becomes a CRM lead

3. **Calls**
   - After each call, use the Calls Engagements API to log the call
   - Include fields like:
     - hs_call_body (for notes or transcription summary)
     - hs_call_status (completed or in progress)
     - hs_call_outcome (e.g. "Connected" or "Left voicemail")

4. **Notes**
   - Log a Note engagement with a detailed summary of the conversation
   - Include the AI's qualification info

5. **Meetings**
   - Create a Meeting engagement when scheduling
   - Set meeting start time, end time, and title
   - This will show up in the contact's timeline
   - On paid tiers, if using HubSpot's meeting scheduler, you could integrate more directly

6. **Testing**
   - Test the integration thoroughly by simulating calls
   - Check the HubSpot contact's timeline
   - Ensure duplicate contacts aren't created
   - Verify all relevant info is captured in contact properties or call notes

### 5. Agentic Workflow Feasibility

Using an "agentic" workflow library like LangChain can be beneficial if your AI assistant needs to perform complex sequences or tool use beyond what VAPI provides. LangChain excels at orchestrating language model "agents" that can call functions/tools (like web searches, calculators, external APIs) in response to user requests.

#### Benefits

In the context of your voice assistant, an agentic workflow might be helpful for tasks such as:

- Dynamically querying a real estate database
- Sending an email
- Updating a record based on conversation
- Essentially, allowing the AI to take actions

However, since VAPI already offers a structured way to integrate knowledge bases and even define tools (like the transferCall function for call forwarding), you might not need a full agent framework initially. VAPI is somewhat opinionated in how the AI flows work.

#### Integration Options

If you find VAPI's capabilities limiting, you could incorporate LangChain on your backend to extend functionality. For example, if the user asks a very specific question that requires an external API call (say, fetching live mortgage rates or performing a custom calculation), a LangChain agent could:

1. Intercept that query
2. Use a tool to get the answer
3. Provide it to VAPI's response

#### LangChain Benefits

- Provides a high-level interface for building advanced AI logic
- Integrates with OpenAI's Realtime (streaming) API and function calling
- Has example ReAct voice agent that uses OpenAI Realtime API to speak with user and call tools
- Supports creating voice agents that can call "search listings" or "schedule meeting" functions on the fly

#### Drawbacks

- Introducing LangChain means hosting more logic yourself (instead of fully relying on VAPI's managed service)
- Adds complexity – you'd have to manage conversation state and integrate with audio streams
- If VAPI handles your main use cases (dialog, knowledge retrieval, call control), you might not need an agent

That said, LangChain could run alongside VAPI: for instance, your webhook server (that receives transcriptions or events) could route certain intents to a LangChain agent.

#### Documentation Resources

LangChain's documentation is actively maintained. The library supports:

- Tools and agents including OpenAI's function-calling
- Retrieval mechanisms
- OpenAI Assistants API interface
- Custom tool creation and integration
- Voice agent implementations

Check out:

- Official LangChain documentation for agents
- Sections on tools and agents
- OpenAI Realtime voice agent example in the LangChain community

### 6. Full Development Workflow

Building this AI assistant involves several components working together. Here's a step-by-step guide from environment setup to deployment, covering core features:

#### Step 1: Environment Setup

##### Tools & Accounts

Set up accounts for all services:

- VAPI (voice AI platform)
- Twilio (telephony/SMS provider)
- OpenAI (for the language model if using directly or via VAPI)
- HubSpot (CRM)
Obtain API keys for each. For development, also install ngrok for tunneling webhooks.

##### Development Environment

Choose a tech stack you're comfortable with. A common choice is:

- Node.js server (using Express) or
- Python server (Flask/FastAPI)
to handle webhooks and integrate APIs.

Ensure you have the necessary SDKs:

- Twilio's SDK
- HubSpot's SDK or HTTP client
- VAPI SDK or HTTP calls
Initialize a project repository and manage your secrets (API keys) securely (possibly using environment variables or a .env file).

##### Voice AI Setup

In the VAPI dashboard:

1. Create an Assistant (configure its voice, language model, etc.)
2. Set up a Phone Number (either provided by VAPI or your Twilio number imported)
3. Link the assistant to the number for inbound calls
4. Configure VAPI with your Twilio credentials if needed
5. Note your Assistant ID and Number ID for API calls

#### Step 2: Connect Telephony & Webhooks

##### Twilio Number Setup

If using a Twilio phone number instead of VAPI's:

1. Set up the Voice webhook in Twilio Console to point to your server or VAPI
2. Configure the Twilio number's Voice URL to your server's /inbound_call endpoint
3. In development:
   - Run ngrok http 3000 (or appropriate port)
   - Put the ngrok URL in Twilio to reach your local server

##### Webhook Endpoints

Implement backend endpoints for key events:

- /inbound_call to handle incoming calls
- /status_callback for Twilio call status updates
- Endpoints for SMS (if using SMS for follow-ups)
- VAPI Server URL endpoint if needed

##### Media Streams

If not using VAPI's built-in call handling:

1. Use Twilio Media Streams to pipe audio to OpenAI
2. Upgrade webhook to WebSocket
3. Handle audio streaming:
   - Twilio sends audio to your server
   - Stream to OpenAI
   - Get realtime transcripts and responses
   - Play audio back
Note: This is complex; VAPI abstracts this away

#### Step 3: NLP and Voice Assistant Logic

##### VAPI Assistant Configuration

1. Define assistant's behavior
2. Upload knowledge base files
3. Set system prompts or conversation flow
4. Configure greeting and ensure knowledge base access
5. Set up Workflows or Blocks if needed
6. Test responses using VAPI's Voice AI Testing console

##### Custom Logic via Tools

If using VAPI's Tools feature:

1. Add functions like transferCall
2. Create Server Tools for external API calls
3. Implement backend logic
4. Define tool permissions
5. Integrate LangChain agent if used

#### Step 4: CRM Data Syncing

##### Contact Creation

1. Develop caller identification routine
2. Check HubSpot for existing contacts
3. Create new contacts as needed
4. Capture conversation details
5. Store contact properties

##### Logging Call Engagement

1. Use HubSpot's Engagement API
2. Log call outcomes and duration
3. Include conversation summaries
4. Attach recordings or transcripts
5. Update contact timeline

##### Automation Triggers

1. Configure HubSpot workflows
2. Set up agent notifications
3. Handle status updates
4. Manage follow-up tasks

#### Step 5: Real-Time Voice Handling

##### Latency Optimization

1. Use VAPI's streaming capabilities
2. Optimize backend processing
3. Monitor response times
4. Adjust for network conditions

##### Interruption Handling

1. Configure barge-in settings
2. Handle concurrent audio
3. Manage conversation flow
4. Ensure smooth transitions

##### Voice Quality

1. Select appropriate TTS voice
2. Test for clarity and naturalness
3. Configure speech recognition
4. Monitor audio quality

#### Step 6: Multi-Modal Communication

##### Voice Calls

(Already covered in previous sections)

##### SMS Follow-ups

1. Integrate Twilio Programmable SMS
2. Implement post-call messaging
3. Send property links and summaries
4. Get consent for messaging
5. Track message delivery

##### Email Integration

Options:

1. HubSpot email capabilities
2. External service (SendGrid)
3. SMTP service
4. Calendar invites

Implementation:

1. Set up email templates
2. Configure sending service
3. Handle bounces and tracking
4. Log email engagements

##### Channel Coordination

Ensure all channels work together:

1. Consistent messaging across channels
2. Proper timing of communications
3. Contact preference management
4. Activity logging in CRM

#### Step 7: Integration with Scheduling Systems

##### Calendar API Integration

1. Choose calendar service:
   - Google Calendar
   - Outlook
   - Calendly
   - HubSpot Meetings

2. Implementation:
   - OAuth setup
   - Availability checking
   - Event creation
   - Invitation sending

##### Meeting Management

1. Appointment creation
2. Confirmation handling
3. Reminder system
4. Rescheduling process

#### Step 8: Testing & Iteration

##### Component Testing

1. Test each integration:
   - Call flow
   - CRM logging
   - SMS/Email
   - Knowledge base Q&A

2. User testing:
   - Trial calls
   - Feedback collection
   - Voice/tone adjustment
   - Content refinement

##### Edge Cases

Test scenarios like:

- Off-topic questions
- Declined information
- System failures
- Recovery processes

#### Step 9: Deployment

##### Infrastructure

1. Choose hosting platform:
   - AWS
   - Heroku
   - Others

2. Setup:
   - Container configuration
   - Environment variables
   - API key management
   - SSL certificates

##### Scaling

1. Consider concurrent calls
2. Handle multiple streams
3. Optimize API usage
4. Use async processing

##### Security

1. Secure webhooks
2. Protect API keys
3. Encrypt sensitive data
4. Implement access controls

##### Monitoring

1. Set up logging
2. Track call metrics
3. Monitor API usage
4. Alert on errors

#### Step 10: Technologies & Frameworks

##### Voice and Telephony

- VAPI for voice AI core
- Twilio for telephony and SMS
- Audio processing libraries
- Speech recognition tools

##### Backend

- Node.js/Express or Python/Flask
- API integration libraries
- WebSocket handling
- State management

##### Asynchronous Tasks

- Task queues (Celery/Bull)
- Background jobs
- Event processing
- Webhook handling

##### Database (Optional)

- PostgreSQL/MongoDB
- Transcript storage
- Analytics data
- Configuration management

##### Frontend (Future)

- Dashboard for transcripts
- Configuration interface
- Analytics display
- User management

##### Multi-tenancy

Design considerations:

1. Separate knowledge bases
2. Multiple assistants
3. Client isolation
4. Resource management

Implementation:

1. Token management
2. Data separation
3. Access control
4. Usage tracking

### Security Considerations

#### Endpoint Security

1. Webhook validation
2. Rate limiting
3. Authentication
4. Input validation

#### API Management

1. Key rotation
2. Access logging
3. Usage monitoring
4. Error handling

#### Data Privacy

1. PII handling
2. Data encryption
3. Retention policies
4. Access controls

#### Monitoring

1. Activity logging
2. Error tracking
3. Usage analytics
4. Performance metrics

### Maintenance

#### Knowledge Base

1. Regular updates
2. Content verification
3. Performance monitoring
4. Coverage testing

#### API Usage

1. Rate limit monitoring
2. Cost optimization
3. Usage patterns
4. Efficiency improvements

#### Performance

1. Response time tracking
2. Resource utilization
3. Scaling adjustments
4. Optimization opportunities

#### Documentation

1. API updates
2. Integration guides
3. Troubleshooting guides
4. Best practices

#### Client Support

1. Onboarding process
2. Training materials
3. Support procedures
4. Feedback collection
