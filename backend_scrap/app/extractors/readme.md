# Google Maps Leads Scraper

A Python-based tool that extracts business leads from Google Maps and converts the extracted data into a CSV file that can be opened in Excel.

## Installation

### 1. Clone or download the project

Open the project folder in VS Code or a terminal.

### 2. Create a virtual environment

```bash
python -m venv venv
```

### 3. Activate the virtual environment

**Windows:**

```bash
venv\Scripts\activate
```

### 4. Install Playwright

```bash
pip install playwright
```

### 5. Install Chromium for Playwright

```bash
playwright install chromium
```

The project is now ready to use.

---

# How to Use

## Step 1 — Run the Google Maps Scraper

Run the scraper:

```bash
python google_scraper.py
```

The program will ask for a Google Maps search URL:

```text
Enter Google Maps URL:
```

Paste the Google Maps search URL you want to scrape.

Example:

```text
https://www.google.com/maps/search/coaching+institutes+in+bihar+sharif
```

The program will then ask:

```text
Enter scraping time in minutes:
```

Enter how long you want the scraper to scroll through the Google Maps results.

Example:

```text
Enter scraping time in minutes: 2
```

The browser will open automatically and start collecting businesses.

The scraper collects:

* Business name
* Google Maps URL
* Location
* Phone number
* Website

The extracted business details are saved as a JSON file inside:

```text
google_maps_leads/
```

Example:

```text
google_maps_leads/
└── google_maps_leads_20260918_171000.json
```

---

## Step 2 — Convert JSON to CSV

After scraping is complete, run:

```bash
python jsontoscv.py
```

The converter reads the JSON data and creates:

```text
data/data.csv
```

The CSV can then be opened directly in Microsoft Excel.

The final CSV contains:

| Name          | Location         | Phone        | Website |
| ------------- | ---------------- | ------------ | ------- |
| Business Name | Business Address | Phone Number | Website |

---

# Project Flow

The complete project works in two stages:

```text
Google Maps Search URL
        ↓
Google Maps Scraper
        ↓
Scroll through Results
        ↓
Collect Business Listings
        ↓
Remove Duplicate Listings
        ↓
Open Each Business
        ↓
Extract Business Details
        ↓
Name / Location / Phone / Website
        ↓
Save as JSON
        ↓
JSON to CSV Converter
        ↓
data/data.csv
        ↓
Open in Excel
```

### In short

```text
Google Maps
     ↓
Python + Playwright
     ↓
JSON
     ↓
Python CSV Converter
     ↓
Excel/CSV
```
