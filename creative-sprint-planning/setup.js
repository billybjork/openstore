function onOpen() {
    var ui = SpreadsheetApp.getUi();
    // Create a new menu titled '⚡'.
    ui.createMenu('⚡')
        .addItem('Create Paid Ads Dash', 'createPaidAdsDash')
        .addSeparator()
        .addItem('Process Status Changes', 'processSheetMoves')
        .addSeparator()
        .addItem('Send Content Drop', 'contentDropNotification')
          .addSeparator()
        .addItem('Send to #launch-tok or #launch-organic', 'launchTokOrganicNotification')
        .addToUi();
  }
  
  function createPaidAdsDash() {
    var dashboardTemplateId = '1PPSHf7-YK-I2TMJZLEWCoag-A_DeGPxvCdhb9k2n_ZM';
    
    // Retrieve the name of the template and replace '[Template]' with '[YourName]'
    var templateName = DriveApp.getFileById(dashboardTemplateId).getName();
    var standardizedName = templateName.replace('[Template]', '[YourName]');
    
    // Create a copy with the new name
    var copy = DriveApp.getFileById(dashboardTemplateId).makeCopy(standardizedName);
    
    // Create and show the dialog with the link to the new copy
    var htmlOutput = HtmlService
      .createHtmlOutput('<p style="font-family: Arial;"><a href="' + copy.getUrl() + '" target="_blank" style="font-family: Arial;">' + copy.getUrl() + '</a></p>')
      .setWidth(500)
      .setHeight(100);
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Your Paid Ads Dash');
  }