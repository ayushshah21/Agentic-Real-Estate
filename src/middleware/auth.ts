import { Request, Response, NextFunction } from 'express';

export const validateVapiSecret = (req: Request, res: Response, next: NextFunction) => {
    // TEMPORARY DEBUG MODE - Skip all auth checks
    console.log('⚠️ DEBUG MODE: Auth check temporarily disabled for all requests');
    console.log('🔍 Request headers:', JSON.stringify({
        'x-vapi-secret': req.headers['x-vapi-secret'] ? 'Present (value hidden)' : 'Missing',
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
    }, null, 2));

    // Proceed without checking token
    return next();

    /* Original validation code (commented out temporarily)
    // Allow testing - temporarily skip auth for test_tool_id
    if (req.body?.message?.toolCalls?.[0]?.id === 'test_tool_id') {
        console.log('⚠️ TEST MODE: Skipping auth check for test_tool_id');
        return next();
    }

    const receivedToken = req.headers['x-vapi-secret'];
    const expectedToken = process.env.VAPI_SECRET_TOKEN;

    if (!expectedToken) {
        console.error('VAPI_SECRET_TOKEN not configured in environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!receivedToken || receivedToken !== expectedToken) {
        return res.status(403).json({ error: 'Invalid or missing Vapi secret token' });
    }

    next();
    */
}; 