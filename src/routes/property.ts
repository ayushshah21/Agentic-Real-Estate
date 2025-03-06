import express from 'express';
import { VapiToolRequest, PropertySearchParams, ViewingScheduleParams } from '../types/vapi';
import { searchProperties, scheduleViewing } from '../services/property';

const router = express.Router();

/**
 * Search for properties based on provided criteria
 * 
 * Handles requests from VAPI to search for properties with filters such as:
 * - Price range
 * - Number of bedrooms
 * - Property type
 * - Location
 */
router.post('/search', async (req: express.Request, res: express.Response) => {
    try {
        console.log('🔎 SEARCH REQUEST RECEIVED 🔎');
        console.log('🔑 Headers:', JSON.stringify({
            'authorization': req.headers['authorization'] ? 'Present (hidden)' : 'Missing',
            'x-vapi-secret': req.headers['x-vapi-secret'] ? 'Present (hidden)' : 'Missing',
            'content-type': req.headers['content-type']
        }, null, 2));

        console.log('📦 Raw Request Body:', JSON.stringify(req.body, null, 2));

        // Extract parameters from VAPI's nested structure
        let toolCallId: string;
        let searchParams: PropertySearchParams = {};

        // Handle different possible request formats
        if (req.body.message && req.body.message.toolCalls && req.body.message.toolCalls.length > 0) {
            // New VAPI format
            const toolCall = req.body.message.toolCalls[0];
            toolCallId = toolCall.id;
            const args = toolCall.function.arguments;

            // Extract search parameters
            searchParams = {
                bedrooms: args.bedrooms,
                location: args.location,
                propertyType: args.propertyType
            };

            // Handle price range with proper formatting
            if (args.priceRange) {
                searchParams.priceRange = {
                    min: args.priceRange.Min ? Number(args.priceRange.Min) : 0,
                    max: args.priceRange.Max ? Number(args.priceRange.Max) : 10000000 // Default high max
                };
            }

        } else if (req.body.toolCallId && req.body.parameters) {
            // Simple format (as we originally expected)
            toolCallId = req.body.toolCallId;
            searchParams = req.body.parameters;
        } else {
            console.error('Unrecognized request format');
            return res.status(400).json({
                error: 'Invalid request format'
            });
        }

        if (!toolCallId) {
            console.error('Missing toolCallId in request');
            return res.status(400).json({
                error: 'Missing toolCallId in request'
            });
        }

        console.log('Extracted parameters:', JSON.stringify(searchParams, null, 2));

        const properties = await searchProperties(searchParams);
        console.log('Search results:', JSON.stringify(properties, null, 2));

        res.json({
            results: [{
                toolCallId,
                result: {
                    success: true,
                    properties: properties.properties
                }
            }]
        });
    } catch (error) {
        console.error('Error searching properties:', error);
        // Return a properly formatted error response for VAPI
        const toolCallId = req.body?.message?.toolCalls?.[0]?.id || req.body?.toolCallId;
        res.status(500).json({
            results: [{
                toolCallId,
                result: {
                    success: false,
                    error: 'Failed to search properties',
                    message: error instanceof Error ? error.message : 'Unknown error'
                }
            }]
        });
    }
});

/**
 * Schedule a property viewing
 * 
 * This endpoint:
 * 1. Receives property ID and viewing details
 * 2. Checks property availability
 * 3. Generate a confirmation number
 * 4. Return viewing details
 */
router.post('/schedule-viewing', async (req: express.Request, res: express.Response) => {
    console.log('🔍 SCHEDULE VIEWING REQUEST RECEIVED');

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
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    try {
        console.log('Step 1: Extracting parameters');
        // Extract parameters from VAPI's nested structure
        let toolCallId;
        let viewingParams: ViewingScheduleParams;

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
                    viewingParams = JSON.parse(args);
                } else {
                    console.log('Step 1a-2: Using object arguments:', JSON.stringify(args, null, 2));
                    viewingParams = args;
                }
            } catch (error) {
                console.error('❌ Error parsing arguments:', error);
                viewingParams = args as unknown as ViewingScheduleParams;
            }
        } else if (req.body.parameters && req.body.toolCallId) {
            console.log('Step 1b: Processing original format');
            // Original format
            toolCallId = req.body.toolCallId;
            viewingParams = req.body.parameters as ViewingScheduleParams;
        } else {
            console.log('Step 1c: Processing direct parameters format');
            // Direct parameters - fallback
            toolCallId = req.body.toolCallId || 'unknown';
            viewingParams = req.body as unknown as ViewingScheduleParams;
        }

        if (!toolCallId) {
            console.error('❌ Missing toolCallId in request');
            return res.status(400).json({ error: 'Missing toolCallId in request' });
        }

        console.log('Step 2: Scheduling viewing with params:', JSON.stringify(viewingParams, null, 2));
        console.log('Step 3: Calling scheduleViewing function');

        try {
            const result = await scheduleViewing(viewingParams);
            console.log('Step 4: Viewing scheduled successfully:', JSON.stringify(result, null, 2));

            // Return in the format VAPI expects
            console.log('Step 5: Formatting response for VAPI');
            const response = {
                results: [{
                    toolCallId,
                    result
                }]
            };

            console.log('Step 6: Sending successful response:', JSON.stringify(response, null, 2));
            res.json(response);
        } catch (schedulingError) {
            console.error('❌ Error during scheduling:', schedulingError);
            res.status(500).json({
                results: [{
                    toolCallId,
                    result: {
                        success: false,
                        message: 'Failed to schedule viewing',
                        error: schedulingError instanceof Error ? schedulingError.message : 'Unknown error'
                    }
                }]
            });
        }
    } catch (outerError) {
        console.error('❌ Outer error in viewing endpoint:', outerError);
        res.status(500).json({
            results: [{
                toolCallId: req.body.toolCallId || 'unknown',
                result: {
                    success: false,
                    message: 'Failed to schedule viewing due to server error',
                    error: outerError instanceof Error ? outerError.message : 'Unknown error'
                }
            }]
        });
    }
});

export const propertyRouter = router; 