// Test script for HubSpot API integration
require("dotenv").config();
const { Client } = require("@hubspot/api-client");

async function testHubSpotConnection() {
  try {
    // Initialize client
    const hubspotClient = new Client({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
      numberOfApiCallRetries: 3,
    });

    console.log("Attempting to connect to HubSpot...");

    // Fetch contacts as a simple test
    const contactsResponse = await hubspotClient.crm.contacts.basicApi.getPage(
      10
    );
    console.log("✅ Successfully connected to HubSpot API!");
    console.log(`Found ${contactsResponse.results.length} contacts`);

    // Create a test contact
    const testEmail = `test_${Date.now()}@example.com`;
    console.log(`Creating test contact with email: ${testEmail}`);

    const contactResponse = await hubspotClient.crm.contacts.basicApi.create({
      properties: {
        email: testEmail,
        firstname: "Test",
        lastname: "Script",
        phone: "555-123-4567",
      },
      associations: [],
    });

    console.log("✅ Successfully created contact!");
    console.log(`Contact ID: ${contactResponse.id}`);

    return {
      success: true,
      message: "All HubSpot tests passed",
      contactId: contactResponse.id,
    };
  } catch (error) {
    console.error("❌ Error testing HubSpot connection:");
    console.error(error.message);
    if (error.response) {
      console.error(
        "Error details:",
        JSON.stringify(error.response.body, null, 2)
      );
    }
    return {
      success: false,
      message: error.message,
    };
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testHubSpotConnection()
    .then((result) => {
      if (result.success) {
        console.log("✨ All tests completed successfully!");
      } else {
        console.log("❌ Tests failed.");
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Unexpected error:", err);
      process.exit(1);
    });
}

module.exports = { testHubSpotConnection };
