# Implementation Plan: AI Resume Screener (TalentScan AI)

Build a production-quality, responsive, offline-capable, and matte-black themed **AI Resume Screener** (named **TalentScan AI**) using vanilla HTML, CSS, and JavaScript. The application will run entirely in the browser as a static site and leverage the Gemini API (via client-provided API key) for resume evaluation, matching against Job Descriptions (JDs), and providing detailed match analysis.

## User Review Required

> [!IMPORTANT]
> **API Execution and Security**: The Gemini API will be called directly from the client side using the API key entered by the user. The key is stored safely in the browser's `localStorage` and is never sent to any external server other than Google's Gemini API endpoints.
>
> **PDF Parsing**: PDF resume files will be parsed client-side using `pdfjs-dist` loaded from a CDN. This keeps data secure and locally processed.

## Open Questions

- **Gemini Model Choice**: We default to `gemini-1.5-flash` for fast and cost-effective screening, but users can toggle to `gemini-1.5-pro` in the settings for more detailed semantic reviews.
- **Mock Mode**: If no API key is provided, the application will run in a mock mode with high-quality simulated evaluations so that the app remains functional for testing immediately out of the box.

---

## Proposed Changes

### Component 1: Brand & Styling Guidelines
We will define styling guidelines in the workspace's `Brand Guidelines` file. It will contain design tokens, typography, a spacing scale, component states, and motion parameters tailored for a premium, matte-black product.

#### [MODIFY] [Brand Guidelines](file:///c:/Users/kadap/OneDrive/Desktop/My_Projects/Brand%20Guidelines)
Update the file to contain the brand guidelines for **TalentScan AI** including CSS tokens and a matching JSON schema.

---

### Component 2: Web App Interface and Layout
We will implement a responsive, mobile-first single-page application dashboard following the matte-black design system.

#### [NEW] [index.html](file:///c:/Users/kadap/OneDrive/Desktop/My_Projects/index.html)
The entry point. Includes:
- A modern sidebar or header navigation for switching between views (Dashboard, Resumes List, Job Descriptions, and Settings).
- A central workspace containing sections for uploading resumes, creating job descriptions, and viewing details reports.
- Modals for adding/editing resumes, job descriptions, settings (Gemini API key), and data reset.
- Empty states with call-to-actions (e.g. "Upload your first resume" or "Create a Job Description").

#### [NEW] [styles.css](file:///c:/Users/kadap/OneDrive/Desktop/My_Projects/styles.css)
The style sheet defining:
- CSS custom properties (tokens) based on the brand guidelines (matte-black, surfaces, accents, typography, spacing).
- CSS resets and base styles (Google Font *Outfit* or *Inter*).
- Layout classes (flexbox, grid systems) designed mobile-first.
- Accessible visual designs (states: hover, active, focus-visible, and disabled).
- Transitions and micro-animations with support for `prefers-reduced-motion`.

---

### Component 3: Data Management and Storage Layer
Implement the client-side state machine and `localStorage` manager.

#### [NEW] [storage.js](file:///c:/Users/kadap/OneDrive/Desktop/My_Projects/storage.js)
Handles saving, loading, and migrating data.
- **Local Storage Key**: `talentScan:data`
- **Schema**:
  ```json
  {
    "version": 1,
    "settings": {
      "apiKey": "...",
      "model": "gemini-1.5-flash",
      "targetShortlist": 10,
      "theme": "dark"
    },
    "jobDescriptions": [
      {
        "id": "...",
        "title": "...",
        "department": "...",
        "description": "...",
        "skills": "..."
      }
    ],
    "resumes": [
      {
        "id": "...",
        "candidateName": "...",
        "email": "...",
        "phone": "...",
        "resumeText": "...",
        "jobId": "...",
        "status": "Under Review",
        "createdAt": "...",
        "updatedAt": "...",
        "screening": {
          "score": 85,
          "summary": "...",
          "strengths": ["...", "..."],
          "gaps": ["...", "..."],
          "experienceLevel": "Strong",
          "interviewQuestions": ["...", "..."],
          "recommendation": "Shortlist"
        }
      }
    ]
  }
  ```
- **Migration engine**: Supports version increments and safe data conversion.

#### [NEW] [utils.js](file:///c:/Users/kadap/OneDrive/Desktop/My_Projects/utils.js)
Utility functions for:
- Formatters: Match percentage (Intl.NumberFormat), dates.
- Sanitizer: Sanitizes user inputs to prevent XSS (cross-site scripting) without using unsafe innerHTML.
- Unique ID generators (`crypto.randomUUID` fallback).
- PDF text extractor helper using `pdfjs-dist`.

---

### Component 4: Logic and API Controller
The central engine connecting UI, local storage, and the Gemini API.

#### [NEW] [app.js](file:///c:/Users/kadap/OneDrive/Desktop/My_Projects/app.js)
Main application logic:
- Listens to DOM events and coordinates view changes.
- Coordinates uploading of files (reads text files and processes PDFs).
- Handles CRUD for Job Descriptions and Resumes.
- Manages screening requests to Gemini:
  - Validates API key.
  - Constructs matching prompt (injecting JD and Resume text).
  - Fires POST request to Google Generative Language API with `responseSchema` forced to JSON.
  - Saves the resulting screening report, adjusts candidate status, and updates dashboard metrics.
- Computes metrics: Match scores average, shortlist progress tracker (incorporating warning states for 80% and 100% progress targets).
- Provides data backup/restore: Export results to CSV, Import from JSON with schema validator.
- Supports "Undo Delete" with a 5-second toast alert notification.

#### [NEW] [README.md](file:///c:/Users/kadap/OneDrive/Desktop/My_Projects/README.md)
Contains documentation:
- Application features and features roadmap.
- Instructions to run locally (fully static - double click index.html).
- Storage schema description and versioning rules.
- Test plan and manual verification steps.

---

## Verification Plan

### Automated Tests
Since the project is built in vanilla JS running static in the browser, we will verify using the developer environment.
- Run a static file server to launch and test.

### Manual Verification
1. **Settings configuration**: Open site, navigate to settings, insert a mock Gemini API key or real key.
2. **Create Job Description**: Save a JD for "Senior Front-End Developer".
3. **Upload Resume**: Upload a mock software developer resume.
4. **AI Screening**: Click "Screen", wait for processing, check the matches, strengths, gaps, and scoring report.
5. **Dashboard Metrics**: Confirm graphs, average scores, and candidate shortlist progress bars are updating.
6. **Filters and Sorting**: Filter candidates by score range, search for skills, and sort by score.
7. **CSV Export & Import**: Verify exporting table to CSV works, reset data, and re-import via JSON file.
8. **Undo Action**: Delete a candidate, verify the undo toast triggers, click "Undo", and check if the candidate is restored.
