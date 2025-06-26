// Simulating the extraction of trigger_id from an incoming interaction
// This needs to be adapted based on your actual data structure
const triggerId = items[0].json.trigger_id; // Adjust according to your data

// Dynamically generate brand options based on provided input
const brandOptions = items.map(item => ({
    text: {
        type: "plain_text",
        text: item.json.brandNames // Adjust according to your actual data structure
    },
    value: item.json.brandNames // Use the brand name as the value
}));

// Define the modal view with all necessary blocks
const view = {
    type: "modal",
    callback_id: "catalog",
    title: {
        type: "plain_text",
        text: "Request a Catalog"
    },
    submit: {
        type: "plain_text",
        text: "Submit"
    },
    blocks: [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "*Instructions:*\n1. Use the <Product Set Generator URL> then export a CSV 🏷️\n2. Choose an option from the <Catalog Ad Menu URL> 💡\n3. Your selection will appear in <Creative Sprint Planning URL> 🏃"
            }
        },
        // Include the brand selection block and other input blocks as specified before
    ]
};

// Construct the payload to send to Slack's API, ensuring `trigger_id` is included
const payload = {
    trigger_id: triggerId,
    view: JSON.stringify(view)
};

// Return the constructed payload
return [{ json: payload }];
