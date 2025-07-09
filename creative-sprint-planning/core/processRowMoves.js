// ===== CONFIGURATION =====
const CONFIG = {
  STATUS_COLUMN_INDEX: 0,       // Column A (0-based) for status
  IGNORED_COLUMN_INDEX: 3,      // Column D (0-based) to ignore on write
  NOTE_COLUMN_LETTER: 'N',
  NOTE_COLUMN_INDEX: 13,        // Column N (0-based) for notes
  TOTAL_COLUMNS: 28,            // A:AB
  HEADER_ROWS: 1,

  PLANNING_SHEET_NAME: "📝 Planning", 
  JOB_NUMBER_COLUMN_INDEX: 21,      // Column V (0-based) for Job Number (used by logStatusChange as JOB_ID)
  CLIENT_BRAND_COLUMN_INDEX: 2,     // Column C (0-based) for Client Brand (used by logStatusChange)
  
  DATA_SHEET_NAME: "Data",          
  JOB_COUNTER_DATA_COLUMN_INDEX_IN_DATA_SHEET: 0,  
  JOB_COUNTER_VALUE_COLUMN_INDEX_IN_DATA_SHEET: 3, 

  COMPLETED_DATE_COLUMN_INDEX: 24, // Column Y (0-based)
  COMPLETED_SHEET_NAME: "✅ Complete", 

  REVIEW_SHEET_NAME: "👀 Review",
  REVIEW_LINK_COLUMN_INDEX: 22,   // Column W (0-based)
  REVIEW_LINK_QUERY_COLUMN_INDEX: 1, // Column B (0-based) - value to pass to iconikSearch
  
  // URL prefixes to skip for jobs with existing links
  URL_PREFIX_ICONIK: "https://icnk.io/u/",
  URL_PREFIX_MARPIPE: "https://app.marpipe.com/", 

  // Webhook URL from n8n
  WEBHOOK_URL: "https://openstore.app.n8n.cloud/webhook/...",
  SEND_WEBHOOK_NOTIFICATIONS: true,
  PRODUCTION_SPREADSHEET_ID: "...", 
  WEBHOOK_JOB_ID_COLUMN_INDEX: 21, 
};

// ===== STATUS ↔ SHEET MAPPING =====
const STATUS_MAPPING = {
  "Planning"        : "📝 Planning",
  "Awaiting Content": "📝 Planning",
  "Ready to Create" : "🧑‍💻 In Progress",
  "In Progress"     : "🧑‍💻 In Progress",
  "Notes Given"     : "🧑‍💻 In Progress",
  "Ready for Review": "👀 Review",
  "Approved"        : "👀 Review",
  "Ready to Launch" : "✅ Complete",
  "On Hold"         : "✅ Complete",
  "Live"            : "✅ Complete",
  "Paused"          : "✅ Complete",
  "Canceled"        : "✅ Complete",
  "Launched"        : "✅ Complete"
};

/**
 * Return the sheet name for a given status (or null if none).
 */
function getTargetSheetName(status) {
  return STATUS_MAPPING[status] || null;
}

/**
 * All of the sheets that could contain rows to move:
 *   the unique set of values in STATUS_MAPPING.
 */
function getUniqueTargetSheetNames() {
  return [...new Set(Object.values(STATUS_MAPPING))];
}

/**
 * Applies modifications to rowData before it's moved.
 * Includes logic for:
 *  - Fallback job number generation for "📝 Planning" rows.
 *  - Setting a completion timestamp if moving to "✅ Complete".
 *  - Generating a review link if moving to "👀 Review" or "✅ Complete" and link is missing/invalid.
 * @param {Array} rowData The data of the row being considered.
 * @param {String} sourceSheetName The name of the sheet the row is currently in.
 * @param {String} targetSheetName The name of the sheet the row is intended for.
 * @param {Object} jobCounterMap The map of job counters.
 * @return {Object} An object indicating if the row should move, the modified data, 
 *                  and any instructions for updating the source sheet if not moved.
 *                  { shouldMove: boolean, modifiedRowData: Array|null, updateSourceInstruction: Object|null }
 */
function applyPreMoveModifications(rowData, sourceSheetName, targetSheetName, jobCounterMap) {
  let modifiedRowData = [...rowData]; // Start with a copy

  // --- Job Number Generation Logic (Fallback for "📝 Planning") ---
  if (
    sourceSheetName === CONFIG.PLANNING_SHEET_NAME &&
    targetSheetName !== CONFIG.PLANNING_SHEET_NAME &&
    (modifiedRowData[CONFIG.JOB_NUMBER_COLUMN_INDEX] === "" || modifiedRowData[CONFIG.JOB_NUMBER_COLUMN_INDEX] == null)
  ) {
    console.warn(
      `APM: Fallback Job number generation for row from "${CONFIG.PLANNING_SHEET_NAME}" ` +
      `(status: ${rowData[CONFIG.STATUS_COLUMN_INDEX]}). Col C: '${rowData[CONFIG.CLIENT_BRAND_COLUMN_INDEX]}', Col V: '${rowData[CONFIG.JOB_NUMBER_COLUMN_INDEX]}'`
    );

    const clientBrand = modifiedRowData[CONFIG.CLIENT_BRAND_COLUMN_INDEX];
    if (clientBrand && typeof clientBrand === 'string' && clientBrand.trim() !== "") {
      const normalizedClientBrandKey = String(clientBrand)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

      const nextJobNum = generateNextJobNumber(jobCounterMap, normalizedClientBrandKey);
      if (nextJobNum !== null) {
        modifiedRowData[CONFIG.JOB_NUMBER_COLUMN_INDEX] = nextJobNum;
        console.log(
          `APM: Assigned job number ${nextJobNum} (fallback) to row for client brand ` +
          `'${normalizedClientBrandKey}'.`
        );
      } else {
        console.warn(
          `APM: Could not generate job number (fallback) for client brand ` +
          `'${normalizedClientBrandKey}'.`
        );
      }
    } else {
      console.warn(
        `APM: Client brand in Col C is empty/invalid for fallback job number generation.`
      );
    }
  }

  // --- Completion Timestamp Logic ---
  if (targetSheetName === CONFIG.COMPLETED_SHEET_NAME) {
    if (
      modifiedRowData[CONFIG.COMPLETED_DATE_COLUMN_INDEX] === "" ||
      modifiedRowData[CONFIG.COMPLETED_DATE_COLUMN_INDEX] == null
    ) {
      const now = new Date();
      modifiedRowData[CONFIG.COMPLETED_DATE_COLUMN_INDEX] = now;
      console.log(
        `APM: Set completion date in Col Y for row moving to "${targetSheetName}".`
      );
    }
  }

  // --- Review Link Generation Logic ---
  if (
    targetSheetName === CONFIG.REVIEW_SHEET_NAME ||
    targetSheetName === CONFIG.COMPLETED_SHEET_NAME
  ) {
    const currentReviewLink = modifiedRowData[CONFIG.REVIEW_LINK_COLUMN_INDEX];
    let needsLinkGeneration = true;

    if (currentReviewLink && typeof currentReviewLink === 'string') {
      if (
        currentReviewLink.startsWith(CONFIG.URL_PREFIX_ICONIK) ||
        currentReviewLink.startsWith(CONFIG.URL_PREFIX_MARPIPE)
      ) {
        needsLinkGeneration = false;
      }
    }

    if (needsLinkGeneration) {
      console.log(
        `APM: Review link in Col W for row moving to "${targetSheetName}" is empty or invalid ('${currentReviewLink}'). Attempting generation.`
      );
      const queryValue = modifiedRowData[CONFIG.REVIEW_LINK_QUERY_COLUMN_INDEX]; // Value from Column B

      if (queryValue && typeof queryValue === 'string' && queryValue.trim() !== "") {
        console.log(`APM: Calling iconikSearch with query: '${queryValue}'`);

        const cache = CacheService.getScriptCache();
        const cacheKey = 'iconikLink_' + queryValue.trim().replace(/\s+/g, '_');
        let newLink = cache.get(cacheKey);
        let fetchedFromApi = false;

        if (newLink === null) { // Cache miss
          console.log(`APM: Link for query '${queryValue}' not found in cache. Calling API.`);
          newLink = iconikSearch(queryValue.trim()); // Assume iconikSearch might return null/undefined/error string or valid URL
          fetchedFromApi = true;

          if (newLink && typeof newLink === 'string' && (newLink.toLowerCase().startsWith('http://') || newLink.toLowerCase().startsWith('https://'))) {
            cache.put(cacheKey, newLink, 21600); // Cache for 6 hours
            console.log(`APM: API returned link: '${newLink}'. Cached for 6 hours.`);
          } else {
            console.warn(`APM: API call for query '${queryValue}' returned non-URL or error: '${newLink}'. Not caching this result.`);
          }
        } else { // Cache hit
          console.log(`APM: Link for query '${queryValue}' found in cache: '${newLink}'`);
        }

        const isValidUrlForMove = newLink && typeof newLink === 'string' &&
                               (newLink.startsWith(CONFIG.URL_PREFIX_ICONIK) ||
                                newLink.startsWith(CONFIG.URL_PREFIX_MARPIPE) ||
                                newLink.toLowerCase().startsWith('http'));

        if (isValidUrlForMove) {
          modifiedRowData[CONFIG.REVIEW_LINK_COLUMN_INDEX] = newLink;
          console.log(`APM: Set review link in Col W to: '${newLink}'. Row will be moved with this link.`);
        } else {
          // Iconik search failed to return a usable URL
          const noAssetsMessage = "No assets found in Iconik";
          console.warn(
            `APM: Failed to generate or retrieve a valid review link for query '${queryValue}'. ` +
            (fetchedFromApi ? "API" : "Cache") + ` provided: '${newLink}'. ` +
            `Signaling to update source Col W with "${noAssetsMessage}" and SKIP MOVE.`
          );
          return { // Early exit: Do not move, update source sheet instead
            shouldMove: false,
            modifiedRowData: null,
            updateSourceInstruction: {
              columnIndex: CONFIG.REVIEW_LINK_COLUMN_INDEX, // 0-based
              value: noAssetsMessage
            }
          };
        }
      } else {
        console.warn(
          `APM: Query value in Col B (for review link generation) is empty or invalid for row moving to "${targetSheetName}". Col W remains unchanged.`
        );
      }
    }
  }

  // If we reached here, all modifications are done, or link generation path decided to proceed with a move.
  return {
    shouldMove: true,
    modifiedRowData: modifiedRowData,
    updateSourceInstruction: null
  };
}

// ===== CORE LOGIC =====

/**
 * Main function to process row movements.
 * Implements a two-pass system:
 * Pass 1: Pre-fills job numbers in the "📝 Planning" sheet for rows that will move.
 * Pass 2: Reads data (now with updated array formulas) and moves rows or updates source rows.
 */
function processSheetMoves() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  console.log("--- Process Sheet Moves: START ---");

  const dataSheet = ss.getSheetByName(CONFIG.DATA_SHEET_NAME);
  let jobCounterMap = {};
  if (dataSheet) {
    jobCounterMap = getJobCounterMap(dataSheet, true); // Assuming your getJobCounterMap takes a boolean flag
    console.log(`Job Counter Map initialized with ${Object.keys(jobCounterMap).length} entries from "${CONFIG.DATA_SHEET_NAME}".`);
  } else {
    console.error(`CRITICAL: "Data" sheet named "${CONFIG.DATA_SHEET_NAME}" not found. Job number generation will likely fail or be skipped.`);
  }

  generateAndWriteJobNumbersForPlanning(ss, jobCounterMap);

  console.log("\n--- Starting Pass 2: Reading Data, Determining Moves/Updates ---");
  const allSheetNamesInMapping = getUniqueTargetSheetNames();
  console.log("Pass 2: Processing sheets for moves/updates: " + allSheetNamesInMapping.join(", "));

  const dataToAppendByTarget = {};
  const indicesToDeleteBySource = {};
  const webhookPayloads = [];
  const sourceUpdatesBySheet = {};

  // --- Pass 2, Step 1: READ PHASE (Collect all data and determine moves/updates) ---
  allSheetNamesInMapping.forEach(sourceSheetName => {
    const sourceSheet = ss.getSheetByName(sourceSheetName);
    if (!sourceSheet) {
      console.warn(`Pass 2: Sheet "${sourceSheetName}" not found. Skipping.`);
      return;
    }

    const lastRow = sourceSheet.getLastRow();
    if (lastRow <= CONFIG.HEADER_ROWS) {
      // console.log(`Pass 2: Sheet "${sourceSheetName}" has no data rows beyond headers. Skipping.`); // Optional: more verbose logging
      return;
    }

    const range = sourceSheet.getRange(
      CONFIG.HEADER_ROWS + 1, 1,
      lastRow - CONFIG.HEADER_ROWS, CONFIG.TOTAL_COLUMNS
    );
    const values = range.getValues();
    const notes = range.getNotes();

    for (let i = 0; i < values.length; i++) {
      let currentRowData = values[i];
      const status = currentRowData[CONFIG.STATUS_COLUMN_INDEX];
      const currentNoteN = notes[i][CONFIG.NOTE_COLUMN_INDEX];
      const sheetRowIndex = i + CONFIG.HEADER_ROWS + 1;

      if (!status || String(status).trim() === "") { // Ensure status is not empty or just whitespace
        // console.log(`Pass 2: Row ${sheetRowIndex} in "${sourceSheetName}" has no status. Skipping.`); // Optional verbose log
        continue;
      }
      const intendedTargetSheetName = getTargetSheetName(status);
      if (!intendedTargetSheetName) {
        // console.log(`Pass 2: Row ${sheetRowIndex} in "${sourceSheetName}" has status "${status}" with no target sheet mapping. Skipping.`); // Optional
        continue;
      }

      if (intendedTargetSheetName !== sourceSheetName) {
        const modificationResult = applyPreMoveModifications(
          [...currentRowData],
          sourceSheetName,
          intendedTargetSheetName,
          jobCounterMap
        );

        if (!modificationResult.shouldMove) {
          if (modificationResult.updateSourceInstruction) {
            const instruction = modificationResult.updateSourceInstruction;
            if (!sourceUpdatesBySheet[sourceSheetName]) {
              sourceUpdatesBySheet[sourceSheetName] = [];
            }
            sourceUpdatesBySheet[sourceSheetName].push({
              rowIndexOnSheet: sheetRowIndex,
              columnIndexOnSheet: instruction.columnIndex + 1,
              value: instruction.value
            });
            // console.log(`Pass 2: Row ${sheetRowIndex} in "${sourceSheetName}" will NOT be moved. Queued update for Col ${instruction.columnIndex + 1} with value "${instruction.value}".`);
          } else {
            // console.log(`Pass 2: Row ${sheetRowIndex} in "${sourceSheetName}" will NOT be moved (no source update instruction).`);
          }
          continue;
        }

        const finalRowDataForMove = modificationResult.modifiedRowData;

        if (!dataToAppendByTarget[intendedTargetSheetName]) {
          dataToAppendByTarget[intendedTargetSheetName] = [];
        }
        dataToAppendByTarget[intendedTargetSheetName].push({
          values: finalRowDataForMove,
          noteN: currentNoteN
        });

        if (!indicesToDeleteBySource[sourceSheetName]) {
          indicesToDeleteBySource[sourceSheetName] = [];
        }
        indicesToDeleteBySource[sourceSheetName].push(sheetRowIndex);

        // Webhook payload collection
        webhookPayloads.push({
            sourceSheetName: sourceSheetName,
            targetSheetName: intendedTargetSheetName,
            rowData: finalRowDataForMove
        });
      }
    }
  });

  // --- Pass 2, Step 1.5: APPLY UPDATES TO SOURCE SHEETS ---
  let sourceUpdatesAppliedCount = 0;
  for (const sheetNameToUpdate in sourceUpdatesBySheet) {
    const sheetForUpdate = ss.getSheetByName(sheetNameToUpdate);
    if (!sheetForUpdate) {
      console.warn(`Pass 2: Source sheet "${sheetNameToUpdate}" not found for applying cell updates. Skipping.`);
      continue;
    }
    const updatesForThisSheet = sourceUpdatesBySheet[sheetNameToUpdate];
    if (!updatesForThisSheet || updatesForThisSheet.length === 0) continue;

    console.log(`Pass 2: Applying ${updatesForThisSheet.length} source cell updates to "${sheetNameToUpdate}".`);
    updatesForThisSheet.forEach(update => {
      try {
        sheetForUpdate.getRange(update.rowIndexOnSheet, update.columnIndexOnSheet).setValue(update.value);
        sourceUpdatesAppliedCount++;
      } catch (e) {
        console.error(`Pass 2: Error applying update to "${sheetNameToUpdate}", row ${update.rowIndexOnSheet}, col ${update.columnIndexOnSheet}: ${e.toString()}`);
      }
    });
  }
  if (sourceUpdatesAppliedCount > 0) {
    console.log(`Pass 2: Applied ${sourceUpdatesAppliedCount} updates to source sheets. Flushing.`);
    SpreadsheetApp.flush();
  } else {
    console.log(`Pass 2: No source cell updates were applied.`);
  }

  // --- Pass 2, Step 2: WRITE PHASE (Append rows to target sheets) ---
  const sheetsThatReceivedRows = new Set();
  for (const targetSheetName in dataToAppendByTarget) {

    const targetSheet = ss.getSheetByName(targetSheetName);
    if (!targetSheet) {
      console.warn(`Pass 2: Target sheet "${targetSheetName}" not found for appending. Skipping.`);
      continue;
    }

    const rowsToAdd = dataToAppendByTarget[targetSheetName];
    if (!rowsToAdd || rowsToAdd.length === 0) {
        console.log(`Pass 2: No rows to add to "${targetSheetName}" (rowsToAdd is empty or null). Skipping append for this sheet.`);
        continue;
    }

    console.log(`Pass 2: Appending ${rowsToAdd.length} rows to "${targetSheetName}".`);

    const IGNORED_COL_INDEX = CONFIG.IGNORED_COLUMN_INDEX;
    const NUM_COLS_LEFT_OF_IGNORED = IGNORED_COL_INDEX;
    const NUM_COLS_RIGHT_OF_IGNORED = CONFIG.TOTAL_COLUMNS - IGNORED_COL_INDEX - 1;
    const appendStartRow = targetSheet.getLastRow() + 1;

    if (NUM_COLS_LEFT_OF_IGNORED > 0) {
      const leftBlockValues = rowsToAdd.map(r => r.values.slice(0, NUM_COLS_LEFT_OF_IGNORED));
      targetSheet
        .getRange(appendStartRow, 1, leftBlockValues.length, NUM_COLS_LEFT_OF_IGNORED)
        .setValues(leftBlockValues);
    }

    if (NUM_COLS_RIGHT_OF_IGNORED > 0) {
      const rightBlockValues = rowsToAdd.map(r => r.values.slice(IGNORED_COL_INDEX + 1));
      targetSheet
        .getRange(
          appendStartRow,
          IGNORED_COL_INDEX + 2,
          rightBlockValues.length,
          NUM_COLS_RIGHT_OF_IGNORED
        )
        .setValues(rightBlockValues);
    }

    const notesForColN = rowsToAdd.map(r => [r.noteN]);
    if (notesForColN.some(n => n[0] !== "" && n[0] != null)) { // Check for non-empty and non-null notes
      targetSheet
        .getRange(
          appendStartRow,
          CONFIG.NOTE_COLUMN_INDEX + 1,
          notesForColN.length,
          1
        )
        .setNotes(notesForColN);
    }
    sheetsThatReceivedRows.add(targetSheetName);
  }
  if (sheetsThatReceivedRows.size === 0 && Object.keys(dataToAppendByTarget).length > 0) {
      console.log("Pass 2: WRITE PHASE completed, but no rows were actually appended to any target sheets despite data being queued. Check individual sheet logs.");
  } else if (sheetsThatReceivedRows.size === 0) {
      console.log("Pass 2: WRITE PHASE completed. No data was queued for appending to any target sheets.");
  }

  // --- Pass 2, Step 3: DELETE PHASE (Remove rows from source sheets) ---
  let totalRowsDeleted = 0;
  for (const sourceSheetName_forDelete in indicesToDeleteBySource) {
    const sourceSheetForDelete = ss.getSheetByName(sourceSheetName_forDelete);
    if (!sourceSheetForDelete) {
      console.error(`Pass 2: Source sheet "${sourceSheetName_forDelete}" for deletion not found. Skipping.`);
      continue;
    }
    const rowIndices = indicesToDeleteBySource[sourceSheetName_forDelete];
    if (!rowIndices || rowIndices.length === 0) {
        console.log(`Pass 2: No row indices queued for deletion from "${sourceSheetName_forDelete}". Skipping.`);
        continue;
    }
    
    // Sort indices in descending order to prevent shifting issues
    rowIndices.sort((a, b) => b - a); 
    console.log(`Pass 2: Deleting ${rowIndices.length} rows from "${sourceSheetName_forDelete}". Indices: ${rowIndices.join(', ')}`);
    rowIndices.forEach(rowIndex => {
        try {
            sourceSheetForDelete.deleteRow(rowIndex);
            totalRowsDeleted++;
        } catch (e) {
            console.error(`Pass 2: Error deleting row ${rowIndex} from "${sourceSheetName_forDelete}": ${e.toString()}`);
        }
    });
  }
  if (totalRowsDeleted > 0) {
      console.log(`Pass 2: DELETE PHASE completed. Total rows deleted: ${totalRowsDeleted}.`);
  } else if (Object.keys(indicesToDeleteBySource).length > 0) {
      console.log("Pass 2: DELETE PHASE completed, but no rows were actually deleted despite indices being queued. Check individual sheet logs.");
  } else {
      console.log("Pass 2: DELETE PHASE completed. No rows were queued for deletion from any source sheets.");
  }


  // --- Finalize Job Counter Updates ---
  if (dataSheet) {
    updateJobCounterSheet(dataSheet, jobCounterMap); // This function has its own logging
  }

  // --- Send Webhook Notifications ---
  if (webhookPayloads.length > 0) {
    if (shouldSendWebhooks()) { // shouldSendWebhooks handles its own logging if false
        console.log(`\nFinalizing: Preparing to send ${webhookPayloads.length} webhook notifications...`);
        sendNotifications(webhookPayloads);
    } else {
        // shouldSendWebhooks already logged why it returned false.
        console.log(`\nFinalizing: Webhook notifications will NOT be sent for this execution (check logs from shouldSendWebhooks). Payloads collected: ${webhookPayloads.length}`);
    }
  } else {
      console.log("\nFinalizing: No webhook payloads collected to send, so no notifications will be processed.");
  }

  // --- Sort Target Sheets that Received Rows ---
  if (sheetsThatReceivedRows.size > 0) {
    console.log(`\nFinalizing: Sorting ${sheetsThatReceivedRows.size} target sheet(s) that received new rows: ${Array.from(sheetsThatReceivedRows).join(', ')}`);
    sheetsThatReceivedRows.forEach(sheetName => {
      console.log(`Sorting sheet: "${sheetName}"`);
      try {
        sortSheet(sheetName); // sortSheet has its own logging
      } catch (e) {
        console.error(`Error during call to sortSheet for "${sheetName}": ${e.toString()} ${e.stack || ''}`);
      }
    });
    console.log("Finished sorting affected target sheets.");
  } else {
    console.log("\nFinalizing: No target sheets received new rows, skipping sort.");
  }

  SpreadsheetApp.flush(); // Final flush for any pending changes like sorting
  console.log("\n--- Process Sheet Moves: COMPLETE ---");
}

function getJobCounterMap(dataSheet) {
    const map = {};
    if (!dataSheet) {
        Logger.log(`Data sheet ('${CONFIG.DATA_SHEET_NAME}') not found for Job Counter Map. Returning empty map.`);
        return map;
    }
    
    Logger.log(`Reading Job Counter Map from sheet: '${dataSheet.getName()}'`);
    try {
        const lastRow = dataSheet.getLastRow();
        if (lastRow < CONFIG.HEADER_ROWS + 1) { // Assuming data starts on row 2, so need at least 2 rows (1 header, 1 data)
            Logger.log(`Data sheet '${dataSheet.getName()}' has no data rows (lastRow=${lastRow}, headerRows=${CONFIG.HEADER_ROWS}). Returning empty map.`);
            return map;
        }

        const keyColIndex = CONFIG.JOB_COUNTER_DATA_COLUMN_INDEX_IN_DATA_SHEET; // 0-based
        const valColIndex = CONFIG.JOB_COUNTER_VALUE_COLUMN_INDEX_IN_DATA_SHEET; // 0-based

        // Check if configured columns are valid before trying to access them
        if (keyColIndex + 1 > dataSheet.getMaxColumns() || valColIndex + 1 > dataSheet.getMaxColumns()) {
             Logger.log(`ERROR: Configured counter key column (${keyColIndex + 1}) or value column (${valColIndex + 1}) ` +
                        `exceeds max columns (${dataSheet.getMaxColumns()}) in sheet '${dataSheet.getName()}'. Cannot build map.`);
             return map;
        }
        
        const numDataRows = lastRow - CONFIG.HEADER_ROWS;
        if (numDataRows <= 0) {
            Logger.log(`Data sheet '${dataSheet.getName()}' has no actual data rows after headers (numDataRows=${numDataRows}). Returning empty map.`);
            return map;
        }

        // Define keyRange and valueRange here, ensuring they are in scope
        const keyRangeValues = dataSheet.getRange(CONFIG.HEADER_ROWS + 1, keyColIndex + 1, numDataRows, 1).getValues();
        const counterValues = dataSheet.getRange(CONFIG.HEADER_ROWS + 1, valColIndex + 1, numDataRows, 1).getValues();

        keyRangeValues.forEach((row, index) => {
            let rawClientBrandKey = row[0]; // Value from the key column

            // Ensure it's a string and not empty after basic trim before further normalization
            if (rawClientBrandKey !== null && rawClientBrandKey !== undefined && String(rawClientBrandKey).trim() !== "") {
                 let normalizedKey = String(rawClientBrandKey)
                                     .trim()
                                     .toLowerCase() 
                                     .replace(/\s+/g, ' '); 
                                     // .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Optional: if needed

                 if (normalizedKey === "") { // Can happen if original key was just spaces
                     Logger.log(`Skipping row ${index + CONFIG.HEADER_ROWS + 1} in Data sheet: Key became empty after normalization (Original: '${rawClientBrandKey}').`);
                     return; // Skips this iteration of forEach
                 }

                 if (map.hasOwnProperty(normalizedKey)) {
                     Logger.log(`Warning: Duplicate NORMALISED Key found in Data sheet ('${dataSheet.getName()}'): '${normalizedKey}' (original: '${rawClientBrandKey}') at row ${index + CONFIG.HEADER_ROWS + 1}. Overwriting with later row's counter.`);
                 }
                 
                 const counterCellContent = counterValues[index][0];
                 const counter = parseInt(counterCellContent, 10);
                 
                 map[normalizedKey] = {
                     counter: isNaN(counter) ? 0 : counter, // Default to 0 if counter is not a number
                     rowIndex: index + CONFIG.HEADER_ROWS + 1, // Actual sheet row index (1-based)
                     updated: false // Initialize updated flag
                 };

                 if (isNaN(counter) && String(counterCellContent).trim() !== "") { // Log only if it was non-empty but not a number
                     Logger.log(`Warning: Invalid counter value '${counterCellContent}' for NORMALISED key '${normalizedKey}' (original: '${rawClientBrandKey}') at row ${index + CONFIG.HEADER_ROWS + 1} in '${dataSheet.getName()}'. Using 0.`);
                 }
            } else {
            }
        });
        Logger.log(`Successfully read Job Counter Map from '${dataSheet.getName()}' with ${Object.keys(map).length} valid entries.`);
    } catch (e) {
        // Log the full error, including stack, for better debugging
        Logger.log(`CRITICAL ERROR reading Job Counter Map from '${dataSheet.getName()}': ${e.toString()} AT ${e.stack || 'no stack'}. Returning empty map.`);
    }
    return map; // map will be empty if try block fails catastrophically
}

/**
 * Generates the next job number by returning the current counter value
 * and then incrementing the counter IN THE MAP for the next use.
 * @param {Object} jobCounterMap The map of client brands to counter objects.
 * @param {String} clientBrand The client brand key.
 * @return {Number|null} The job number to use, or null if not found/error.
 */
function generateNextJobNumber(jobCounterMap, clientBrand) {
    if (typeof clientBrand !== 'string' || String(clientBrand).trim() === "") { // Ensure string before trim
         Logger.log(`generateNextJobNumber PRE-CHECK FAILED: clientBrand is not a non-empty string or is invalid ('${clientBrand}')`);
         return null;
    }
    const normalizedLookupKey = String(clientBrand)
                               .trim()
                               .toLowerCase()
                               .replace(/\s+/g, ' ');

    if (jobCounterMap.hasOwnProperty(normalizedLookupKey)) {
        const numberToUse = jobCounterMap[normalizedLookupKey].counter; 
        jobCounterMap[normalizedLookupKey].counter += 1;                
        jobCounterMap[normalizedLookupKey].updated = true; // Mark this entry as updated
        Logger.log(`generateNextJobNumber SUCCESS: For NORMALISED key '${normalizedLookupKey}' (original passed: '${clientBrand}'). Number to use: ${numberToUse}. Incremented map counter to ${jobCounterMap[normalizedLookupKey].counter}. Marked for update.`);
        return numberToUse; 
    } else {
        Logger.log(`generateNextJobNumber FAILED: NORMALISED Key '${normalizedLookupKey}' (original passed: '${clientBrand}') not found in map.`);
        return null;
    }
}

/**
 * PASS 1: Iterates through the "📝 Planning" sheet. If a row is set to move out
 * and its Job Number (Col V) is empty, generates a job number and writes it
 * directly to Column V of the "📝 Planning" sheet.
 * This allows array formulas dependent on Column V to recalculate before Pass 2.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet The active spreadsheet object.
 * @param {Object} jobCounterMap The map of client brands to counter objects.
 */
function generateAndWriteJobNumbersForPlanning(spreadsheet, jobCounterMap) {
  console.log("--- Starting Pass 1: Generating and Writing Job Numbers for '📝 Planning' Sheet ---");
  const planningSheet = spreadsheet.getSheetByName(CONFIG.PLANNING_SHEET_NAME);

  if (!planningSheet) {
    console.warn(`Pass 1: Sheet "${CONFIG.PLANNING_SHEET_NAME}" not found. Skipping job number pre-fill.`);
    return; 
  }

  const lastRow = planningSheet.getLastRow();
  if (lastRow <= CONFIG.HEADER_ROWS) {
    console.log(`Pass 1: Sheet "${CONFIG.PLANNING_SHEET_NAME}" has no data rows beyond headers. Skipping.`);
    return; 
  }

  const maxColForRead = Math.max(
    CONFIG.STATUS_COLUMN_INDEX,
    CONFIG.CLIENT_BRAND_COLUMN_INDEX,
    CONFIG.JOB_NUMBER_COLUMN_INDEX
  ) + 1;
  const range = planningSheet.getRange(
    CONFIG.HEADER_ROWS + 1,
    1,
    lastRow - CONFIG.HEADER_ROWS,
    maxColForRead
  );
  const values = range.getValues();
  let jobNumbersWrittenThisPass = 0;

  console.log(`Pass 1: Processing ${values.length} rows from "${CONFIG.PLANNING_SHEET_NAME}".`);

  for (let i = 0; i < values.length; i++) {
    const currentRowDataInSheet = values[i]; 
    const status = currentRowDataInSheet[CONFIG.STATUS_COLUMN_INDEX];
    const currentJobNumberInSheet = currentRowDataInSheet[CONFIG.JOB_NUMBER_COLUMN_INDEX];
    const clientBrandInSheet = currentRowDataInSheet[CONFIG.CLIENT_BRAND_COLUMN_INDEX];
    
    const intendedTargetSheetName = getTargetSheetName(status);

    if (
      intendedTargetSheetName &&
      intendedTargetSheetName !== CONFIG.PLANNING_SHEET_NAME &&
      (currentJobNumberInSheet === "" || currentJobNumberInSheet == null) &&
      clientBrandInSheet && typeof clientBrandInSheet === 'string' && String(clientBrandInSheet).trim() !== ""
    ) {

      let normalizedClientBrandKey = String(clientBrandInSheet)
                                     .trim()
                                     .toLowerCase()
                                     .replace(/\s+/g, ' ');
      
      if (!jobCounterMap.hasOwnProperty(normalizedClientBrandKey)) {
        console.error(`Pass 1 ERROR: NormalizedClientBrandKey '${normalizedClientBrandKey}' (from original '${clientBrandInSheet}') not found in jobCounterMap for row index ${i}. Skipping job# generation for this row.`);
        continue; 
      }

      const nextJobNumToUse = generateNextJobNumber(jobCounterMap, normalizedClientBrandKey); 

      if (nextJobNumToUse !== null) {
        const sheetRowIndex = i + CONFIG.HEADER_ROWS + 1; 
        try {
          planningSheet.getRange(sheetRowIndex, CONFIG.JOB_NUMBER_COLUMN_INDEX + 1).setValue(nextJobNumToUse);
          jobNumbersWrittenThisPass++;
          console.log(`Pass 1: Wrote job number ${nextJobNumToUse} to "${CONFIG.PLANNING_SHEET_NAME}" sheet, row ${sheetRowIndex}, for client '${normalizedClientBrandKey}'.`);
        } catch (e) {
          console.error(`Pass 1: Error writing job number ${nextJobNumToUse} to "${CONFIG.PLANNING_SHEET_NAME}", row ${sheetRowIndex} for client '${normalizedClientBrandKey}'. Error: ${e.toString()}`);
        }
      } else {
        console.warn(`Pass 1: Could not generate job number for client '${normalizedClientBrandKey}' (from sheet value '${clientBrandInSheet}', row ${i + CONFIG.HEADER_ROWS + 1}). generateNextJobNumber returned null.`);
      }
    }
  }

  if (jobNumbersWrittenThisPass > 0) {
    SpreadsheetApp.flush(); 
    console.log(`Pass 1: Flushed ${jobNumbersWrittenThisPass} job number update(s) to "${CONFIG.PLANNING_SHEET_NAME}".`);
  } else {
    console.log(`Pass 1: No job numbers needed to be written to "${CONFIG.PLANNING_SHEET_NAME}".`);
  }
  console.log("--- Finished Pass 1: Job Number Pre-fill for '📝 Planning' Sheet ---");
}

/**
 * Writes the updated counters back to the "Data" sheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dataSheet The "Data" sheet object.
 * @param {Object} jobCounterMap The map of client brands to counter objects.
 */
function updateJobCounterSheet(dataSheet, jobCounterMap) {
    if (!dataSheet) {
        Logger.log(`Data sheet ('${CONFIG.DATA_SHEET_NAME}') not found. Cannot update job counters.`);
        return;
    }
    let updates = [];
    for (const clientBrand in jobCounterMap) {
        if (jobCounterMap[clientBrand].updated === true) { // Check the 'updated' flag
            updates.push({
                rowIndex: jobCounterMap[clientBrand].rowIndex, 
                value: jobCounterMap[clientBrand].counter
            });
            jobCounterMap[clientBrand].updated = false; // Reset flag after collecting
        }
    }

    if (updates.length === 0) {
        // Logger.log(`No job counter updates needed for '${dataSheet.getName()}'.`);
        return; 
    }

    Logger.log(`Attempting to update ${updates.length} job counters in '${dataSheet.getName()}'...`);
    updates.sort((a, b) => a.rowIndex - b.rowIndex); 

    const sheetLock = LockService.getScriptLock();
    let lockAcquired = false;
    try {
        lockAcquired = sheetLock.tryLock(20000); 
        if (!lockAcquired) {
             Logger.log(`Could not obtain lock to update Job Counter Sheet ('${dataSheet.getName()}'). Updates skipped.`);
             return;
        }

        let successCount = 0;
        updates.forEach(update => {
            try {
                dataSheet.getRange(update.rowIndex, CONFIG.JOB_COUNTER_VALUE_COLUMN_INDEX_IN_DATA_SHEET + 1)
                         .setValue(update.value);
                successCount++;
            } catch (e) {
                Logger.log(`ERROR writing counter update for row ${update.rowIndex} (value ${update.value}) in '${dataSheet.getName()}': ${e}`);
            }
        });
        Logger.log(`Successfully updated ${successCount} out of ${updates.length} job counters in '${dataSheet.getName()}'.`);
    } catch (e) {
        Logger.log(`Unexpected ERROR during Job Counter update for '${dataSheet.getName()}': ${e}`);
    } finally {
       if (lockAcquired) {
           sheetLock.releaseLock();
       }
    }
}

/**
 * Determines if webhook notifications should be sent based on global config and sheet ID.
 * @return {boolean} True if notifications should be sent, false otherwise.
 */
function shouldSendWebhooks() {
  if (!CONFIG.SEND_WEBHOOK_NOTIFICATIONS) {
    console.log("shouldSendWebhooks: Global SEND_WEBHOOK_NOTIFICATIONS is false. Webhooks disabled.");
    return false;
  }
  const currentSpreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  if (currentSpreadsheetId === CONFIG.PRODUCTION_SPREADSHEET_ID) {
    // console.log("shouldSendWebhooks: Current sheet is the production sheet. Webhooks allowed (if payloads exist)."); // Can be verbose
    return true;
  } else {
    console.log(`shouldSendWebhooks: Current sheet ID '${currentSpreadsheetId}' is NOT the production sheet ID '${CONFIG.PRODUCTION_SPREADSHEET_ID}'. Webhooks disabled for this sheet.`);
    return false;
  }
}

/**
 * Sends notifications via webhook.
 * @param {Array<Object>} payloads Array of payload objects.
 * @param {boolean} isEnabled A flag to enable/disable sending.
 */
function sendNotifications(payloads) {

  if (!Array.isArray(payloads) || payloads.length === 0) {
      Logger.log("No valid notification payloads to send.");
      return;
  }
  if (typeof CONFIG.WEBHOOK_URL !== 'string' || !CONFIG.WEBHOOK_URL.toLowerCase().startsWith('http')) {
      Logger.log("CONFIG.WEBHOOK_URL is not configured correctly. Cannot send notifications.");
      return;
  }

  Logger.log(`Sending ${payloads.length} notifications to webhook: ${CONFIG.WEBHOOK_URL}`);

  payloads.forEach((payload, index) => {
      if (!payload || typeof payload !== 'object' || !payload.rowData || !payload.sourceSheetName || !payload.targetSheetName) {
          Logger.log(`Skipping notification ${index + 1}/${payloads.length}: Invalid payload structure for webhook.`);
          return; 
      }

      try {
          const n8nPayload = {
              eventType: "rowMoved",
              sourceSheet: payload.sourceSheetName,
              targetSheet: payload.targetSheetName,
              jobId: payload.rowData[CONFIG.WEBHOOK_JOB_ID_COLUMN_INDEX] !== undefined ? 
                     payload.rowData[CONFIG.WEBHOOK_JOB_ID_COLUMN_INDEX] : "N/A",
              rowData: payload.rowData,
          };
          const options = {
              method: "post",
              contentType: "application/json",
              payload: JSON.stringify(n8nPayload),
              muteHttpExceptions: true 
          };

          Logger.log(`Sending webhook ${index + 1}/${payloads.length} for Job ID '${n8nPayload.jobId}'...`);
          const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
          const responseCode = response.getResponseCode();
          
          if (responseCode >= 200 && responseCode < 300) {
            // Successful send, no detailed log needed unless debugging
          } else {
            Logger.log(`Webhook ${index + 1}/${payloads.length} for Job ID '${n8nPayload.jobId}' encountered an issue. Response code: ${responseCode}. Response: ${response.getContentText().substring(0, 500)}`);
          }
      } catch (error) {
          const jobIdForError = payload.rowData && payload.rowData[CONFIG.WEBHOOK_JOB_ID_COLUMN_INDEX] !== undefined ? 
                                payload.rowData[CONFIG.WEBHOOK_JOB_ID_COLUMN_INDEX] : "UNKNOWN_JOB_ID";
          Logger.log(`Failed to send webhook ${index + 1}/${payloads.length} for Job ID ${jobIdForError}: ${error.toString()}`);
          if (error.stack) Logger.log(`Stack Trace: ${error.stack}`);
      }
  });
  Logger.log(`Finished sending ${payloads.length} webhook notifications.`);
}

/**
 * Sorts a given sheet based on predefined rules.
 * Assumes header row is 1, data starts row 2.
 * @param {string} sheetName The name of the sheet to sort.
 */
function sortSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    console.error(`sortSheet: Sheet not found for sorting: "${sheetName}"`);
    return; 
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  // Ensure the sheet has data beyond the header row
  if (lastRow > CONFIG.HEADER_ROWS) { // Using CONFIG.HEADER_ROWS for consistency
    let rangeToSort; // Use a different variable name to avoid confusion if range is used later
    const numDataRows = lastRow - CONFIG.HEADER_ROWS;

    try {
      console.log(`sortSheet: Attempting to sort "${sheetName}". Data rows: ${numDataRows}, Last Col: ${lastColumn}`);
      rangeToSort = sheet.getRange(CONFIG.HEADER_ROWS + 1, 1, numDataRows, lastColumn);

      switch(sheetName) {
        case CONFIG.PLANNING_SHEET_NAME: // "📝 Planning"
          rangeToSort.sort({column: 2, ascending: false}); // Sort Z-A based on sheet column B
          console.log(`sortSheet: Sorted "${sheetName}" by Col B (2) DESC.`);
          break;
        case "🧑‍💻 In Progress": // Using literal name as it's specific to sort logic here
          // Sort by secondary key first (Col D ASC), then primary key (Col A DESC)
          rangeToSort.sort({column: 4, ascending: true});  // Col D ASC
          rangeToSort.sort({column: 1, ascending: false}); // Col A DESC
          console.log(`sortSheet: Sorted "${sheetName}" by Col D (4) ASC, then Col A (1) DESC.`);
          break;
        case CONFIG.REVIEW_SHEET_NAME: // "👀 Review"
          // Sort by secondary key first (Col D ASC), then primary key (Col A DESC)
          rangeToSort.sort({column: 4, ascending: true});  // Col D ASC
          rangeToSort.sort({column: 1, ascending: false}); // Col A DESC
          console.log(`sortSheet: Sorted "${sheetName}" by Col D (4) ASC, then Col A (1) DESC.`);
          break;
        case "🗄️ Archive": // If this sheet is ever a target and needs sorting
          rangeToSort.sort({column: 1, ascending: false}); // Sort Z-A based on sheet column A
          console.log(`sortSheet: Sorted "${sheetName}" by Col A (1) DESC.`);
          break;
        case CONFIG.COMPLETED_SHEET_NAME: // "✅ Complete"
          if (lastColumn >= CONFIG.COMPLETED_DATE_COLUMN_INDEX + 1) { // Ensure Col Y (index 24, so col num 25) exists
            // Sort by Col A DESC, then by Col Y (Completion Date) DESC
            rangeToSort.sort([
              {column: 1, ascending: false},                                  // Sheet Col A
              {column: CONFIG.COMPLETED_DATE_COLUMN_INDEX + 1, ascending: false} // Sheet Col Y
            ]);
            console.log(`sortSheet: Sorted "${sheetName}" by Col A (1) DESC, then Col Y (${CONFIG.COMPLETED_DATE_COLUMN_INDEX + 1}) DESC.`);
          } else {
            console.warn(`sortSheet: Skipped sorting "${sheetName}" by completion date as column ${CONFIG.COMPLETED_DATE_COLUMN_INDEX + 1} (Y) does not exist or sheet has too few columns.`);
            // Fallback to sort by Column A only if Y is not available
            rangeToSort.sort({column: 1, ascending: false});
            console.log(`sortSheet: Sorted "${sheetName}" by Col A (1) DESC (fallback).`);
          }
          break;
        default:
          console.log(`sortSheet: No specific sort configuration for sheet "${sheetName}". Sheet not sorted by this function.`);
      }
    } catch (error) {
      console.error(`sortSheet: Error sorting sheet "${sheetName}". LastRow: ${lastRow}, LastCol: ${lastColumn}. Error: ${error.message} ${error.stack || ''}`);
    }
  } else {
    console.log(`sortSheet: Sheet "${sheetName}" has no data rows to sort (LastRow: ${lastRow}).`);
  }
}