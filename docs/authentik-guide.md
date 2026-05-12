# Authentik Branding Guide

> Deprecated reference: Verdaxis runtime auth now uses the backend JWT flow. Keep this file only for historical Authentik branding reference; do not use it as implementation guidance for the current platform.

Follow these steps to apply the Verdaxis branding to your Authentik login screen.

## Prerequisites

- You must be logged in as an **Admin** (`akadmin`).
- You have the file `docs/authentik-theme.css` from this repository.
- You have the logo file `public/verdaxis-logo-words-right.png` and favicon file `public/verdaxis-logo-no-words.png` ready to upload.

## Steps

### 1. Access Brands Menu

1.  Go to `http://144.126.151.136:9000/if/admin/`.
2.  In the left sidebar, look for the **System** section at the bottom.
3.  Click on **Brands**.

### 2. Create or Edit the Brand

1.  Click **Create** (or **Edit** the existing one if it matches your domain).
2.  **Name**: `Verdaxis Theme`
3.  **Title**: `Verdaxis Intelligence`

### 3. Upload Logos and Backgrounds

**Important**: Do not just type the file path. Authentik cannot see your local project files.

1.  **Logo**: Click inside the **Logo** field (or the icon next to it) to open the file picker.
2.  Select the file `public/verdaxis-logo-words-right.png` from your computer to **upload** it to Authentik.
3.  **Favicon**: Do the same for the Favicon field.
4.  Select `public/verdaxis-logo-no-words.png` for the favicon. If the file picker doesn't appear, use this full URL: `http://144.126.151.136:5173/verdaxis-logo-no-words.png` (assuming your frontend is running).

### 4. Apply Custom CSS

1.  **Scroll down** in that same "Update Brand" window.
2.  Look for the **Custom CSS** field (it's usually below the "Default Flows" section).
3.  Open `docs/authentik-theme.css` from this project.
4.  Copy the entire content and paste it into the **Custom CSS** field.

### 5. Set as Default & Verify

1.  Save the Brand.
2.  Ensure it is the "Default" brand in the Brands list.
3.  Open an Incognito window and go to `http://144.126.151.136:5173/login`.
4.  You should now see the Verdaxis-branded login screen!
