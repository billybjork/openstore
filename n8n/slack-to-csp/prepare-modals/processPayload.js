// Extract and parse the slackPayload from the webhook's body
const slackPayloadString = items[0].json.body.payload;
const slackPayload = JSON.parse(slackPayloadString);

// Extract the payload type
const payloadType = slackPayload.type;

// Extract the channel ID and message timestamp from the payload
const channelId = slackPayload.channel ? slackPayload.channel.id : null;
let messageTimestamp = slackPayload.container ? slackPayload.container.message_ts : null;

// Extract message_ts from different payload structures
if (!messageTimestamp && slackPayload.message_ts) {
    messageTimestamp = slackPayload.message_ts;
}
if (!messageTimestamp && slackPayload.message && slackPayload.message.ts) {
    messageTimestamp = slackPayload.message.ts;
}

// Extract callbackID if present
const callbackId = slackPayload.callback_id || (slackPayload.view && slackPayload.view.callback_id ? slackPayload.view.callback_id : null);

// Initialize an empty array to hold the output objects
let outputObjects = [];

// Extract the actionId from the actions array and create an output object for each action
if (slackPayload.actions && slackPayload.actions.length > 0) {
    slackPayload.actions.forEach(action => {
        let actionId = action.action_id;
        outputObjects.push({ 
            payloadType: payloadType, 
            actionId: actionId,
            channelId: channelId,
            messageTimestamp: messageTimestamp,
            callbackId: callbackId // Include callbackId in the output object
        });
    });
}

// If there are no actions, still return the payloadType, channelId, messageTimestamp, and callbackId
if (outputObjects.length === 0) {
    outputObjects.push({ 
        payloadType: payloadType,
        channelId: channelId,
        messageTimestamp: messageTimestamp,
        callbackId: callbackId // Include callbackId in the output object
    });
}

// Return the array of output objects
return outputObjects;
