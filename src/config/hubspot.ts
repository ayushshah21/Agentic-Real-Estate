import { Client } from '@hubspot/api-client';
import dotenv from 'dotenv';

dotenv.config();

// Types
interface ContactData {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    propertyInterest?: string;
}

interface CallData {
    notes?: string;
    status?: string;
    duration?: number;
    fromNumber: string;
    toNumber: string;
    recordingUrl?: string;
}

interface MeetingData {
    description?: string;
    startTime: string;
    endTime: string;
    title: string;
}

// Initialize the HubSpot client with retry options
const hubspotClient = new Client({
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
    numberOfApiCallRetries: 3 // Retry API calls on 429s and 5xx errors
});

// Helper function to create or update a contact
async function createOrUpdateContact(contactData: ContactData) {
    try {
        const { email, firstName, lastName, phone } = contactData;

        // Search for existing contact by email
        const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
            filterGroups: [
                {
                    filters: [
                        {
                            propertyName: 'email',
                            operator: 'EQ',
                            value: email,
                        },
                    ],
                },
            ],
            sorts: [],
            properties: ['email', 'firstname', 'lastname', 'phone'],
            limit: 1,
            after: 0
        });

        if (searchResponse.results.length > 0) {
            // Update existing contact
            const contactId = searchResponse.results[0].id;
            await hubspotClient.crm.contacts.basicApi.update(contactId, {
                properties: {
                    firstname: firstName,
                    lastname: lastName,
                    phone: phone,
                },
            });
            return { id: contactId, updated: true };
        } else {
            // Create new contact
            const createResponse = await hubspotClient.crm.contacts.basicApi.create({
                properties: {
                    email: email,
                    firstname: firstName,
                    lastname: lastName,
                    phone: phone,
                },
                associations: []
            });
            return { id: createResponse.id, created: true };
        }
    } catch (error) {
        console.error('Error in createOrUpdateContact:', error);
        throw error;
    }
}

// Helper function to log a call engagement
async function logCallEngagement(contactId: string, callData: CallData) {
    try {
        // Create the timestamp
        const timestamp = new Date().toISOString();

        // Create associations with the contact
        const associations = [{
            to: { id: contactId },
            types: [{
                associationCategory: "HUBSPOT_DEFINED" as any,
                associationTypeId: 1
            }]
        }];

        // Create a call record with the HubSpot CRM Objects API
        await hubspotClient.crm.objects.calls.basicApi.create({
            properties: {
                hs_timestamp: timestamp,
                hs_call_body: callData.notes || "",
                hs_call_status: callData.status || "COMPLETED",
                hs_call_duration: callData.duration?.toString() || "0",
                hs_call_from_number: callData.fromNumber,
                hs_call_to_number: callData.toNumber,
                hs_call_recording_url: callData.recordingUrl || "",
                hs_contact_id: contactId // Link to contact
            },
            associations
        });
    } catch (error) {
        console.error('Error in logCallEngagement:', error);
        throw error;
    }
}

// Helper function to create a meeting engagement
async function createMeetingEngagement(contactId: string, meetingData: MeetingData) {
    try {
        // Create associations with the contact
        const associations = [{
            to: { id: contactId },
            types: [{
                associationCategory: "HUBSPOT_DEFINED" as any,
                associationTypeId: 1
            }]
        }];

        // Create a meeting record with the HubSpot CRM Objects API
        await hubspotClient.crm.objects.meetings.basicApi.create({
            properties: {
                hs_timestamp: new Date().toISOString(),
                hs_meeting_title: meetingData.title,
                hs_meeting_body: meetingData.description || '',
                hs_meeting_start_time: meetingData.startTime,
                hs_meeting_end_time: meetingData.endTime,
                hs_meeting_status: 'SCHEDULED',
                hs_contact_id: contactId // Link to contact
            },
            associations
        });
    } catch (error) {
        console.error('Error in createMeetingEngagement:', error);
        throw error;
    }
}

export {
    hubspotClient,
    createOrUpdateContact,
    logCallEngagement,
    createMeetingEngagement,
    ContactData,
    CallData,
    MeetingData,
}; 