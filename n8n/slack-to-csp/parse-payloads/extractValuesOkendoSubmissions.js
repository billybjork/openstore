return items.map(item => {
    // Extract userID directly
    const userID = item.json.userID;

    // Extract brand using regex
    const brandMatch = item.json.pretext.match(/New (.*?) Review/);
    const brand = brandMatch ? brandMatch[1] : "Unknown";

    // Extract review text, removing escape characters
    const review = item.json.text.replace(/^\s*"|"\s*$/g, '').replace(/\\n/g, '').trim();

    // Extract reviewer name and remove any "." characters
    const reviewer = item.json.name.trim().replace(/\./g, '');

    // Return the processed data as a new object
    return {
        json: {
            userID: userID,
            brand: brand,
            review: review,
            reviewer: reviewer
        }
    };
});