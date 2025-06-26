// Function to convert a custom date format to a standard one
function parseCustomDate(customDate) {
    // Example format: "2024-05-14 03-03PM" becomes "2024-05-14 03:03 PM"
    const [datePart, timePart] = customDate.split(' ');
    const [hours, minutes] = timePart.split('-');
    return `${datePart} ${hours}:${minutes.slice(0, 2)} ${minutes.slice(2)}`;
  }
  
  // Function to convert UTC date to Miami Time (EDT) and format it nicely
  function convertToMiamiTime(utcDate) {
    const standardDate = parseCustomDate(utcDate);
    const date = new Date(standardDate);
    return date.toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: 'short', // "Jun", "Jul", "Aug", etc.
      day: '2-digit', // "01", "02", etc.
      year: 'numeric', // "2021", "2022", etc.
      hour: 'numeric', // "1", "2", etc., based on the hour
      minute: '2-digit', // "01", "02", etc.
      hour12: true // Use AM/PM
    });
  }
  
  // Assume the input data comes in variables called startDate and endDate
  const startDate = items[0].json.startDate;
  const endDate = items[0].json.endDate;
  
  // Convert dates and format them nicely
  const miamiStartDate = convertToMiamiTime(startDate);
  const miamiEndDate = convertToMiamiTime(endDate);
  
  // Return the formatted start date and end date separately
  return [
    {
      json: {
        miamiStartDate,
        miamiEndDate
      }
    }
  ];
  