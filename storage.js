/**
 * TalentScan AI Storage Layer
 * LocalStorage manager with schema versioning and safe migrations
 */

const STORAGE_KEY = 'talentScan:data';
const CURRENT_VERSION = 1;

/**
 * Default empty state schema
 */
export const DEFAULT_STATE = {
  version: CURRENT_VERSION,
  settings: {
    apiKey: '',
    model: 'gemini-1.5-flash',
    targetShortlist: 10
  },
  jobDescriptions: [
    {
      id: 'default-jd',
      title: 'Senior Software Engineer (Generalist)',
      department: 'Engineering',
      description: 'We are seeking a senior software engineer to build scalable web applications. Requirements: experience with modern HTML/CSS/JS, knowledge of algorithms, systems design, and databases. Collaborative mindset and clean code principles.',
      skills: 'JavaScript, HTML, CSS, Databases, System Design',
      createdAt: new Date().toISOString()
    }
  ],
  resumes: []
};

/**
 * Migration engine to upgrade old schema designs safely
 * @param {Object} oldData 
 * @returns {Object} newData
 */
export function migrate(oldData) {
  if (!oldData || typeof oldData !== 'object') {
    return { ...DEFAULT_STATE };
  }

  // Clone to avoid mutating original
  let data = JSON.parse(JSON.stringify(oldData));

  // Initialize missing root nodes
  if (!data.version) data.version = 0;
  if (!data.settings) data.settings = { ...DEFAULT_STATE.settings };
  if (!data.jobDescriptions) data.jobDescriptions = [ ...DEFAULT_STATE.jobDescriptions ];
  if (!data.resumes) data.resumes = [];

  // Migration rules
  if (data.version < 1) {
    // Perform migrations for v0 -> v1 if needed
    // e.g. ensure all resumes have email/phone fields
    data.resumes.forEach(res => {
      if (res.email === undefined) res.email = '';
      if (res.phone === undefined) res.phone = '';
      if (res.status === undefined) res.status = 'Under Review';
    });
    
    data.version = 1;
  }

  // Ensure current version is set
  data.version = CURRENT_VERSION;
  return data;
}

/**
 * Loads data from localStorage safely
 * @returns {Object}
 */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Save default state immediately
      saveData(DEFAULT_STATE);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    
    const parsed = JSON.parse(raw);
    const migrated = migrate(parsed);
    
    // Save back migrated state
    saveData(migrated);
    return migrated;
  } catch (error) {
    console.error('Storage corrupted, resetting to defaults.', error);
    // Return default state but alert user or handle gracefully
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

/**
 * Saves data to localStorage
 * @param {Object} data 
 */
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to write to localStorage:', error);
  }
}

/**
 * Wipes all data and resets to default state
 */
export function resetData() {
  try {
    saveData(DEFAULT_STATE);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  } catch (error) {
    console.error('Failed to reset storage:', error);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}
