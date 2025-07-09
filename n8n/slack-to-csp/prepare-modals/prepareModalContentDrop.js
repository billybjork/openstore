const triggerId = items[0].json.trigger_id;

// Check if the 'brands' array is present and correctly structured before mapping
let brandOptions = [];
if (items[0] && items[0].json && items[0].json.brands) {
    brandOptions = items[0].json.brands.map(brand => ({
        text: {
            type: "plain_text",
            text: brand
        },
        value: brand
    }));
} else {
    // Log error or handle the case where brands are not available
    console.log("Brands data is missing or incorrectly structured");
}

let blocks = [];

blocks.push({
    type: "section",
    text: {
        type: "mrkdwn",
            text: ":arrow_right: This form will input your request into <https://docs.google.com/spreadsheets/d/.../edit | Content Delivery>, then the content will be shared through #content-drops upon completion."
    }
});

// Brand dropdown
blocks.push({
    type: "input",
    block_id: "brand_input",
    element: {
        type: "static_select",
        placeholder: {
            type: "plain_text",
            text: "Select a brand"
        },
        options: brandOptions
    },
    label: {
        type: "plain_text",
        text: "💼 Brand",
        emoji: true
    }
});

// Asset Link text box
blocks.push({
    type: "input",
    block_id: "asset_link_input",
    element: {
        type: "plain_text_input",
        placeholder: {
            type: "plain_text",
            text: "Either external link or lucid/_INTERNAL/__INGEST"
        }
    },
    label: {
        type: "plain_text",
        text: "🔗 Asset Link",
        emoji: true
    }
});

// Creator text box
blocks.push({
    type: "input",
    block_id: "creator_input",
    element: {
        type: "plain_text_input",
        placeholder: {
            type: "plain_text",
            text: "Ex. Internal, Cohley, Trend, etc."
        }
    },
    label: {
        type: "plain_text",
        text: "👤 Creator",
        emoji: true
    },
    optional: true
});

// Date picker block without default date
blocks.push({
    type: "input",
    block_id: "rights_termination_input",
    element: {
        type: "datepicker",
        placeholder: {
            type: "plain_text",
            text: "Select a date (if applicable)"
        }
    },
    label: {
        type: "plain_text",
        text: "❌ Usage Rights Termination",
        emoji: true
    },
    optional: true
});

// Define the modal view with all necessary blocks
const view = {
    type: "modal",
    callback_id: "submit-assets",
    title: {
        type: "plain_text",
        text: "Submit Assets"
    },
    submit: {
        type: "plain_text",
        text: "Submit"
    },
    blocks: blocks
};

// Construct the payload to send to Slack's API, ensuring `trigger_id` is included
const payload = {
    trigger_id: triggerId,
    view: JSON.stringify(view)
};

// Return the constructed payload
return [{ json: payload }];
