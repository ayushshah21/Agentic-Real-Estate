import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { propertyRouter } from './routes/property';
import { hubspotRouter } from './routes/hubspot';
import { validateVapiSecret } from './middleware/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(express.json());

// Create a public route for HubSpot test endpoint
app.use('/api/public/hubspot', hubspotRouter);

// API security middleware - validate VAPI secret token for all VAPI routes
app.use('/api/vapi', validateVapiSecret);

// API Routes
// Property routes for searching properties and scheduling viewings
app.use('/api/vapi/property', propertyRouter);
// HubSpot routes for webhooks and contact synchronization
app.use('/api/vapi/hubspot', hubspotRouter);

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Global error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

/**
 * Starts the Express server on the configured port
 */
export const startServer = () => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

export default app; 