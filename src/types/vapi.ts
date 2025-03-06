// Base interfaces for Vapi tool requests and responses
export interface VapiToolRequest {
    toolCallId: string;
    parameters: Record<string, any>;
}

export interface VapiToolResponse {
    results: {
        toolCallId: string;
        result: Record<string, any>;
    }[];
}

// Property search interfaces
export interface PropertySearchParams {
    priceRange?: {
        min: number;
        max: number;
    };
    bedrooms?: number;
    location?: string;
    propertyType?: string;
}

export interface PropertySearchResponse {
    success: boolean;
    properties: Array<{
        id: string;
        address: string;
        price: number;
        bedrooms: number;
        propertyType: string;
        description: string;
    }>;
}

// Viewing scheduling interfaces
export interface ViewingScheduleParams {
    propertyId: string;
    datetime: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
}

export interface ViewingScheduleResponse {
    success: boolean;
    message: string;
    details: {
        confirmationNumber: string;
        scheduledTime: string;
        propertyDetails: {
            id: string;
            address: string;
        };
    };
}

// HubSpot contact interfaces
export interface HubSpotContactParams {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    propertyInterest?: string;
}

export interface HubSpotContactResponse {
    success: boolean;
    contactId: string;
    message: string;
} 