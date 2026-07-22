<!--
PLANNING COMMENT:
1. Scaffold layout and modals in index.html, with Outfits font and CDN integrations (PDF.js).
2. Create styles.css with matte-black design tokens and component styling (cards, lists, modals, toasts).
3. Implement utility methods in utils.js (ID generator, PDF client parser, HTML input sanitizer).
4. Implement storage layer in storage.js (default state initialization, migrations, load/save triggers).
5. Implement app controller in app.js (file listeners, Gemini API, backup CSV/JSON exports, search/sort filters, undo toast, access loops).
6. Verify locally in browser.
-->

# TalentScan AI | Resume Screener

TalentScan AI is a responsive, client-side web application designed to evaluate candidate resumes against Job Descriptions (JDs) using Google's Gemini API. It runs entirely locally in your browser as a static site and saves all database contents securely within your browser's local storage.

## Features
1. **Resume Screening CRUD**:
   - Add candidate profile, select job profile, upload PDF resume (parsed client-side) or paste raw resume text.
   - Screen resume using the Gemini API (configurable via API key).
   - Dynamic, detailed AI Match report including Suitability Score, Strengths, Gaps, and tailored Interview Questions.
   - Custom candidate status tracking (Shortlisted, Under Review, Rejected).
   - Support for deleting candidate profiles with a 5-second **Undo Action** toaster prompt.

2. **Job Profiles (Job Descriptions)**:
   - Create, edit, select, and delete Job Profiles.
   - Separate candidate evaluations by the active Job Profile.

3. **Metrics & Visualizations**:
   - Average suitability match scores computed on the fly.
   - Custom SVG-based bar chart showcasing the distribution of match ratings across candidates.
   - Leaderboard showing top-matched candidates for the selected Job Profile.
   - Shortlist progress indicator comparing current shortlist size with target goals (warning states at 80% and 100% capacity).

4. **Data Tools & Settings**:
   - Export candidate results directly to CSV spreadsheets.
   - Full Database backup export and recovery via JSON files (validated and migrated).
   - System factory reset settings.
   - Toggle API Key visibility masking in Settings.

---

## How to Run

1. Simply open [index.html](file:///c:/Users/kadap/OneDrive/Desktop/My_Projects/index.html) directly in any modern browser.
2. Alternatively, run a local static server inside the directory (e.g. using `http-server` or VS Code Live Server).
3. Go to **Settings** and supply your Gemini API key (retrieve a free key from [Google AI Studio](https://aistudio.google.com/)). If no API key is provided, the application operates in **Demo Mode** using high-quality simulated reports for testing.

---

## Data Schema & Versioning

Data is saved locally under the LocalStorage key: `talentScan:data`

### Schema:
```json
{
  "version": 1,
  "settings": {
    "apiKey": "AIzaSy...",
    "model": "gemini-1.5-flash",
    "targetShortlist": 10
  },
  "jobDescriptions": [
    {
      "id": "ts-uuid-1",
      "title": "Lead Software Engineer",
      "department": "Engineering",
      "description": "Role details...",
      "skills": "React, CSS, SQL",
      "createdAt": "2026-07-22T08:00:00.000Z"
    }
  ],
  "resumes": [
    {
      "id": "ts-uuid-2",
      "candidateName": "Sarah Jenkins",
      "email": "sarah.j@example.com",
      "phone": "+1 555-1234",
      "resumeText": "Extract resume contents...",
      "jobId": "ts-uuid-1",
      "status": "Shortlist",
      "createdAt": "2026-07-22T08:05:00.000Z",
      "updatedAt": "2026-07-22T08:06:00.000Z",
      "screening": {
        "score": 85,
        "summary": "Match summary...",
        "strengths": ["React capability", "Lead experience"],
        "gaps": ["No direct SQL experience mentioned"],
        "experienceLevel": "Strong",
        "interviewQuestions": ["Explain react hooks usage?", "Tell us about a time you led a team..."],
        "recommendation": "Shortlist"
      }
    }
  ]
}
```

### Storage Migrations:
- Upgrades are automatically run inside `storage.js` when loading files.
- The `migrate(oldData)` helper compares current storage versions and increments schemas (e.g., adding missing fields to candidate objects) preserving database integrity.

---

## Manual Test Checklist

Follow these steps to manually verify all elements of the system:
1. **API Configuration**:
   - Go to Settings, enter a mock key (e.g. `AIzaSyMockKey`), toggle key visibility, change model to `Gemini 1.5 Pro` and target count to `5`. Save configs. Verify the fields show correct updated states.
2. **Job Profile CRUD**:
   - Go to Job Profiles. Click **New Profile**. Save a profile with title "Lead Designer", department "Design", description: "Design Figma components and CSS layouts.", skills: "Figma, CSS, UI Design".
   - Verify card is displayed in Grid. Edit the card. Delete the default generalist card and confirm the popup dialog works.
3. **Candidate Screening**:
   - Click **Add Resume** in the topbar.
   - Enter candidate name: "Ameesha Kadapa". Choose Job Profile "Lead Designer". Select **Paste Resume** tab, and enter text: "I have 5 years experience as a UI designer. Skills: Figma, CSS styles, design systems."
   - Click **Save Candidate**. Verify the loading screen pops up.
   - Verify the Detailed report modal opens with Score, strengths matching Figma/CSS, and tailored questions.
4. **Resumes Filter, Sort, Group**:
   - Open Resumes directory. Search for "Ameesha". Verify search functions.
   - Check if candidates are grouped by calendar day (e.g. "July 22, 2026") with matching sub-headers.
   - Test sorting candidates by Match Score (ascending/descending).
5. **Goal Target Progress & Distribution**:
   - Change candidate status in report modal to "Shortlist". Close modal.
   - Open Dashboard. Verify shortlisted stats increment, average score updates, and progress bar loads.
   - Check if the custom SVG chart correctly displays a bar matching Ameesha's score bracket.
6. **Undo Actions**:
   - Delete Ameesha's profile from the list.
   - A toast should appear saying "Ameesha Kadapa's profile deleted." with an **Undo** button.
   - Click **Undo** within 5 seconds and verify she appears back in the list.
7. **Import/Export Backups**:
   - Export candidate database to CSV. Open file and confirm spreadsheet formatting.
   - Export full backup to JSON.
   - Click **Factory Reset Data** under settings. Verify database wipes.
   - Import the saved JSON backup and verify all Job Profiles, candidates, and configuration keys restore correctly.

---

## Future Improvements
- Multi-file bulk resume screening queue.
- Custom evaluation parameters (e.g. weighting specific technical skills).
- Semantic resume search queries.
