// Extract and parse the slackPayloadBody from the input
const slackPayloadBodyString = items[0].json.slackPayloadBody;
const slackPayload = JSON.parse(slackPayloadBodyString);

// Initialize variables
let brandName = null;
let jobName = null;
let brandEmoji = null;
let statusSelected = null;
let statusDisplayValue = null;
let statusName = null;
let channelId = null;
let messageTimestamp = null;
let reviewLink = null;
let requesterName = null;
let creatorName = null;

// Extract channelId and messageTimestamp from the input
channelId = items[0].json.channelId;
messageTimestamp = items[0].json.messageTimestamp;

// Extract brandName, jobName, brandEmoji, reviewLink, requesterName, and creatorName from message blocks
if (slackPayload.message && slackPayload.message.blocks) {
    slackPayload.message.blocks.forEach(block => {
        if (block.type === 'section' && block.text) {
            const text = block.text.text;

            // Extract brandName (previously jobName)
            const brandNameMatch = text.match(/\*(.*?)\*/);
            if (brandNameMatch) {
                brandName = brandNameMatch[1].trim();
            }

            // Extract brandEmoji
            const brandEmojiMatches = text.match(/:([a-z0-9_+-]+):/g);
            if (brandEmojiMatches && brandEmojiMatches.length > 0) {
                brandEmoji = brandEmojiMatches[brandEmojiMatches.length - 1].trim();
            }
        }

        // Extract jobName from the button's text and reviewLink
        if (block.type === 'actions') {
            block.elements.forEach(element => {
                if (element.type === 'button') {
                    // Extract jobName from the button's text
                    if (element.text && element.text.type === 'plain_text') {
                        jobName = element.text.text;
                    }

                    // Extract reviewLink
                    if (element.url) {
                        reviewLink = element.url;
                    }
                }
            });
        }

        // Extract requesterName and creatorName from the context block
        if (block.type === 'context') {
            block.elements.forEach(element => {
                if (element.type === 'plain_text') {
                    const text = element.text;
                    const requesterNameMatch = text.match(/Requester: (\w+)/);
                    const creatorNameMatch = text.match(/Creator: (\w+)/);

                    if (requesterNameMatch) {
                        requesterName = requesterNameMatch[1].trim();
                    }

                    if (creatorNameMatch) {
                        creatorName = creatorNameMatch[1].trim();
                    }
                }
            });
        }
    });
}

// Extract statusSelected from state values and map to display values
let foundStatus = false;
if (slackPayload.state && slackPayload.state.values) {
    for (let blockId in slackPayload.state.values) {
        const blockValues = slackPayload.state.values[blockId];
        for (let actionId in blockValues) {
            const actionItem = blockValues[actionId];
            if (actionItem.type === 'static_select') {
                if (actionItem.selected_option) {
                    // When the user interacts with the dropdown menu
                    statusSelected = actionItem.selected_option.value;
                    statusDisplayValue = actionItem.selected_option.text.text;

                    // Check for specific case to keep the string literal emoji code
                    if (statusSelected === "in-progress" && statusDisplayValue.includes("In Progress")) {
                        statusDisplayValue = ":technologist: In Progress";
                    }

                    foundStatus = true;
                }
                break;
            }
        }
        if (foundStatus) break;
    }

    // Fallback if no selected_option is found
    if (!foundStatus) {
        const staticSelectBlock = slackPayload.message.blocks.find(block => 
            block.type === 'actions' && block.elements.some(el => el.type === 'static_select')
        );
        if (staticSelectBlock) {
            statusDisplayValue = staticSelectBlock.elements[0].placeholder.text;
            // Map the placeholder text to the corresponding statusSelected and statusName
            switch (statusDisplayValue) {
                case ":technologist: Ready to Create":
                    statusSelected = "ready-to-create";
                    statusName = "Ready to Create";
                    break;
                case ":memo: Notes Given":
                    statusSelected = "notes-given";
                    statusName = "Notes Given";
                    break;
                case ":white_check_mark: Approved":
                    statusSelected = "approved";
                    statusName = "Approved";
                    break;
                // Add other cases if needed
                default:
                    statusSelected = null;
                    statusName = null;
                    break;
            }
        }
    } else {
        statusName = statusName || statusDisplayValue.split(" ").slice(1).join(" ");
    }
}

// Construct the output object with extracted values
let outputObject = {
    jobName: jobName,
    brandName: brandName,
    brandEmoji: brandEmoji,
    statusSelected: statusSelected,
    statusDisplayValue: statusDisplayValue,
    statusName: statusName,
    reviewLink: reviewLink,
    requesterName: requesterName,
    creatorName: creatorName,
    channelId: channelId,
    messageTimestamp: messageTimestamp
};

// Return the output object
return [{ json: outputObject }];