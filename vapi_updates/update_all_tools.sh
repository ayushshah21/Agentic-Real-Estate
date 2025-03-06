#!/bin/bash

# Load environment variables if .env file exists
if [ -f ../.env ]; then
    source ../.env
fi

# Ensure required environment variables are set
if [ -z "$VAPI_PRIVATE_KEY" ]; then
    echo "Error: VAPI_PRIVATE_KEY environment variable is not set"
    exit 1
fi

# Tool IDs should be configured in .env
if [ -z "$SCHEDULE_VIEWING_ID" ] || [ -z "$SEARCH_PROPERTIES_ID" ] || [ -z "$CREATE_CONTACT_ID" ]; then
    echo "Error: Tool IDs must be set in environment variables"
    exit 1
fi

# Update searchProperties tool
echo "Updating searchProperties tool..."
curl -X PATCH "https://api.vapi.ai/tool/$SEARCH_PROPERTIES_ID" \
  -H "Authorization: Bearer $VAPI_PRIVATE_KEY" \
  -H "Content-Type: application/json" \
  -d @fixed_search_properties.json

echo -e "\n\n"

# Update createContact tool
echo "Updating createContact tool..."
curl -X PATCH "https://api.vapi.ai/tool/$CREATE_CONTACT_ID" \
  -H "Authorization: Bearer $VAPI_PRIVATE_KEY" \
  -H "Content-Type: application/json" \
  -d @fixed_create_contact.json

echo -e "\n\nAll tools updated!" 