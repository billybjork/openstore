var APP_ID2 = '...';
var AUTH_TOKEN2 = '...';
var ICONIK_URL = 'https://app.iconik.io';
var METADATA_VIEW_ID = '...';
var COLLECTION_ID = '...';
var ALLOWED_EXTENSIONS = ['.jpeg', '.jpg', '.mp4', '.mov', '.png', '.gif'];

function setHookWin(query) {
  if (!query) {
    Logger.log('No job name provided. Exiting...');
    return { statusCode: 400, message: 'No job name provided' };  // Return error response if no query
  }

  var cleanedQuery = query;
  
  var assetsData = getAssetsWithMetadata(cleanedQuery);
  var assets = assetsData[0];
  var totalAssets = assetsData[2];
  
  Logger.log('Total assets retrieved: ' + totalAssets);
  
  if (totalAssets == 0) {
    Logger.log('No assets found for query: ' + cleanedQuery);
    return { statusCode: 404, message: 'No assets found for query' };  // Return not found response
  } else {
    var filteredAssets = filterAssets(assets, cleanedQuery);
    Logger.log('Filtered assets count: ' + filteredAssets.length);
    
    if (filteredAssets.length == 0) {
      Logger.log('Could not retrieve assets for: ' + cleanedQuery);
      return { statusCode: 404, message: 'No filtered assets found' };  // Return not found response
    } else {
      var successCount = 0;

      for (var i = 0; i < filteredAssets.length; i++) {
        var titleUpdated = updateTitle(filteredAssets[i].id, { 'title': filteredAssets[i].title });
        var metadataUpdated = updateMetadata(filteredAssets[i].id, { 'metadata_values': { 'TopHook': { 'field_values': [{ 'value': 'TRUE' }] } } });
        
        if (titleUpdated && metadataUpdated) {
          successCount++;
        }
      }

      if (successCount > 0) {
        return { statusCode: 200, message: 'Assets successfully updated', successCount: successCount };  // Return success response
      } else {
        return { statusCode: 500, message: 'Failed to update assets' };  // Return error response if none succeeded
      }
    }
  }
}


function getAssetsWithMetadata(title) {
  var metadataFields = getMetadataViewStructure();
  
  if (metadataFields.length == 0) {
    Logger.log('Metadata fields are empty. Skipping query.');
    return [[], [], 0, null];
  }
  
  var searchQuery = {
    "doc_types": ["assets", "collections"],
    "facets": ["metadata.Asset_Type", "metadata.Asset_Sub-Type", "metadata.Product", "metadata.Source", "filter.transcription_text", "filter.metadata_values", "object_type", "media_type"],
    "include_fields": ["id", "title", "keyframes", "object_type", "type", "proxies", "files", "format", "formats", "permissions", "versions", "category", "storage_id", "parent_id", "in_collections", "is_blocked", "warning", "external_link", "versions_number", "favoured_by", "metadata", "comments_count", "approval", "time_end_milliseconds", "time_start_milliseconds", "files.size", "media_type", "metadata.Product", "metadata.Brand", "metadata.Asset_Type", "metadata.Asset_Sub-Type"],
    "sort": [{"name": "date_created", "order": "desc"}],
    "query": "title:" + title,
    "filter": {
      "operator": "AND",
      "terms": [
        {"name": "ancestor_collections", "value_in": [COLLECTION_ID]}
      ]
    },
    "facets_filters": [],
    "search_fields": ["title", "description", "segment_text", "file_names", "metadata", "transcription_text", "transcription_text"]
  };
  
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'App-ID': APP_ID2,
      'Auth-Token': AUTH_TOKEN2
    },
    'payload': JSON.stringify(searchQuery),
    'muteHttpExceptions': true
  };
  
  var response = UrlFetchApp.fetch(ICONIK_URL + '/API/search/v1/search/', options);
  var jsonResponse = JSON.parse(response.getContentText());
  var assets = jsonResponse.objects || [];
  var totalAssets = jsonResponse.total || 0;
  
  Logger.log('Total assets retrieved: ' + totalAssets);
  
  return [assets, metadataFields, totalAssets, searchQuery.query];
}

function filterAssets(assets, queryTitle) {
  var filteredAssets = [];
  var queryTitleLower = queryTitle.toLowerCase();
  
  for (var i = 0; i < assets.length; i++) {
    var asset = assets[i];
    var title = asset.title.toLowerCase();
    
    if (title.split('.')[0] == queryTitleLower.split('.')[0]) {
      var filePaths = (asset.files || []).map(function(file) {
        return file.directory_path;
      });
      
      if (filePaths.some(function(path) { return /output|export/i.test(path); })) {
        filteredAssets.push(asset);
      }
    }
  }
  
  Logger.log('Filtered assets count: ' + filteredAssets.length);
  return filteredAssets;
}

function getMetadataViewStructure() {
  var options = {
    'method': 'get',
    'headers': {
      'App-ID': APP_ID2,
      'Auth-Token': AUTH_TOKEN2
    },
    'muteHttpExceptions': true
  };
  
  var response = UrlFetchApp.fetch(ICONIK_URL + '/API/metadata/v1/views/' + METADATA_VIEW_ID + '/', options);
  var jsonResponse = JSON.parse(response.getContentText());
  var viewFields = jsonResponse.view_fields || [];
  
  return viewFields.filter(function(field) { return field.name != "__separator__"; }).map(function(field) { return field.name; });
}

function updateIconikMetadataValuesForHook(asset) {
  var assetId = asset.id;
  var titleDoc = {'title': asset.title};
  var metadataDoc = {'metadata_values': {}};
  var metadataFields = getMetadataViewStructure();
  
  metadataFields.forEach(function(field) {
    var value = asset.metadata[field] || '';
    
    if (Array.isArray(value)) {
      if (field == 'Asset_Sub-Type' && value.length > 0) {
        metadataDoc.metadata_values[field] = {
          'field_values': value.map(function(v) { return {'label': v.trim(), 'value': v.trim()}; })
        };
      } else {
        metadataDoc.metadata_values[field] = {
          'field_values': [{'value': value.join(', ')}]
        };
      }
    } else {
      metadataDoc.metadata_values[field] = {'field_values': [{'value': value}]};
    }
  });
  
  metadataDoc.metadata_values['TopHook'] = {'field_values': [{'value': 'TRUE'}]};
  
  Logger.log('Metadata document for asset ' + assetId + ': ' + JSON.stringify(metadataDoc, null, 2));
  
  var successTitle = updateTitle(assetId, titleDoc);
  var successMetadata = updateMetadata(assetId, metadataDoc);
  
  return successTitle && successMetadata;
}

function updateTitle(assetId, titleDoc) {
  var options = {
    'method': 'patch',
    'contentType': 'application/json',
    'headers': {
      'App-ID': APP_ID2,
      'Auth-Token': AUTH_TOKEN2
    },
    'payload': JSON.stringify(titleDoc),
    'muteHttpExceptions': true
  };
  
  var url = ICONIK_URL + '/API/assets/v1/assets/' + assetId + '/';
  
  for (var retry = 0; retry < 5; retry++) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      
      if (response.getResponseCode() == 200) {
        Logger.log('Updated title for asset ' + assetId);
        return true;
      } else {
        var jsonResponse = JSON.parse(response.getContentText());
        Logger.log('Failed to update title for asset ' + assetId);
        jsonResponse.errors.forEach(function(error) { Logger.log(error); });
      }
    } catch (e) {
      Logger.log('Request failed: ' + e.message);
      Logger.log('Retrying ' + (retry + 1) + '/5...');
      Utilities.sleep(5000);  // Wait for 5 seconds before retrying
    }
  }
  
  Logger.log('Maximum retries exceeded. Failed to update title.');
  return false;
}

function updateMetadata(assetId, metadataDoc) {
  var options = {
    'method': 'put',
    'contentType': 'application/json',
    'headers': {
      'App-ID': APP_ID2,
      'Auth-Token': AUTH_TOKEN2
    },
    'payload': JSON.stringify(metadataDoc),
    'muteHttpExceptions': true
  };
  
  var url = ICONIK_URL + '/API/metadata/v1/assets/' + assetId + '/views/' + METADATA_VIEW_ID + '/';
  
  for (var retry = 0; retry < 5; retry++) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      
      if (response.getResponseCode() == 200) {
        Logger.log('Updated metadata for asset ' + assetId);
        return true;
      } else {
        var jsonResponse = JSON.parse(response.getContentText());
        Logger.log('Failed to update metadata for asset ' + assetId);
        jsonResponse.errors.forEach(function(error) { Logger.log(error); });
      }
    } catch (e) {
      Logger.log('Request failed: ' + e.message);
      Logger.log('Retrying ' + (retry + 1) + '/5...');
      Utilities.sleep(5000);  // Wait for 5 seconds before retrying
    }
  }
  
  Logger.log('Maximum retries exceeded. Failed to update metadata.');
  return false;
}
