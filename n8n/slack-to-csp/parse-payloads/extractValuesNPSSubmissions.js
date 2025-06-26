return items.map(item => {
    // Extract userID directly
    const userID = item.json.userID;

    // Adjust the regex to handle both "Promoter" and "Promoters" and capture the full brand name
    const brandMatch = item.json.pretext.match(/"\s*(.*?)\s*Promoter[s]?"/);
    const brand = brandMatch ? brandMatch[1] : "Unknown"; // Fallback to "Unknown" if no match

    // Extract the review text by isolating the part after the second star and replacing line breaks with spaces
    const reviewMatch = item.json.text.match(/\*(.*?)\*([\s\S]*?)$/);
    const review = reviewMatch ? reviewMatch[2].trim().replace(/\n/g, ' ') : "Review text not found"; // Fallback message if no match

    // Extract the reviewer name from the mailto: link
    const reviewerMatch = item.json.text.match(/<mailto:[^|]*\|([^>]*)>/);
    const reviewer = reviewerMatch ? reviewerMatch[1] : "Reviewer not found"; // Fallback if no name found

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
