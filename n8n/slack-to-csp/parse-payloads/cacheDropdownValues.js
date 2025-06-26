// Access the static data storage specific to this workflow
const staticData = $getWorkflowStaticData('global');

// Initialize or clear lists in static data
staticData.brands = [];
staticData.formats = [];
staticData.assetTypes = [];
staticData.events = [];
staticData.sources = [];

// Initialize triggerId variable
let triggerId = '';

// Loop through items to process data from both nodes
items.forEach(item => {
    // Process data from the node with brands, formats, assetTypes, events, and sources
    if (item.json.Brand) {
        const {Brand, Format, "Asset Type": AssetType, Event, Source} = item.json;

        if (Brand && !staticData.brands.includes(Brand)) {
            staticData.brands.push(Brand);
        }
        if (Format && !staticData.formats.includes(Format)) {
            staticData.formats.push(Format);
        }
        if (AssetType && !staticData.assetTypes.includes(AssetType)) {
            staticData.assetTypes.push(AssetType);
        }
        if (Event && !staticData.events.includes(Event)) {
            staticData.events.push(Event);
        }
        if (Source && !staticData.sources.includes(Source)) {
            staticData.sources.push(Source);
        }
    }

    // Process data from the node with trigger_id
    if (item.json.trigger_id) {
        triggerId = item.json.trigger_id;
    }
});

// Construct the final output object
const output = [
    {json: {brands: staticData.brands}},
    {json: {formats: staticData.formats}},
    {json: {assetTypes: staticData.assetTypes}},
    {json: {events: staticData.events}},
    {json: {sources: staticData.sources}}
];

// Add triggerId to the output if it's not an empty string
if (triggerId) {
    output.push({json: {trigger_id: triggerId}});
}

// Return the final output
return output;
