import express from 'express';
import { createOrUpdateContact } from '../config/hubspot';

const router = express.Router();

// Public test endpoint that doesn't require the VAPI secret token
// This should be accessible directly without authentication
router.get('/test-connection', async (req, res) => {
    try {
        res.json({
            status: 'success',
            message: 'HubSpot route is accessible',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in test endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Webhooks endpoint for HubSpot notifications
 * 
 * Processes events from HubSpot such as:
 * - Contact creation
 * - Property changes
 * - Deal stage changes
 */
router.post('/webhook', async (req, res) => {
    // Acknowledge receipt first to avoid timeouts
    res.status(200).send('OK');

    try {
        // Process events (could be a single event or an array)
        const events = Array.isArray(req.body) ? req.body : [req.body];

        for (const event of events) {
            console.log(`Received HubSpot webhook event: ${event.subscriptionType}`);

            // Handle different event types
            switch (event.subscriptionType) {
                case 'contact.creation':
                    console.log(`New contact created in HubSpot with ID ${event.objectId}`);
                    break;

                case 'contact.propertyChange':
                    console.log(`Contact ${event.objectId} property ${event.propertyName} changed to ${event.propertyValue}`);
                    break;

                case 'deal.propertyChange':
                    if (event.propertyName === 'dealstage') {
                        console.log(`Deal ${event.objectId} moved to stage ${event.propertyValue}`);
                    }
                    break;

                default:
                    console.log(`Unhandled event type: ${event.subscriptionType}`);
            }
        }
    } catch (error) {
        console.error('Error processing HubSpot webhook:', error);
        // We already sent 200 OK to HubSpot, so we just log the error here
    }
});

/**
 * Endpoint to sync a contact from an external system to HubSpot
 * 
 * Creates or updates a contact in HubSpot CRM
 */
router.post('/sync-contact', async (req, res) => {
    try {
        console.log('🔍 CONTACT SYNC REQUEST RECEIVED');

        // Check authorization
        const vapiSecret = req.headers['x-vapi-secret'];
        const expectedSecret = process.env.VAPI_SECRET_TOKEN;
        console.log('🔐 Auth check:', {
            vapiSecretPresent: !!vapiSecret,
            expectedSecretPresent: !!expectedSecret,
            authorized: vapiSecret === expectedSecret
        });

        console.log('📝 Headers:', JSON.stringify({
            'content-type': req.headers['content-type'],
            'x-vapi-secret': req.headers['x-vapi-secret'] ? 'Present (hidden value)' : 'Missing',
            'user-agent': req.headers['user-agent']
        }));
        console.log('📦 Received contact sync request:', JSON.stringify(req.body, null, 2));

        // Extract parameters from VAPI's nested structure
        let toolCallId;
        let contactParams;

        console.log('Step 1: Extracting parameters');
        // Handle different possible request formats
        if (req.body.message && req.body.message.toolCalls && req.body.message.toolCalls.length > 0) {
            console.log('Step 1a: Processing VAPI nested format');
            // New VAPI format
            const toolCall = req.body.message.toolCalls[0];
            toolCallId = toolCall.id;
            const args = toolCall.function.arguments;

            try {
                // If arguments is a string (JSON), parse it
                if (typeof args === 'string') {
                    console.log('Step 1a-1: Parsing string arguments:', args);
                    contactParams = JSON.parse(args);
                } else {
                    console.log('Step 1a-2: Using object arguments:', JSON.stringify(args, null, 2));
                    contactParams = args;
                }
            } catch (error) {
                console.error('❌ Error parsing arguments:', error);
                contactParams = args;
            }
        } else if (req.body.parameters && req.body.toolCallId) {
            console.log('Step 1b: Processing original format');
            // Original format
            toolCallId = req.body.toolCallId;
            contactParams = req.body.parameters;
        } else {
            console.log('Step 1c: Processing direct parameters format');
            // Direct parameters
            toolCallId = req.body.toolCallId || 'unknown';
            contactParams = {
                email: req.body.email,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                phone: req.body.phone,
                propertyInterest: req.body.propertyInterest
            };
        }

        if (!toolCallId) {
            console.error('❌ Missing toolCallId in request');
            return res.status(400).json({ error: 'Missing toolCallId in request' });
        }

        console.log('Step 2: Extracted contact parameters:', JSON.stringify(contactParams, null, 2));

        if (!contactParams.email) {
            console.error('❌ Missing required email parameter');
            return res.status(400).json({
                results: [{
                    toolCallId,
                    result: {
                        success: false,
                        error: 'Email is required'
                    }
                }]
            });
        }

        console.log('Step 3: Calling HubSpot service');
        const result = await createOrUpdateContact({
            email: contactParams.email,
            firstName: contactParams.firstName || '',
            lastName: contactParams.lastName || '',
            phone: contactParams.phone || '',
            propertyInterest: contactParams.propertyInterest || ''
        });

        console.log('Step 4: Contact sync result:', JSON.stringify(result, null, 2));

        // Return in the format VAPI expects
        console.log('Step 5: Formatting response for VAPI');
        const response = {
            results: [{
                toolCallId,
                result: {
                    success: true,
                    contactId: result.id,
                    message: result.created ? 'Contact created successfully' : 'Contact updated successfully'
                }
            }]
        };

        console.log('Step 6: Sending successful response:', JSON.stringify(response, null, 2));
        res.json(response);
    } catch (error) {
        console.error('❌ Error syncing contact to HubSpot:', error);
        res.status(500).json({
            results: [{
                toolCallId: req.body.toolCallId || 'unknown',
                result: {
                    success: false,
                    error: 'Failed to sync contact with HubSpot',
                    details: error instanceof Error ? error.message : 'Unknown error'
                }
            }]
        });
    }
});

export const hubspotRouter = router; 