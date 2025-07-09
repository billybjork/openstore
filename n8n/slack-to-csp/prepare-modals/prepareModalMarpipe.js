// Ensure items array is not empty
if (items.length === 0) {
    return [{ error: "Empty items array. No trigger ID available." }];
}

// Access the trigger_id from the previous node
const triggerId = items[0].json.trigger_id;

// Define the brand options
const brandOptions = [
    { text: { type: "plain_text", text: "Bahimi" }, value: "Bahimi" },
    { text: { type: "plain_text", text: "Barn Chic Boutique" }, value: "Barn Chic Boutique" },
    { text: { type: "plain_text", text: "Bathpack" }, value: "Bathpack" },
    { text: { type: "plain_text", text: "Beauty Melanin" }, value: "Beauty Melanin" },
    { text: { type: "plain_text", text: "BLVDBLK" }, value: "BLVDBLK" },
    { text: { type: "plain_text", text: "Buy Secure Mat" }, value: "Buy Secure Mat" },
    { text: { type: "plain_text", text: "Canvas Cultures" }, value: "Canvas Cultures" },
    { text: { type: "plain_text", text: "Cartoonify Me" }, value: "Cartoonify Me" },
    { text: { type: "plain_text", text: "Collection Lounge" }, value: "Collection Lounge" },
    { text: { type: "plain_text", text: "Copenhagen Kid" }, value: "Copenhagen Kid" },
    { text: { type: "plain_text", text: "Creed Wear" }, value: "Creed Wear" },
    { text: { type: "plain_text", text: "Degs & Sal" }, value: "Degs & Sal" },
    { text: { type: "plain_text", text: "Department Store" }, value: "Department Store" },
    { text: { type: "plain_text", text: "Ecletticos" }, value: "Ecletticos" },
    { text: { type: "plain_text", text: "Eleven Oaks" }, value: "Eleven Oaks" },
    { text: { type: "plain_text", text: "Epiphanie" }, value: "Epiphanie" },
    { text: { type: "plain_text", text: "Everie Woman" }, value: "Everie Woman" },
    { text: { type: "plain_text", text: "EXO Drones" }, value: "EXO Drones" },
    { text: { type: "plain_text", text: "FarmFoods" }, value: "FarmFoods" },
    { text: { type: "plain_text", text: "Feed Me Fight Me" }, value: "Feed Me Fight Me" },
    { text: { type: "plain_text", text: "Future Kind" }, value: "Future Kind" },
    { text: { type: "plain_text", text: "Groove Bags" }, value: "Groove Bags" },
    { text: { type: "plain_text", text: "Gumdrop" }, value: "Gumdrop" },
    { text: { type: "plain_text", text: "Hereafter" }, value: "Hereafter" },
    { text: { type: "plain_text", text: "HistoreeTees" }, value: "HistoreeTees" },
    { text: { type: "plain_text", text: "Hypest Fit" }, value: "Hypest Fit" },
    { text: { type: "plain_text", text: "iloveplum" }, value: "iloveplum" },
    { text: { type: "plain_text", text: "Jack Archer" }, value: "Jack Archer" },
    { text: { type: "plain_text", text: "King Kong Apparel" }, value: "King Kong Apparel" },
    { text: { type: "plain_text", text: "Kozy Couch" }, value: "Kozy Couch" },
    { text: { type: "plain_text", text: "Livewell Designs" }, value: "Livewell Designs" },
    { text: { type: "plain_text", text: "Mahalo Cases" }, value: "Mahalo Cases" },
    { text: { type: "plain_text", text: "Modernist Metal" }, value: "Modernist Metal" },
    { text: { type: "plain_text", text: "Momma's Shop" }, value: "Momma's Shop" },
    { text: { type: "plain_text", text: "Necklow" }, value: "Necklow" },
    { text: { type: "plain_text", text: "Nine Months Sober" }, value: "Nine Months Sober" },
    { text: { type: "plain_text", text: "OpenStore" }, value: "OpenStore" },
    { text: { type: "plain_text", text: "OpenStore Drive" }, value: "OpenStore Drive" },
    { text: { type: "plain_text", text: "Regen Health" }, value: "Regen Health" },
      { text: { type: "plain_text", text: "Ritter Wools" }, value: "Ritter Wools" },
    { text: { type: "plain_text", text: "Sensory Joy" }, value: "Sensory Joy" },
    { text: { type: "plain_text", text: "Skintific (CaliforniaLiving123)" }, value: "Skintific (CaliforniaLiving123)" },
    { text: { type: "plain_text", text: "Skull Riderz" }, value: "Skull Riderz" },
    { text: { type: "plain_text", text: "SOL Organics" }, value: "SOL Organics" },
    { text: { type: "plain_text", text: "Spindle Mattress" }, value: "Spindle Mattress" },
    { text: { type: "plain_text", text: "Sutro Footwear" }, value: "Sutro Footwear" },
      { text: { type: "plain_text", text: "SweatTent" }, value: "SweatTent" },
    { text: { type: "plain_text", text: "TheSTEMKids" }, value: "TheSTEMKids" },
    { text: { type: "plain_text", text: "Tuski" }, value: "Tuski" },
    { text: { type: "plain_text", text: "Veloxbot" }, value: "Veloxbot" },
    { text: { type: "plain_text", text: "Wearva" }, value: "Wearva" },
    { text: { type: "plain_text", text: "WP Standard" }, value: "WP Standard" },
    { text: { type: "plain_text", text: "Yogaste" }, value: "Yogaste" }
];

// Construct the Block Kit payload with updated requirements
const payload = {
    trigger_id: triggerId,
    view: {
        type: "modal",
        callback_id: "marpipe",
        title: {
            type: "plain_text",
            text: "Request a Template"
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
                    text: "*To request a new Marpipe template, you have two options:*\n1. Choose an option from our <https://docs.google.com/presentation/d/.../edit|Catalog Template Menu> :label:\n2. Input your own reference link :bulb:\n"
                }
            },
            {
                type: "input",
                block_id: "brand_selection",
                element: {
                    type: "static_select",
                    placeholder: {
                        type: "plain_text",
                        text: "Select a Brand"
                    },
                    action_id: "brand_select",
                    options: brandOptions
                },
                label: {
                    type: "plain_text",
                    text: "Brand"
                }
            },
            {
                type: "input",
                block_id: "template_reference",
                element: {
                    type: "plain_text_input",
                    action_id: "template_reference_input",
                    placeholder: {
                        type: "plain_text",
                        text: "Input your menu selection or reference link"
                    }
                },
                label: {
                    type: "plain_text",
                    text: "Template Reference"
                }
            }
        ]
    }
};

return [{ json: payload }];