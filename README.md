# DOHER AI GALLERY

Premium AI image inspiration and prompt gallery platform.

## Features
- **Curated Prompt Gallery**: Discover high-quality AI image prompts.
- **Dynamic Placeholders**: Automatically detect and replace placeholders like #name, #company, etc.
- **Luxury Design**: Dark luxury theme with gold accents, optimized for desktop and mobile.
- **Admin Control**: Full management of categories and prompts via Firebase.
- **Robust Connection**: Exponential backoff retries and persistent local cache for unstable networks.

## Running the Project
IMPORTANT: This project must be served via HTTP. Do NOT open `index.html` directly using `file://`.

To run locally:
1. Ensure you have Node.js installed.
2. Run `npm install` (or use a simple server like `npx serve .`).
3. Open `http://localhost:3000` in your browser.

## Security
- Firestore and Storage rules are provided in the root directory.
- Admin access is restricted to users in the `admins` collection.
