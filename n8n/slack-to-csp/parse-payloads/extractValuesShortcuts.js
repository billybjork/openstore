// Get the slack payload from the 'ResetPayload' node
const slackPayloadString = items[0].json.slackPayloadBody;

// Parse the slack payload
const parsedPayload = JSON.parse(slackPayloadString);

// Extracting the trigger_id from the parsed payload
const trigger_id = parsedPayload.trigger_id;

// Constructing the modal payload with the trigger_id
return {
    json: {
        "trigger_id": trigger_id,
        "view": {
            "type": "modal",
            "callback_id": "advanced_modal",
            "title": {
                "type": "plain_text",
                "text": "Advanced Modal"
            },
            "submit": {
                "type": "plain_text",
                "text": "Submit"
            },
            "blocks": [
                {
                    "type": "section",
                    "block_id": "section_brand",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Select a Brand"
                    },
                    "accessory": {
                        "type": "static_select",
                        "action_id": "brand_select",
                        "placeholder": {
                            "type": "plain_text",
                            "text": "Select a brand"
                        },
                        "options": [
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "Jack Archer"
                                },
                                "value": "jack_archer"
                            },
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "Exo Drones"
                                },
                                "value": "exo_drones"
                            },
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "Skintific"
                                },
                                "value": "skintific"
                            }
                        ]
                    }
                },
                {
                    "type": "section",
                    "block_id": "section_job_type",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Select Job Type"
                    },
                    "accessory": {
                        "type": "static_select",
                        "action_id": "job_type_select",
                        "placeholder": {
                            "type": "plain_text",
                            "text": "Select a job type"
                        },
                        "options": [
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "New"
                                },
                                "value": "new"
                            },
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "More"
                                },
                                "value": "more"
                            },
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "Fix"
                                },
                                "value": "fix"
                            },
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "Adapt"
                                },
                                "value": "adapt"
                            }
                        ]
                    }
                },
                {
                    "type": "input",
                    "block_id": "section_concept_name",
                    "element": {
                        "type": "plain_text_input",
                        "action_id": "concept_name_input"
                    },
                    "label": {
                        "type": "plain_text",
                        "text": "Concept Name"
                    }
                }
            ]
        }
    }
};
