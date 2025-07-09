function winsTracker() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const launchedSheet = ss.getSheetByName("🌐 Launched");
    const winsHelperSheet = ss.getSheetByName("Wins_Helper");
    const planningSheet = ss.getSheetByName("📝 Planning");
  
    const launchedData = launchedSheet.getDataRange().getValues();
    const winsHelperData = winsHelperSheet.getDataRange().getValues();
  
    // Each action corresponds to a column in Wins_Helper:
    // - sendWinNotification => Column C (index 2)
    // - createQuickscaleJob   => Column D (index 3)
    // - tagIconikWin         => Column E (index 4)
    //
    // We "wrap" createQuickscaleJob so that it receives planningSheet as well.
    const actions = [
      { 
        name: 'sendWinNotification', 
        columnIndex: 2, 
        func: (rowData, launchedSheet) => sendWinNotification(rowData, launchedSheet)
      },
      { 
        name: 'createQuickscaleJob', 
        columnIndex: 3, 
        func: (rowData, launchedSheet) => createQuickscaleJob(rowData, planningSheet, launchedSheet)
      },
      { 
        name: 'tagIconikWin',       
        columnIndex: 4, 
        func: (rowData, launchedSheet) => tagIconikWin(rowData, launchedSheet)
      }
    ];
  
    // Create a Map of existing combinations (jobName|channel) in Wins_Helper
    // for faster lookups. We'll skip the header row by slicing from index 1.
    const existingCombos = new Map(
      winsHelperData.slice(1).map(row => [`${row[0]}|${row[1]}`, row])
    );
  
    const rowsToProcess = [];
    const newRowsToAdd = [];
  
    // Go through Launched sheet rows (skip header => i=1)
    for (let i = 1; i < launchedData.length; i++) {
      const row = launchedData[i];
  
      // Guard: we need at least 42 columns to read index 40 or 41 safely
      if (row.length < 42) {
        Logger.log(`Row ${i + 1} in Launched does not have enough columns.`);
        continue;
      }
  
      // Check if column AO (index 40) == "🏆"
      if (row[40] === "🏆") {
        // jobName from column C (index 2), channel from column A (index 0)
        const jobName = row[2];
        const channel = row[0];
  
        // If missing jobName or channel, skip
        if (!jobName || !channel) {
          Logger.log(`Row ${i + 1}: Missing jobName or channel, skipping.`);
          continue;
        }
  
        const key = `${jobName}|${channel}`;
  
        // If we do NOT have this combo in Wins_Helper, we must add it
        if (!existingCombos.has(key)) {
          newRowsToAdd.push({
            data: [jobName, channel, '', '', ''], // columns A-E in Wins_Helper
            launchedRow: i + 1,
            isNew: true
          });
        } else {
          // Already in Wins_Helper; see if it still needs any action
          const existingRow = existingCombos.get(key);
          // existingRow[2] = Column C, existingRow[3] = Column D, existingRow[4] = Column E
          const missingAnyAction = (existingRow[2] === '' || 
                                    existingRow[3] === '' || 
                                    existingRow[4] === '');
          if (missingAnyAction) {
            // Find the index of that row in winsHelperData
            const winsHelperRowIndex = winsHelperData.findIndex(r => 
              r[0] === jobName && r[1] === channel
            );
            // +1 because .getRange() is 1-based
            if (winsHelperRowIndex >= 0) {
              rowsToProcess.push({
                data: existingRow,
                winsHelperRow: winsHelperRowIndex + 1, 
                isNew: false
              });
            } else {
              Logger.log(`Wins_Helper row not found for ${jobName}|${channel}.`);
            }
          }
        }
      }
    }
  
    // =================================
    // ADD NEW ROWS TO Wins_Helper SHEET
    // =================================
    if (newRowsToAdd.length > 0) {
      newRowsToAdd.forEach(item => {
        // Determine the next available (empty) row in column A.
        const lastRow = winsHelperSheet.getLastRow();
        let targetRow = 0;
        // Retrieve all values in column A up to the last row.
        const colAValues = winsHelperSheet.getRange(1, 1, lastRow).getValues();
        for (let i = 0; i < colAValues.length; i++) {
          if (colAValues[i][0] === '') {
            targetRow = i + 1; // Convert to 1-indexed row number.
            break;
          }
        }
        // If no empty cell was found, use the row immediately after the last row.
        if (targetRow === 0) {
          targetRow = lastRow + 1;
        }
        
        // Insert the new row data into the found row.
        winsHelperSheet.getRange(targetRow, 1, 1, item.data.length).setValues([item.data]);
  
        // Also add this row to rowsToProcess so that actions can run immediately.
        rowsToProcess.push({
          data: item.data,
          winsHelperRow: targetRow,
          launchedRow: item.launchedRow,
          isNew: true
        });
      });
    }
  
    // =================================
    // PERFORM ACTIONS ON rowsToProcess
    // =================================
    // We'll check each row in Wins_Helper to see which actions are still needed.
    for (let i = 0; i < rowsToProcess.length; i++) {
      const { data, winsHelperRow } = rowsToProcess[i];
      // data[0] => jobName, data[1] => channel
      const jobName = data[0];
      const channel = data[1];
  
      // Determine the row index in the Launched sheet.
      let rowIndex = rowsToProcess[i].launchedRow;
      if (!rowIndex) {
        rowIndex = launchedData.findIndex(row => row[2] === jobName && row[0] === channel) + 1;
      }
  
      // Build the rowData object expected by the action functions.
      const rowData = { jobName, channel, rowIndex };
  
      // For each action (sendWinNotification, createQuickscaleJob, tagIconikWin)
      for (const action of actions) {
        // If the corresponding Wins_Helper column is empty, we run it.
        if (data[action.columnIndex] === '') {
          Logger.log(`Running ${action.name} for jobName="${jobName}", channel="${channel}"`);
          let response;
          try {
            // Pass rowData and the launchedSheet object to the action function.
            response = action.func(rowData, launchedSheet);
          } catch (err) {
            // If tagIconikWin fails, log as an expected error and continue.
            if (action.name === 'tagIconikWin') {
              Logger.log(`Expected error in ${action.name} for "${jobName}|${channel}": ${err}`);
            } else {
              Logger.log(`Error in ${action.name} for "${jobName}|${channel}": ${err}`);
            }
            continue;
          }
          // Normalize boolean responses: treat 'true' as a successful response.
          if (response === true) {
            response = { statusCode: 200 };
          }
          // If the function returns a success status, mark it with the current date.
          if (response && response.statusCode === 200) {
            Logger.log(`${action.name} succeeded for ${jobName}|${channel}`);
            const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/dd/yyyy");
            winsHelperSheet.getRange(winsHelperRow, action.columnIndex + 1).setValue(dateStr);
            data[action.columnIndex] = dateStr;
          } else {
            Logger.log(`${action.name} failed or returned non-200 for ${jobName}|${channel}. Response: ${JSON.stringify(response)}`);
          }
        }
      }
    }
  
    Logger.log("winsTracker() completed successfully. All rows processed.");
  }
  
  function sendWinNotification(rowData, launchedSheet) {
          // Test URL: "https://openstore.app.n8n.cloud/webhook-test/..."
    const webhookUrl = "https://openstore.app.n8n.cloud/webhook/...";
    const columnsToInclude = ['A', 'C', 'D', 'F', 'G', 'L', 'X', 'AE', 'AF', 'AG', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AP'];
    
    const payload = {
      HookWin: 'N',
      winningVariantName: determineWinningVariantName(rowData, launchedSheet)
    };
    columnsToInclude.forEach(col => {
      const colIndex = columnToIndex(col);
      const cellValue = launchedSheet.getRange(rowData.rowIndex, colIndex + 1).getDisplayValue();
      payload[col] = cellValue;
    });
  
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload)
    };
  
    try {
      const response = UrlFetchApp.fetch(webhookUrl, options);
      if (response.getResponseCode() == 200) {
        console.log(`Successfully sent win notification for job name: ${rowData.jobName}, Channel: ${rowData.channel}`);
        return true;
      } else {
        console.error(`Failed to send win notification for job name: ${rowData.jobName}, Channel: ${rowData.channel}. Response code: ${response.getResponseCode()}`);
        return false;
      }
    } catch (error) {
      console.error(`Error sending webhook for job name: ${rowData.jobName}, Channel: ${rowData.channel}:`, error);
      return false;
    }
  
    // Helper function to convert column letter to index
    function columnToIndex(column) {
      let index = 0;
      for (let i = 0; i < column.length; i++) {
        index = index * 26 + column.charCodeAt(i) - 64;
      }
      return index - 1; // Subtract 1 because array is 0-indexed
    }
  }
  
  function tagIconikWin(rowData, launchedSheet) {
    const winningVariantName = determineWinningVariantName(rowData, launchedSheet);
    if (!winningVariantName) {
      console.error(`Unable to determine winning variant for job name: ${rowData.jobName}, Channel: ${rowData.channel}`);
      return false;
    }
    try {
      const response = setVariantWin(winningVariantName);  // Call the function for regular wins
      if (response && response.statusCode === 200) {
        console.log(`Successfully tagged Iconik win for job name: ${rowData.jobName}, Channel: ${rowData.channel}, Winning variant: ${winningVariantName}`);
        return true;
      } else {
        console.error(`Failed to tag Iconik win. Status code: ${response ? response.statusCode : 'No response'}`);
        return false;
      }
    } catch (error) {
      console.error(`Error tagging Iconik win for job name: ${rowData.jobName}, Channel: ${rowData.channel}:`, error);
      return false;
    }
  }
  
  function createQuickscaleJob(rowData, planningSheet, launchedSheet) {
    if (!rowData || !planningSheet || !launchedSheet) {
      console.error("Missing required parameters in createQuickscaleJob");
      return false;
    }
  
    try {
      const launchedRow = launchedSheet.getRange(rowData.rowIndex, 1, 1, launchedSheet.getLastColumn()).getValues()[0];
      
      const newRow = Array(planningSheet.getLastColumn()).fill("");
      newRow[0] = "Ready to Create";
      newRow[2] = launchedRow[3];  // Column D from Launched: Brand Name
      newRow[4] = "Automated";
      newRow[6] = "More";
      newRow[7] = "Quickscale-" + launchedRow[8];  // Column I from Launched: Concept Name
      newRow[8] = launchedRow[2];  // Column C from Launched: Job Name
      newRow[9] = launchedRow[22];  // Column W from Launched: Job #
      newRow[10] = launchedRow[11];  // Column L from Launched: Angle
      newRow[11] = launchedRow[12];  // Column M from Launched: Product
      newRow[12] = launchedRow[23];  // Column X from Launched: Creative Link
      newRow[14] = launchedRow[15];  // Column P from Launched: Format
      newRow[15] = launchedRow[16];  // Column Q from Launched: Variants
      newRow[16] = launchedRow[17];  // Column R from Launched: Size - 1:1
      newRow[17] = launchedRow[18];  // Column S from Launched: Size - 4x5
      newRow[18] = launchedRow[19];  // Column T from Launched: Size - 9x16
      newRow[19] = launchedRow[20];  // Column U from Launched: Size - 16x9
  
      planningSheet.appendRow(newRow);
      const lastRow = planningSheet.getLastRow();
      planningSheet.getRange(lastRow, 14).setNote("📊 INSIGHT\n\n🚀 APPLICATION");
      
      console.log(`Successfully created Quickscale job for job name: ${rowData.jobName}, Channel: ${rowData.channel}, New job name: ${newRow[8]}`);
      return true;  // Indicate success
    } catch (error) {
      console.error(`Error in createQuickscaleJob for job name: ${rowData.jobName}, Channel: ${rowData.channel}`, error);
      return false;
    }
  }
  
  function hookWinsTracker() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const launchedSheet = ss.getSheetByName("🌐 Launched");
    const hookWinsHelperSheet = ss.getSheetByName("Hook-Wins_Helper");
  
    const launchedData = launchedSheet.getDataRange().getDisplayValues();
    const hookWinsHelperData = hookWinsHelperSheet.getDataRange().getValues();
  
    // Indexes for key columns in 🌐 Launched
    const channelColIndex = 0;  // Column A for channel
    const jobNameColIndex = 2;  // Column C for job name (unique ID)
    const totalSpendColIndex = 32;  // Column AG for total spend
    const hookRateColIndex = 34;  // Column AI for hook rate
  
    // Filter out rows based on the set threshold conditions that aren't in Hook-Wins_Helper
    const rowsToProcess = launchedData.slice(1).filter(function(row) {
      const channel = row[channelColIndex];
      const hookRate = parseFloat(row[hookRateColIndex].replace('%', ''));
      const totalSpend = parseFloat(row[totalSpendColIndex].replace(/[^0-9.-]+/g, ""));
      const jobName = row[jobNameColIndex];
  
      return channel === "Meta" && 
             hookRate > 40 && 
             totalSpend > 100 && 
             !hookWinsHelperData.some(r => r[0] === jobName && r[1] === channel);
    }).map(function(row) {
      return {
        jobName: row[jobNameColIndex],
        channel: row[channelColIndex],
        hookRate: parseFloat(row[hookRateColIndex].replace('%', '')),
        totalSpend: parseFloat(row[totalSpendColIndex].replace(/[^0-9.-]+/g, ""))
      };
    });
  
    // Function to find the next available blank row in columns A:D
    function findNextBlankRow(sheet, data) {
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        // Check if columns A to D are all blank (ignore column E)
        if (row.slice(0, 4).every(cell => cell === '')) {
          return i + 1; // Return the 1-based row index
        }
      }
      // If no blank row is found, return the row after the last one
      return data.length + 1;
    }
  
    // Find the next blank row in columns A:D of the Hook-Wins_Helper sheet
    const nextBlankRow = findNextBlankRow(hookWinsHelperSheet, hookWinsHelperData);
  
    // Process new rows
    rowsToProcess.forEach(function(rowData) {
      const newRow = [rowData.jobName, rowData.channel, '', ''];
      // Insert the new row in the next blank row found in columns A:D
      hookWinsHelperSheet.getRange(nextBlankRow, 1, 1, 4).setValues([newRow]);
      processActions(rowData, nextBlankRow);
    });
  
    // Process existing rows that need actions
    hookWinsHelperData.forEach(function(row, index) {
      if (index === 0) return; // Skip header row
      if (row[0] && (row[2] === '' || row[3] === '')) {
        const rowData = {
          jobName: row[0],
          channel: row[1],
          hookRate: findHookRate(launchedData, row[0], row[1]),
          totalSpend: findTotalSpend(launchedData, row[0], row[1])
        };
        processActions(rowData, index + 1);
      }
    });
  
    function processActions(rowData, helperSheetRow) {
      const actions = [
        { name: 'sendHookWinNotification', columnIndex: 2, func: sendHookWinNotification },
        { name: 'tagIconikHookWin', columnIndex: 3, func: tagIconikHookWin }
      ];
  
      actions.forEach(action => {
        if (hookWinsHelperSheet.getRange(helperSheetRow, action.columnIndex + 1).getValue() === '') {
          try {
            const success = action.func(rowData, launchedSheet);
            if (success) {
              const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/dd/yyyy");
              hookWinsHelperSheet.getRange(helperSheetRow, action.columnIndex + 1).setValue(dateStr);
            }
          } catch (error) {
            console.error(`Error in ${action.name} for job name: ${rowData.jobName}, Channel: ${rowData.channel}`, error);
          }
        }
      });
    }
  
    function findHookRate(launchedData, jobName, channel) {
      const row = launchedData.find(r => r[jobNameColIndex] === jobName && r[channelColIndex] === channel);
      return row ? parseFloat(row[hookRateColIndex].replace('%', '')) : null;
    }
  
    function findTotalSpend(launchedData, jobName, channel) {
      const row = launchedData.find(r => r[jobNameColIndex] === jobName && r[channelColIndex] === channel);
      return row ? parseFloat(row[totalSpendColIndex].replace(/[^0-9.-]+/g, "")) : null;
    }
  }
  
  function sendHookWinNotification(rowData, launchedSheet) {
          // Test URL: "https://openstore.app.n8n.cloud/webhook-test/..."
    const webhookUrl = "https://openstore.app.n8n.cloud/webhook/...";
    const columnsToInclude = ['A', 'C', 'D', 'F', 'G', 'X', 'AE', 'AI', 'AM', 'AN'];
    
    const payload = {
      HookWin: 'Y',
      winningVariantName: determineWinningVariantName(rowData, launchedSheet)
    };
  
    // Find the row in the Launched sheet
    const launchedData = launchedSheet.getDataRange().getDisplayValues();
    const rowIndex = launchedData.findIndex(row => row[2] === rowData.jobName && row[0] === rowData.channel);
  
    if (rowIndex === -1) {
      console.error(`Row not found in Launched sheet for job name: ${rowData.jobName}, Channel: ${rowData.channel}`);
      return false;
    }
  
    columnsToInclude.forEach(col => {
      const colIndex = columnToIndex(col);
      const cellValue = launchedData[rowIndex][colIndex];
      payload[col] = cellValue;
    });
  
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload)
    };
  
    try {
      const response = UrlFetchApp.fetch(webhookUrl, options);
      if (response.getResponseCode() == 200) {
        console.log(`Successfully sent hook win notification for job name: ${rowData.jobName}, Channel: ${rowData.channel}`);
        return true;
      } else {
        console.error(`Failed to send hook win notification for job name: ${rowData.jobName}, Channel: ${rowData.channel}. Response code: ${response.getResponseCode()}`);
        return false;
      }
    } catch (error) {
      console.error(`Error sending webhook for job name: ${rowData.jobName}, Channel: ${rowData.channel}:`, error);
      return false;
    }
  }
  
  // Helper function to convert column letter to index
  function columnToIndex(column) {
    let index = 0;
    for (let i = 0; i < column.length; i++) {
      index = index * 26 + column.charCodeAt(i) - 64;
    }
    return index - 1; // Subtract 1 because array is 0-indexed
  }
  
  function tagIconikHookWin(rowData, launchedSheet) {
    const winningVariantName = determineWinningVariantName(rowData, launchedSheet);
    if (!winningVariantName) {
      console.error(`Unable to determine winning job variant for job name: ${rowData.jobName}, Channel: ${rowData.channel}`);
      return false;
    }
  
    try {
      const response = setHookWin(winningVariantName);  // Call the setHookWin function
  
      if (response && response.statusCode === 200) {  // Check for success status code
        console.log(`Successfully tagged Iconik hook win for job name: ${rowData.jobName}, Channel: ${rowData.channel}, Winning variant: ${winningVariantName}`);
        return true;  // Indicate success
      } else {
        console.error(`Failed to tag Iconik hook win. Status code: ${response ? response.statusCode : 'No response'}`);
        return false;  // Return false if tagging failed or no response
      }
    } catch (error) {
      console.error(`Error tagging Iconik hook win for job name: ${rowData.jobName}, Channel: ${rowData.channel}:`, error);
      return false;
    }
  }
  
  function determineWinningVariantName(rowData, launchedSheet) {
    const launchedData = launchedSheet.getDataRange().getDisplayValues();
    const rowIndex = launchedData.findIndex(row => row[2] === rowData.jobName && row[0] === rowData.channel);
  
    if (rowIndex === -1) {
      console.error(`Row not found in Launched sheet for job name: ${rowData.jobName}, Channel: ${rowData.channel}`);
      return null;
    }
  
    const columnAPValue = launchedData[rowIndex][41]; // Column AP (index 41)
    console.log(`Raw value from Column AP: "${columnAPValue}" for job ${rowData.jobName}`);
  
    const regex = /[A-Za-z0-9_.&\/'’%,-]+/g;
    const matches = columnAPValue.match(regex);
  
    if (!matches) {
      console.error(`No valid winning job variant found in: ${columnAPValue}`);
      return null;
    }
  
    let winningVariantName = matches.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
  
    if (winningVariantName.endsWith('-')) {
      winningVariantName = winningVariantName.slice(0, -1);
    }
  
    console.log(`Determined winning job variant: ${winningVariantName}`);
    return winningVariantName;
  }