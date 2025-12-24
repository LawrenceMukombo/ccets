# ODK / KoboToolbox Integration Guide

This guide explains how to connect your CCETS system with ODK/Kobo for offline ticket creation.

## 1. Overview
Field technicians use the **ODK Collect** Android app to report faults offline. The app downloads a list of facilities and equipment from CCETS. When they submit a form, KoboToolbox sends the data instantly to your CCETS server.

## 2. Server Configuration

### A. New Endpoints Added
Your CCETS backend now supports:
1.  `GET /api/hooks/kobo/generate-media`: Generates `facilities.csv` and `equipment.csv` from your live database.
2.  `POST /api/hooks/kobo/submission`: Accepts JSON webhooks from Kobo to create tickets.

### B. Output Location
The generated CSV files are saved to:
`c:\ccets_png\backend\src\integrations\kobo\output\`

## 3. KoboToolbox Implementation Steps

### Step 1: Create the Form (XLSForm)
Create a new form in Kobo with these exact question names to match our backend script:
1.  **facility_id**: `select_one_from_file facilities.csv`
2.  **equipment_id**: `select_one_from_file equipment.csv` (Filtered by choice_filter: `facility_id = ${facility_id}`)
3.  **fault_description**: `text`
4.  **photo**: `image` (Optional)

### Step 2: Upload Media Files
1.  Run the generator: `curl http://localhost:5050/api/hooks/kobo/generate-media`
2.  Go to KoboToolbox > Project Settings > Media.
3.  Upload the generated `facilities.csv` and `equipment.csv`.

### Step 3: Connect Webhook
1.  Go to KoboToolbox > Project Settings > REST Services.
2.  Add a generic JSON webhook.
3.  **URL:** `https://ccets.lamtoninvestments.com/api/hooks/kobo/submission`
4.  **Trigger:** On Submission.

## 4. Maintenance
To keep the mobile forms updated with new equipment:
- Create a Cron Job (or Windows Task) to hit `/api/hooks/kobo/generate-media` weekly.
- Re-upload the CSVs to Kobo (Manual step, unless utilizing Kobo API v2).
