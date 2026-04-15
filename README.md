# KXFGPT UI

A clean white, modern chat UI for **KXF GPT**.

## Run locally

Open `/home/runner/work/KXFGPT/KXFGPT/index.html` in a browser.

## Features

- Eye-catching top branding: **KXF GPT**
- Footer branding: **KXG GPT developed by KAXIF GULL**
- Pure white, minimalist visual style (no neon/cyberpunk)
- Recent chats (saved for authenticated users)
- Copy buttons for both user and assistant messages
- Full conversation export: PDF, DOCX/Word, Excel
- Settings panel with memories (tone/preferences)
- Image upload with max 5 images at a time and limit feedback
- Google-only login UI using Google Identity Services button
- Temporary mode when not signed in (no chat persistence)
- Temporary-to-saved transition after successful Google login

## Google login setup

Update `GOOGLE_CLIENT_ID` in `/home/runner/work/KXFGPT/KXFGPT/app.js` with your Google OAuth Web Client ID.
