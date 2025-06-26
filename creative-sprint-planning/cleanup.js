function sortExtraSheets() {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheetNames = ['Content Delivery', 'Products', 'Angles'];
    
    sheetNames.forEach(function(sheetName) {
      var sheet = spreadsheet.getSheetByName(sheetName);
      var lastRow = sheet.getLastRow();
      var lastColumn = sheet.getLastColumn();
  
      if (lastRow > 2) { // Check if there are more rows than just the headers and merged cells
        try {
          // Adjust the range to start from row 3 to the last row, covering all columns
          var range = sheet.getRange(3, 1, lastRow - 2, lastColumn);
          switch (sheetName) {
            case 'Content Delivery':
              // Sort by Column A, ascending
              range.sort({column: 1, ascending: true});
              break;
  
            case 'Products':
              // Sort by Column A, ascending
              range.sort({column: 1, ascending: true});
              break;
  
            case 'Angles':
              // Sort by Column B, ascending
              range.sort({column: 2, ascending: true});
              break;
          }
        } catch (error) {
          // Error logging
          Logger.log("Error sorting " + sheetName + ": " + error.toString());
        }
      }
    });
  }
  
  function archiveRows() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const completeSheet = ss.getSheetByName("✅ Complete");
    const archiveSheet = ss.getSheetByName("🗄️ Archive");
  
    // Function to convert column index to Excel column letter
    function columnToLetter(column) {
      let columnLetter = '';
      let temp;
      while (column > 0) {
        temp = (column - 1) % 26;
        columnLetter = String.fromCharCode(temp + 65) + columnLetter;
        column = (column - temp - 1) / 26;
      }
      return columnLetter;
    }
  
    // Determine the range of data to archive
    const lastColumn = completeSheet.getLastColumn();
    const lastRow = completeSheet.getLastRow();
    const lastColumnLetter = columnToLetter(lastColumn);
    const rangeString = "A2:" + lastColumnLetter + lastRow;
    const completeDataRange = completeSheet.getRange(rangeString);
    const completeData = completeDataRange.getValues();
    const completeNotes = completeDataRange.getNotes();
  
    // Prepare arrays to hold data and row indices for deletion
    let rowsToArchive = [];
    let rowsToArchiveNotes = [];
    let rowsToDeleteIndices = [];
  
    // Loop through all rows in the Complete sheet to check the status
    for (let i = 0; i < completeData.length; i++) {
      if (completeData[i][0] !== "Ready to Launch" && completeData[i][0] !== "On Hold") {
        rowsToArchive.push(completeData[i]);
        rowsToArchiveNotes.push(completeNotes[i]);
        rowsToDeleteIndices.push(i + 2);  // +2 to adjust for starting from row 2
      }
    }
  
    // Append data to Archive sheet
    if (rowsToArchive.length > 0) {
      const archiveRange = archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, rowsToArchive.length, rowsToArchive[0].length);
      archiveRange.setValues(rowsToArchive);
      archiveRange.setNotes(rowsToArchiveNotes);
  
      // Log the archived rows
      rowsToArchive.forEach(row => {
        console.log("Archived " + row[1]); // Assuming column B values are in index 1
      });
    }
  
    // Delete rows from Complete sheet in reverse order to avoid disrupting indices
    for (let i = rowsToDeleteIndices.length - 1; i >= 0; i--) {
      completeSheet.deleteRow(rowsToDeleteIndices[i]);
    }
  
    // Optionally sort the Archive sheet after update
    sortSheet("🗄️ Archive");
  }
  
  // Send creator notification upon job assignment
  function jobAssignmentNotification() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const inProgressSheet = ss.getSheetByName('🧑‍💻 In Progress');
    const dataRange = inProgressSheet.getDataRange();
    const data = dataRange.getValues();
  
    // Retrieve the cached identifiers (if any)
    const properties = PropertiesService.getScriptProperties();
    let cachedIdentifiers = properties.getProperty('cachedIdentifiers');
    cachedIdentifiers = cachedIdentifiers ? JSON.parse(cachedIdentifiers) : {};
  
    // Iterate over the rows to update cache and check for newly added assignees
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const uniqueIdentifier = row[1]; // Assuming column B is the unique identifier
      const creator = row[5]; // Column F for 'Creator'
  
      if (!creator && cachedIdentifiers[uniqueIdentifier] === undefined) {
        // No assignee, add to cache and log
        cachedIdentifiers[uniqueIdentifier] = false; // Mark as unassigned
        Logger.log('Added to unassigned cache: ' + uniqueIdentifier);
      } else if (cachedIdentifiers[uniqueIdentifier] === false && creator) {
        // Previously unassigned, but now has an assignee
        sendNotifications(inProgressSheet, i + 1, row);
        cachedIdentifiers[uniqueIdentifier] = true; // Update cache to indicate assignee is present
        Logger.log('Webhook sent for: ' + uniqueIdentifier);
      }
    }
  
    // Update the cache
    properties.setProperty('cachedIdentifiers', JSON.stringify(cachedIdentifiers));
  }
  
  function monitorReadyForReviewJobs() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var inProgressSheet = ss.getSheetByName("🧑‍💻 In Progress");
    var helperSheet = ss.getSheetByName("Review-Helper");
    
    var inProgressData = inProgressSheet.getDataRange().getValues();
    var helperDataRange = helperSheet.getRange("A3:A");
    var helperData = helperDataRange.getValues();
    var webhookUrl = "https://openstore.app.n8n.cloud/webhook/9928e1e1-eaf0-45eb-95f2-53d15dd108f7";
  
    // Refresh helper data to ensure it's up-to-date before processing
    helperData = helperDataRange.getValues();
  
    // Process Existing Entries in "Review-Helper"
    for (var i = helperData.length - 1; i >= 0; i--) { // Iterate backwards to safely delete rows if needed
      var helperRowValue = helperData[i][0];
      if (!helperRowValue) continue; // Skip empty rows
      var matched = false;
      for (var j = 1; j < inProgressData.length; j++) {
        if (inProgressData[j][0] === "Ready for Review" && inProgressData[j][1] === helperRowValue) {
          // Match found, send webhook
          var payload = JSON.stringify({ "rowData": inProgressData[j] });
          var options = { "method": "post", "contentType": "application/json", "payload": payload };
          UrlFetchApp.fetch(webhookUrl, options);
          matched = true;
          break; // Exit the loop after sending webhook for matched row
        }
      }
      // If no match is found, delete the row from the helper sheet
      if (!matched) {
        helperSheet.deleteRow(i + 3); // Adjust for header and starting from row 3
      }
    }
  
    // Log New "Ready for Review" Rows from "🧑‍💻 In Progress" to "Review-Helper"
    // Ensure we do not log rows already in "Review-Helper"
    var existingHelperValues = helperSheet.getRange("A3:A" + helperSheet.getLastRow()).getValues().map(function(row) { return row[0]; });
    for (var k = 1; k < inProgressData.length; k++) {
      if (inProgressData[k][0] === "Ready for Review" && existingHelperValues.indexOf(inProgressData[k][1]) === -1) {
        helperSheet.appendRow([inProgressData[k][1]]);
      }
    }
  }
  
  function contentDropNotification() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const cell = sheet.getActiveCell();
    const row = cell.getRow();
    const data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Prepare the payload as a JSON object
    const payload = JSON.stringify({data: data});
    
          // Test URL: 'https://openstore.app.n8n.cloud/webhook-test/a5b44084-354e-4757-8451-9272e64bb302'
    const webhookUrl = 'https://openstore.app.n8n.cloud/webhook/a5b44084-354e-4757-8451-9272e64bb302';
    
    const options = {
      'method' : 'post',
      'contentType': 'application/json',
      'payload' : payload
    };
    
    try {
      const response = UrlFetchApp.fetch(webhookUrl, options);
      Logger.log(response.getContentText());
      SpreadsheetApp.getUi().alert('Notification sent to #content-drops!');
    } catch (error) {
      SpreadsheetApp.getUi().alert('Failed to send data. Error: ' + error.toString());
    }
  }
  
  function launchTokOrganicNotification() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const cell = sheet.getActiveCell();
    const row = cell.getRow();
    const data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Prepare the payload as a JSON object
    const payload = JSON.stringify({data: data});
    
          // Test URL: 'https://openstore.app.n8n.cloud/webhook-test/cdb6d48c-fcef-463c-8b5b-06c6e10344a2'
    const webhookUrl = 'https://openstore.app.n8n.cloud/webhook/cdb6d48c-fcef-463c-8b5b-06c6e10344a2';
    
    const options = {
      'method' : 'post',
      'contentType': 'application/json',
      'payload' : payload
    };
    
    try {
      const response = UrlFetchApp.fetch(webhookUrl, options);
      Logger.log(response.getContentText());
      SpreadsheetApp.getUi().alert('Notification sent!');
    } catch (error) {
      SpreadsheetApp.getUi().alert('Failed to send data. Error: ' + error.toString());
    }
  }
  
  function updateAdStatus() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const completeSheet = ss.getSheetByName("✅ Complete");
    const launchedSheet = ss.getSheetByName("🌐 Launched");
  
    const completeColumnB = completeSheet.getRange("B2:B" + completeSheet.getLastRow()).getValues();
    const launchedColumnC = launchedSheet.getRange("C2:C" + launchedSheet.getLastRow()).getValues();
  
    let updateValuesA = [];
  
    completeColumnB.forEach((cell, i) => {
      let hasMatch = false;
  
      for (let j = 0; j < launchedColumnC.length; j++) {
        if (launchedColumnC[j][0] === cell[0]) {
          hasMatch = true;
          break;
        }
      }
  
      if (hasMatch) {
        updateValuesA.push(["Launched"]);
      } else {
        updateValuesA.push([null]); // Use null to indicate no update should be made to this cell
      }
    });
  
    // Set values in column A if any match was found
    if (updateValuesA.length > 0) {
      // Filter out non-updating rows (null entries) and apply updates to others
      updateValuesA.forEach((value, index) => {
        if (value[0] !== null) {
          completeSheet.getRange(index + 2, 1).setValue(value[0]);
        }
      });
    }
  }
  
  function syncLaunched() {
    var sourceSpreadsheetId = '13Tn7LLK9UnVC_3YUWEskvkAnyfYJiXsoENGGaIgfdj8';
    var sourceSheetName = 'Launched';
    var targetSheetName = '🌐 Launched';
  
    // Open the source spreadsheet and source sheet
    var sourceSpreadsheet = SpreadsheetApp.openById(sourceSpreadsheetId);
    var sourceSheet = sourceSpreadsheet.getSheetByName(sourceSheetName);
    
    // Define the range to be copied from the source sheet
    var lastRow = sourceSheet.getLastRow();
    var range = sourceSheet.getRange('A2:AV' + lastRow);
  
    // Get values from the range, filtered to exclude empty rows
    var values = range.getValues().filter(row => row.some(cell => cell !== ""));
    
    // Open the target sheet in the current spreadsheet
    var targetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName);
    
    // Clear existing contents from row 2 onwards to prevent data overlap
    var lastRowInTarget = targetSheet.getLastRow();
    if (lastRowInTarget > 1) {
      // Clear contents instead of deleting rows
      targetSheet.getRange(2, 1, lastRowInTarget - 1, targetSheet.getMaxColumns()).clearContent();
    }
    
    // Ensure there are enough rows to paste the new data
    var neededRows = values.length + 1 - lastRowInTarget;
    if (neededRows > 0) {
      targetSheet.insertRowsAfter(lastRowInTarget, neededRows);
    }
    
    // Set the copied values in the target sheet starting from row 2
    targetSheet.getRange(2, 1, values.length, range.getNumColumns()).setValues(values);
  }
  
  function syncLaunchedNonSP() {
    var sourceSpreadsheetId = '13Tn7LLK9UnVC_3YUWEskvkAnyfYJiXsoENGGaIgfdj8';
    var sourceSheetName = 'Launched (non-SP)';
    var targetSheetName = '🌐 Launched (non-SP)';
  
    // Open the source spreadsheet and source sheet
    var sourceSpreadsheet = SpreadsheetApp.openById(sourceSpreadsheetId);
    var sourceSheet = sourceSpreadsheet.getSheetByName(sourceSheetName);
    
    // Define the range to be copied from the source sheet
    var lastRow = sourceSheet.getLastRow();
    var range = sourceSheet.getRange('A2:P' + lastRow);
  
    // Get values from the range, filtered to exclude empty rows
    var values = range.getValues().filter(row => row.some(cell => cell !== ""));
    
    // Open the target sheet in the current spreadsheet
    var targetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName);
    
    // Clear existing contents from row 2 onwards to prevent data overlap
    var lastRowInTarget = targetSheet.getLastRow();
    if (lastRowInTarget > 1) {
      // Clear contents instead of deleting rows
      targetSheet.getRange(2, 1, lastRowInTarget - 1, targetSheet.getMaxColumns()).clearContent();
    }
    
    // Ensure there are enough rows to paste the new data
    var neededRows = values.length + 1 - lastRowInTarget;
    if (neededRows > 0) {
      targetSheet.insertRowsAfter(lastRowInTarget, neededRows);
    }
    
    // Set the copied values in the target sheet starting from row 2
    targetSheet.getRange(2, 1, values.length, range.getNumColumns()).setValues(values);
  }