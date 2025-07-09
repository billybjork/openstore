// Extracting trigger_id, messageURL, and messageContent from the output
const triggerId = items[0].json.trigger_id;  // Assuming the trigger_id is directly under the first item
const messageURL = items[0].json.messageURL;  // Extract messageURL
const messageContent = items[0].json.messageContent;  // Extract messageContent

// Check if the 'brands' array is present and correctly structured before mapping
let brandOptions = [];
if (items[0] && items[0].json && items[0].json.brands) {
    brandOptions = items[0].json.brands.map(brand => ({
        text: {
            type: "plain_text",
            text: brand // Each brand is a string, directly use it
        },
        value: brand // Use the brand name as the value
    }));
} else {
    // Log error or handle the case where brands are not available
    console.log("Brands data is missing or incorrectly structured");
}

// Define task type options
const taskTypeOptions = [
    { text: { type: "plain_text", text: "Bug Fix" }, value: "Bug Fix" },
    { text: { type: "plain_text", text: "Feature Request" }, value: "Feature Request" },
    { text: { type: "plain_text", text: "Changes / Modifications" }, value: "Changes / Modifications" }
];

// Impacted Metric options
const impactedMetricOptions = [
    { text: { type: "plain_text", text: "Gross profit per session" }, value: "Gross profit per session" },
    { text: { type: "plain_text", text: "Revenue per session" }, value: "Revenue per session" },
    { text: { type: "plain_text", text: "Contribution dollars per session" }, value: "Contribution dollars per session" },
    { text: { type: "plain_text", text: "Conversion rate" }, value: "Conversion rate" },
    { text: { type: "plain_text", text: "AOV" }, value: "AOV" },
    { text: { type: "plain_text", text: "Other" }, value: "Other" }
];

// Continue with defining blocks and the rest of the modal content
let blocks = [];

// Optionally add the 'Original Message' block if available
if (messageURL !== "No URL available") {
    blocks.push({
        type: "section",
        text: {
            type: "mrkdwn",
            text: `> <${messageURL}|🔗 Original Message>\n\n>${messageContent.replace(/\n/g, '\n>')}`
        }
    });
}

// Add the main introduction section
blocks.push({
    type: "section",
    text: {
        type: "mrkdwn",
                    text: "This form will input your request into <https://app.clickup.com/... | 📋 Storefront Updates>."
    }
});

// Continue adding other blocks for the modal
blocks.push({
    type: "input",
    block_id: "task_name_input",
    element: {
        type: "plain_text_input",
        placeholder: {
            type: "plain_text",
            text: "Briefly describe your request"
        }
    },
    label: {
        type: "plain_text",
        text: "🔖 Task Name",
        emoji: true
    }
});

// Additional inputs for Brand, URL, Task Type, Impacted Metric, and Additional Notes
blocks.push({
    type: "input",
    block_id: "brand_input",
    element: {
        type: "static_select",
        placeholder: {
            type: "plain_text",
            text: "Select a brand"
        },
        options: brandOptions // Assuming brandOptions is defined earlier in your script
    },
    label: {
        type: "plain_text",
        text: "💼 Brand",
        emoji: true
    }
});

blocks.push({
    type: "input",
    block_id: "url_input",
    element: {
        type: "plain_text_input",
        placeholder: {
            type: "plain_text",
            text: "Link to the affected webpage"
        }
    },
    label: {
        type: "plain_text",
        text: "🔗 URL",
        emoji: true
    }
});

blocks.push({
    type: "input",
    block_id: "task_type_input",
    element: {
        type: "static_select",
        placeholder: {
            type: "plain_text",
            text: "Select task type"
        },
        options: taskTypeOptions // Assuming taskTypeOptions is defined earlier in your script
    },
    label: {
        type: "plain_text",
        text: "🏷️ Task Type",
        emoji: true
    }
});

blocks.push({
    type: "input",
    block_id: "impacted_metric_input",
    element: {
        type: "static_select",
        placeholder: {
            type: "plain_text",
            text: "Select impacted metric"
        },
        options: impactedMetricOptions // Assuming impactedMetricOptions is defined earlier in your script
    },
    label: {
        type: "plain_text",
        text: "🎛️ Impacted Metric",
        emoji: true
    }
});

blocks.push({
    type: "input",
    block_id: "additional_notes_input",
    optional: true,
    element: {
        type: "plain_text_input",
        multiline: true,
        placeholder: {
            type: "plain_text",
            text: "Any information or context relevant to your request"
        }
    },
    label: {
        type: "plain_text",
        text: "📝 Additional Notes",
        emoji: true
    }
});

// Define the modal view with all necessary blocks
const view = {
    type: "modal",
    callback_id: "storefront_support",
    title: {
        type: "plain_text",
        text: "Storefront Support"
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
