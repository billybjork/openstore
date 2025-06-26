var APP_ID = '996cbed4-5b15-11ef-999d-22fa5663fb11';
var AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjliNjA1N2RjLTViMTUtMTFlZi04NWNiLWY2NDFmZTVjZjZiZCIsImV4cCI6MjAzOTE5MzM4M30.6o3dgRNSQcGLub2idv-UO_IOXLbBqfamxUnZ-7ftyyY';

var linkTitle = '';

function iconikSearch(query) {
    linkTitle = query;
    const queryParts = query.split('_');
    const searchQuery = queryParts[0] + '_';
    console.log(searchQuery);

    console.log("iconikSearch query:", searchQuery);
    const url = "https://app.iconik.io/API/search/v1/search/?page=1&per_page=100";
    const headers = {
        "Content-Type": "application/json",
        "App-Id": APP_ID,
        "Auth-Token": AUTH_TOKEN
    };
    const payload = getSearchPayload(searchQuery, ["31903224-d103-11ee-96f0-fe87b7d5879c"], ["collections"]);

    const options = {
        method: "post",
        headers: headers,
        payload: JSON.stringify(payload)
    };

    try {
        const response = UrlFetchApp.fetch(url, options);
        const data = JSON.parse(response.getContentText());

        if (response.getResponseCode() === 200) {
            if ("objects" in data && data.objects.length > 0) {
                // Log the titles and searchQuery for debugging
                console.log("Search Query:", searchQuery);
                data.objects.forEach(obj => {
                    console.log("Object Title:", obj.title);
                });

                // Collect all top-level collections
                const topLevelCollections = data.objects.filter(obj => obj.object_type === "collections" && obj.title.startsWith(searchQuery));

                for (let collection of topLevelCollections) {
                    console.log("Top-Level Collection ID:", collection.id);
                    const result = searchForExportCollections(collection.id);
                    if (result) return result;
                }

                console.log("No matching export or output collections found");
                return "No matching export or output collections found";
            } else {
                return "No collections found in Lucid";
            }
        } else {
            console.log("Error:", response.getContentText());
            return "Error fetching data from Iconik";
        }
    } catch (error) {
        console.error("Error:", error);
        return "Error occurred while processing the request";
    }
}

function searchForExportCollections(collectionId) {
    const url = "https://app.iconik.io/API/search/v1/search/?page=1&per_page=100";
    const headers = {
        "Content-Type": "application/json",
        "App-Id": APP_ID,
        "Auth-Token": AUTH_TOKEN
    };
    const payload = getSearchPayload("", [collectionId], ["collections"]);

    const options = {
        method: "post",
        headers: headers,
        payload: JSON.stringify(payload)
    };

    try {
        const response = UrlFetchApp.fetch(url, options);
        const data = JSON.parse(response.getContentText());

        if (response.getResponseCode() === 200) {
            if ("objects" in data && data.objects.length > 0) {
                // Log the titles for debugging
                console.log("Searching within collection ID:", collectionId);
                data.objects.forEach(obj => {
                    console.log("Object Title:", obj.title);
                });

                // Recursively search through sub-collections
                for (let obj of data.objects) {
                    if (obj.object_type === "collections") {
                        if (/Export|Exports|Output|Outputs/i.test(obj.title)) {
                            console.log("Matched Sub-Collection ID:", obj.id);
                            return generateLink(obj.id);
                        } else {
                            const result = searchForExportCollections(obj.id);
                            if (result) return result;
                        }
                    }
                }

                return null; // No matching sub-collection found in this branch
            } else {
                return null; // No collections found in the specified collection
            }
        } else {
            console.log("Error:", response.getContentText());
            return null; // Error fetching data from Iconik
        }
    } catch (error) {
        console.error("Error:", error);
        return null; // Error occurred while processing the request
    }
}

function getSearchPayload(query, ancestorCollections, docTypes) {
    return {
        "doc_types": docTypes,
        "facets": [
            "metadata.Asset_Type",
            "metadata.Asset_Sub-Type",
            "metadata.Product",
            "metadata.Source",
            "filter.transcription_text",
            "filter.metadata_values",
            "object_type",
            "media_type"
        ],
        "include_fields": [
            "id",
            "title",
            "object_type",
            "type",
            "metadata.Product",
            "metadata.Brand",
            "metadata.Asset_Type",
            "metadata.Asset_Sub-Type"
        ],
        "sort": [
            {"name": "date_created", "order": "desc"}
        ],
        "query": query,
        "filter": {
            "operator": "AND",
            "terms": [
                {"name": "ancestor_collections", "value_in": ancestorCollections},
                {"name": "status", "value_in": ["ACTIVE", "CLOSED"]}
            ]
        },
        "facets_filters": [],
        "search_fields": [
            "title",
            "description",
            "segment_text",
            "file_names",
            "metadata",
            "transcription_text"
        ]
    };
}

function generateLink(collectionId) {
    // Define the API endpoint URL for collections
    var url = "https://app.iconik.io/API/assets/v1/collections/" + collectionId + "/shares/url/";

    // Define the request headers
    var headers = {
        "Content-Type": "application/json",
        "App-Id": APP_ID,
        "Auth-Token": AUTH_TOKEN
    };

    // Define the request payload
    var payload = {
        "title": linkTitle,
        "expires": "2026-01-26",
        "allow_download": true,
        "allow_download_proxy": true,
        "allow_comments": true,
        "allow_approving_comments": true,
        "allow_view_versions": true,
        "allow_view_transcriptions": true,
        "upload_storage_id": "997d8538-3aa7-11ed-80fa-aed79c3ac367",
        "allow_custom_actions": false,
        "allow_upload": false,
        "allow_setting_approve_status": false,
        "allow_user_search_for_mentions": false,
        "emails": []
    };

    // Send the POST request
    var options = {
        "method": "post",
        "headers": headers,
        "payload": JSON.stringify(payload)
    };

    var response = UrlFetchApp.fetch(url, options);

    // Check if the request was successful
    if (response.getResponseCode() == 201 || response.getResponseCode() == 200) {
        // Print the response JSON
        var responseData = JSON.parse(response.getContentText());
        Logger.log("URL: " + responseData.url);

        return responseData.url;
    } else {
        // Log the full response text for further inspection
        var responseData = response.getContentText();
        Logger.log("API call failed with status code " + response.getResponseCode() + ". Response: " + responseData);
        return "Error generating share link";
    }
}

function generateCreativeLinkNotification(rowData, searchResult) {
  Logger.log("Inside generateCreativeLinkNotification function. searchResult: " + searchResult);

  const payload = JSON.stringify({
    rowData: rowData,
    searchResult: searchResult
  });

  const webhookUrl = 'https://openstore.app.n8n.cloud/webhook/419ab332-e545-413e-b284-96d9cb082676';

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload
  };

  try {
    const response = UrlFetchApp.fetch(webhookUrl, options);
    Logger.log(response.getContentText());
  } catch (error) {
    Logger.log('Failed to send notification. Error: ' + error.toString());
  }
}