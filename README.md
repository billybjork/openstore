# Creative Operations at OpenStore

Comprehensive system for tracking paid ads creation and performance at OpenStore

Challenge was to scale our creative operation to deliver 150+ unique ad creatives per week across 40+ brands 

Including various automations to save time and execute on creative 'Wins' - Quickscale, etc.

Includes:
- [Creative Sprint Planning](./creative-sprint-planning/) - central spreadsheet for tracking creative projects through all stages, utilizing various [Apps Script](https://developers.google.com/apps-script/guides/sheets) functionalities and webhook integrations with n8n
- [n8n](./n8n/) - various automations; receiving webhooks from Google Sheets Apps Script; communicating with external APIs (Slack, Iconik); etc.
- [Snowflake](./snowflake/) - SQL queries to pull raw data from internal datastore for Meta and TikTok



Job naming formula + auto-incrementation:  
![Job naming automation](./assets/job-naming-automation.gif)

Automatic review link generation:  
![Automatic review link generation](./assets/review-link-generation.gif)

Status changes drive Slack notifications - example:
![notes-given notification](./assets/notes-given.gif)

n8n workflows to route Google Sheets events to Slack notifications ():
![csp-to-slack nodes](./assets/n8n-csp-to-slack.png)
See [csp-to-slack](n8n/csp-to-slack/) for JSON for building Slack messages

Users update project statuses directly out of Slack:
![slack-notification-interaction](./assets/slack-notification-interaction.gif)
Implementation in n8n - receive action payload from Slack, parse values, and update in Google Sheets:
![slack-to-csp nodes](./assets/n8n-slack-to-csp.png)
See [slack-to-csp](n8n/slack-to-csp/) for sample code from various nodes

Paid ads dash - for reviewing approved ads that have gone live
![paid-ads-dash demo](./assets/paid-ads-dash-demo.gif)
See ![paid-ads-dash](./paid-ads-dash/) for formulas to build dash

n8n workflow to send "#paid-ads-wins" notifications:
![paid-ads-wins nodes](./assets/n8n-paid-ads-wins.png)
See [creative-sprint-planning/wins](./creative-sprint-planning/wins/) for Apps Script functions triggering this, and [n8n/creative-wins](./n8n/creative-wins/) for n8n node code
Example Slack notification (#paid-ads-wins):
![#paid-ads-wins notification example](./assets/paid-ads-wins-notification-2.png)