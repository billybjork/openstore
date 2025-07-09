# Creative Operations at OpenStore

This repository contains the technical components of a comprehensive system for tracking and managing paid advertising creative production and performance at OpenStore.

## Overview

Our challenge was to scale creative operations to deliver 150+ unique ad creatives per week across 40+ brands. These solutions focus on automation to save time and implement standardized workflows based on ad performance data.

## System Components

### Creative Sprint Planning
Central project management system that tracks projects through all stages, implements naming conventions, and facilitates collaboration between strategists, editors, and designers.
- **Location**: [`creative-sprint-planning/`](./creative-sprint-planning/)

### Automated Notifications
Slack notifications triggered by status changes, allowing users to update project statuses directly from Slack messages.
- **Location**: [`n8n/`](./n8n/)

### Performance Dashboard
Personal dashboard for browsing ads from the entire brand portfolio launched on Meta and TikTok platforms. Users create their own copy, and can then can filter by brand, creator, or other attributes, and sort by metrics like Spend, CTR, ROAS, and more.
- **Location**: [`paid-ads-dash/`](./paid-ads-dash/)

## Technical Architecture

- **Google Sheets Integration**: [Apps Script](https://developers.google.com/apps-script/guides/sheets) functions and triggers with external API integrations, including [iconik](https://www.iconik.io/)
- **Workflow Orchestration**: Node-based automation via [n8n](https://n8n.io/), handling webhook payloads from Google Sheets Apps Script and Slack
- **Data Pipeline**: Daily metric refreshes from Meta and TikTok platforms (see [`snowflake/`](./snowflake/))

---

## Workflow Steps

### Step 1: Job Creation

Creative projects ("jobs") are added to the Creative Sprint Planning sheet with dynamically generated names based on user input. When the status changes, an Apps Script function automatically assigns job numbers by auto-incrementing a brand-specific counter.

- **Code**: [`processRowMoves.js`](./creative-sprint-planning/core/processRowMoves.js)
- **Features**: Supports batch job creation

![Job naming automation](./assets/job-naming-automation.gif)

### Step 2: Review Link Generation

After an editor or designer completes the first revision, they export assets to our media asset management system. Review links are then generated automatically by retrieving assets based on the job name.

- **Code**: [`generateReviewLink.js`](./creative-sprint-planning/core/generateReviewLink.js)

![Automatic review link generation](./assets/review-link-generation.gif)

### Step 3: Trigger Slack Notifications

In response to project status changes, Google Sheets Apps Script sends payloads to n8n, which extracts values and routes them to the appropriate Slack messages.

![csp-to-slack nodes](./assets/n8n-csp-to-slack.png)

- **Configuration**: [`n8n/csp-to-slack/`](./n8n/csp-to-slack/) contains JSON files for building Slack messages

### Step 4: Interactive Slack Messages

When notes are provided on initial creatives, editors and designers receive Slack notifications that allow them to update project status directly from Slack.

![notes-given notification](./assets/notes-given.gif)

Multiple interactive notification types are available in [`n8n/csp-to-slack/`](./n8n/csp-to-slack/).

### Step 5: Processing Slack Interactions

Slack message interactions send payloads to n8n, which routes them to appropriate actions in Google Sheets.

**Example**: User updating project status directly from Slack:

![slack-notification-interaction](./assets/slack-notification-interaction.gif)

The n8n workflow receives action payloads from Slack, parses values, and updates Google Sheets:

![slack-to-csp nodes](./assets/n8n-slack-to-csp.png)

- **Code Samples**: [`slack-to-csp/`](./n8n/slack-to-csp/) contains sample code from various nodes

### Step 6: Performance Analytics

Once ads are approved and launched on Meta or TikTok platforms, their metrics become available in the Paid Ads Dashboard.

![paid-ads-dash demo](./assets/paid-ads-dash-demo.gif)

**Available Filters:**
- Brand
- Channel (Meta or TikTok)
- Requester (strategist)
- Creator (editor/designer)
- Job Format (Video or Static)
- Job Type (New, More, Fix, Adapt)
- Date Range (launch date)
- Wins and Pre-Wins (internal top-performer criteria)
- Live ads only

**Additional Features:**
- Input a specific search query
- Set a minimum spend threshold
- Sort by any metric (Spend, CTR, CVR, ROAS, etc.)

**Implementation**: [`paid-ads-dash/`](./paid-ads-dash/) contains formulas for dashboard construction

### Step 7: Automated Win Processing

When ads meet predefined internal criteria for "Win" status, several automated actions are triggered:

1. **Asset Tagging**: Automatically tags assets as "Wins" in the media asset management system for easy filtering
   - **Code**: [`setVariantWin.js`](./creative-sprint-planning/wins/setVariantWin.js)

2. **Quickscale Job Creation**: Creates placeholder projects to iterate on successful creatives
   - **Code**: [`wins.js`](./creative-sprint-planning/wins/wins.js)

3. **Team Notifications**: Sends notifications to the "#paid-ads-wins" Slack channel
   - **Code**: [`wins.js`](./creative-sprint-planning/wins/wins.js) and [`n8n/creative-wins/`](./n8n/creative-wins/)

![paid-ads-wins nodes](./assets/n8n-paid-ads-wins.png)

**Example Slack notification:**

![#paid-ads-wins notification example](./assets/paid-ads-wins-notification-2.png)