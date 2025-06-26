const items = $node["Webhook"].json["body"]["data"]; // Access the 'data' property which contains the CSV data
let csvContent = "Asset ID,Asset Title,Brand,Asset_Type,Asset_Sub-Type,Product,Source,Rights_Termination,Directory Path,Date Created\n";

items.forEach(item => {
    csvContent += `${item["Asset ID"]},${item["Asset Title"]},${item["Brand"]},${item["Asset_Type"]},${item["Asset_Sub-Type"]},${item["Product"]},${item["Source"]},${item["Rights_Termination"]},${item["Directory Path"]},${item["Date Created"]}\n`;
});

return [{binary: {
    data: {
        mimeType: 'text/csv',
        data: Buffer.from(csvContent, 'utf8').toString('base64'),
        fileName: $node["Webhook"].json["body"]["filename"] // Access the 'filename' property
    }
}}];
