import { PropertySearchParams, PropertySearchResponse, ViewingScheduleParams, ViewingScheduleResponse } from '../types/vapi';
import { createOrUpdateContact } from '../config/hubspot';

// Mock database for demo purposes
const mockProperties = [
    {
        id: 'prop1',
        address: '123 Main St, San Francisco, CA',
        price: 1200000,
        bedrooms: 3,
        propertyType: 'Single Family Home',
        description: 'Beautiful home in prime location'
    },
    {
        id: 'prop2',
        address: '456 Market St, San Francisco, CA',
        price: 800000,
        bedrooms: 2,
        propertyType: 'Condo',
        description: 'Modern condo with city views'
    },
    // Adding Austin properties to help with testing
    {
        id: 'prop3',
        address: '789 Congress Ave, Austin, Texas',
        price: 950000,
        bedrooms: 3,
        propertyType: 'Single Family Home',
        description: 'Spacious family home close to downtown Austin'
    },
    {
        id: 'prop4',
        address: '101 Barton Springs Rd, Austin, Texas',
        price: 750000,
        bedrooms: 3,
        propertyType: 'Townhouse',
        description: 'Modern townhome with access to Barton Springs'
    },
    {
        id: 'prop5',
        address: '222 East 6th St, Austin, Texas',
        price: 650000,
        bedrooms: 2,
        propertyType: 'Condo',
        description: 'Downtown condo in the heart of the entertainment district'
    }
];

export async function searchProperties(params: PropertySearchParams): Promise<PropertySearchResponse> {
    // Safety check - if params is undefined, use an empty object
    params = params || {};

    console.log('Searching with params:', JSON.stringify(params, null, 2));

    // In a real implementation, this would query your database
    let filteredProperties = [...mockProperties];

    if (params.priceRange && params.priceRange.min !== undefined && params.priceRange.max !== undefined) {
        filteredProperties = filteredProperties.filter(
            prop => prop.price >= params.priceRange!.min && prop.price <= params.priceRange!.max
        );
    } else if (params.priceRange && params.priceRange.max !== undefined) {
        // Handle case where only max is provided
        filteredProperties = filteredProperties.filter(
            prop => prop.price <= params.priceRange!.max
        );
    }

    if (params.bedrooms) {
        filteredProperties = filteredProperties.filter(
            prop => prop.bedrooms === params.bedrooms
        );
    }

    if (params.propertyType) {
        filteredProperties = filteredProperties.filter(
            prop => prop.propertyType.toLowerCase() === params.propertyType!.toLowerCase()
        );
    }

    if (params.location) {
        // Simple substring match for location
        const locationLower = params.location.toLowerCase();
        filteredProperties = filteredProperties.filter(
            prop => prop.address.toLowerCase().includes(locationLower)
        );
    }

    return {
        success: true,
        properties: filteredProperties
    };
}

export async function scheduleViewing(params: ViewingScheduleParams): Promise<ViewingScheduleResponse> {
    console.log('🔧 SCHEDULE VIEWING SERVICE CALLED');
    console.log('📋 Params received:', JSON.stringify(params, null, 2));

    // Input validation
    if (!params) {
        console.error('❌ No parameters provided');
        throw new Error('No parameters provided');
    }

    if (!params.propertyId) {
        console.error('❌ Missing required field: propertyId');
        throw new Error('Property ID is required');
    }

    if (!params.datetime) {
        console.error('❌ Missing required field: datetime');
        throw new Error('Datetime is required');
    }

    if (!params.clientName) {
        console.error('❌ Missing required field: clientName');
        throw new Error('Client name is required');
    }

    if (!params.clientPhone) {
        console.error('❌ Missing required field: clientPhone');
        throw new Error('Client phone is required');
    }

    console.log('✅ All required fields are present');

    // In a real implementation, this would:
    // 1. Check property availability
    // 2. Create viewing in your database
    // 3. Create/update contact in HubSpot
    // 4. Create calendar event
    // 5. Send confirmation emails

    console.log('🏠 Looking for property with ID:', params.propertyId);
    const property = mockProperties.find(p => p.id === params.propertyId);

    if (!property) {
        console.error('❌ Property not found with ID:', params.propertyId);
        console.log('📜 Available properties:', mockProperties.map(p => p.id).join(', '));
        throw new Error(`Property not found with ID: ${params.propertyId}`);
    }

    console.log('✅ Found property:', property.address);

    // Validate datetime format
    let parsedDate;
    try {
        console.log('🕒 Validating datetime:', params.datetime);
        parsedDate = new Date(params.datetime);

        if (isNaN(parsedDate.getTime())) {
            console.error('❌ Invalid date (NaN after parsing)');
            throw new Error('Invalid date');
        }

        // Convert to ISO for consistent format
        const isoDate = parsedDate.toISOString();
        console.log('✅ Valid date parsed:', isoDate);

        // For demo purposes, reject if date is in the past
        const now = new Date();
        if (parsedDate < now) {
            console.error('❌ Date is in the past:', isoDate);
            throw new Error('Cannot schedule a viewing in the past. Please select a future date and time.');
        }

        // For demo purposes, reject if time is outside business hours (9 AM to 5 PM)
        const hours = parsedDate.getHours();
        if (hours < 9 || hours >= 17) {
            console.error('❌ Time outside business hours:', hours);
            throw new Error('Viewings can only be scheduled between 9 AM and 5 PM.');
        }

    } catch (error) {
        console.error('❌ Date validation error:', error);
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error(`Invalid datetime format: ${params.datetime}. Please use ISO format YYYY-MM-DDTHH:MM:SS`);
        }
    }

    // Generate a confirmation number
    const confirmationNumber = `VIEW-${Date.now().toString().slice(-6)}`;
    console.log('🔢 Generated confirmation number:', confirmationNumber);

    // Create or update contact in HubSpot
    try {
        console.log('👤 Attempting to create/update contact in HubSpot');
        if (params.clientEmail) {
            // Only attempt to create contact if we have an email
            await createOrUpdateContact({
                email: params.clientEmail,
                firstName: params.clientName.split(' ')[0],
                lastName: params.clientName.split(' ')[1] || '',
                phone: params.clientPhone,
                propertyInterest: property.address
            });
            console.log('✅ Contact updated in HubSpot');
        } else {
            console.log('⚠️ No email provided, skipping HubSpot contact creation');
        }
    } catch (error) {
        console.error('❌ Error updating HubSpot contact:', error);
        // Continue with viewing scheduling even if HubSpot update fails
    }

    // In a real implementation, this would save the appointment to a database
    console.log(`✅ Scheduling confirmed for ${params.propertyId} at ${params.datetime} for ${params.clientName}`);

    // Prepare the success response
    const response = {
        success: true,
        message: 'Viewing scheduled successfully',
        details: {
            confirmationNumber,
            scheduledTime: params.datetime,
            propertyDetails: {
                id: property.id,
                address: property.address
            }
        }
    };

    console.log('📤 Returning response:', JSON.stringify(response, null, 2));
    return response;
} 