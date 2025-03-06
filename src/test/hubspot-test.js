const {
  hubspotClient,
  createOrUpdateContact,
  logCallEngagement,
} = require("../config/hubspot");

async function testHubSpotConnection() {
  try {
    // Test creating a contact
    const contactResult = await createOrUpdateContact({
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      phone: "+1234567890",
    });
    console.log("Contact created/updated:", contactResult);

    // Test logging a call
    if (contactResult.id) {
      await logCallEngagement(contactResult.id, {
        notes: "Test call from AI Assistant",
        status: "COMPLETED",
        duration: 60000, // 1 minute
        fromNumber: "+1234567890",
        toNumber: "+0987654321",
      });
      console.log("Call engagement logged successfully");
    }

    console.log("HubSpot connection test completed successfully");
  } catch (error) {
    console.error("HubSpot test failed:", error);
  }
}

testHubSpotConnection();
