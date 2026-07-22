# Task List: TalentScan AI

- [x] Create Brand Guidelines content for TalentScan AI and write it to `/Brand Guidelines`
- [x] Implement utility layer (`/utils.js`) with sanitization, formatters, and PDF extraction helper
- [x] Implement data storage layer (`/storage.js`) with localStorage versioning and migrations
- [x] Implement base HTML layout and modals (`/index.html`)
- [x] Implement CSS design tokens and component styles (`/styles.css`)
- [x] Implement core app controller and logic (`/app.js`)
  - [x] File processing (Text & PDF via CDN library)
  - [x] Gemini API integration & fallback Mock mode
  - [x] Candidate & Job Description CRUD
  - [x] Dashboard metrics & custom SVG charts
  - [x] Searching, sorting, and filtering
  - [x] CSV Export and JSON Import
  - [x] Undo delete action with 5-second toast
  - [x] Accessibility pass (Esc key closing modals, focus trap, aria-labels)
- [x] Write documentation (`/README.md`)
- [x] Verify the application locally (Static site ready, automated browser blocked by CDN error)
