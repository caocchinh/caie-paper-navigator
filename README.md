# CAIE Paper Navigator - Firefox Extension

A Firefox extension for conveniently searching CAIE IGCSE/A-Level past papers.

## Source Code Submission Requirements

### Required Software

- Node.js (version 18.0.0 or higher)
- npm (version 8.0.0 or higher)

### Manual Build Instructions

1. Install Node.js and npm from [https://nodejs.org/](https://nodejs.org/)
2. Clone or download this repository
3. Open a terminal/command prompt in the project directory
4. Install dependencies: `npm install`
5. Build the extension: `npm run build`
6. Manually copy these files to the `dist` directory:
   - manifest.json
   - popup.css
   - Open index.html and type in <link rel="stylesheet" href="/popup.css"> inside the <head> tag
7. Create a ZIP file containing all files in the `dist` directory

## Source Code Structure

- `src/` - Main source code directory
  - `components/` - React components
  - `lib/` - Utility functions and shared code
  - `types/` - TypeScript type definitions
  - `App.tsx` - Main application component
  - `main.tsx` - Application entry point
- `public/` - Static assets
- Root files:
  - `manifest.json` - Extension manifest file
  - `popup.css` - Popup styling
  - `noteoverflow.png` - Extension icon
  - `index.html` - Main HTML file (imports popup.css)

## Notes for Reviewers

- This extension is built using React, TypeScript, and Vite
- No code is transpiled, concatenated, or minified before submission
- All source files are included in this submission
- The build process only compiles TypeScript to JavaScript and bundles the dependencies
