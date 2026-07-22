import { generateId, sanitizeHTML, formatDate, formatPercent, extractTextFromPDF } from './utils.js';
import { loadData, saveData, resetData, DEFAULT_STATE } from './storage.js';

// Application State
let state = loadData();
let activeView = 'dashboard';
let activeJdId = state.jobDescriptions.length > 0 ? state.jobDescriptions[0].id : null;

// Undo-Delete State
let deletedResumeBackup = null;
let toastTimeoutId = null;

// ==========================================================================
// DOM ELEMENTS CACHE
// ==========================================================================
const DOM = {
  // Navigation
  sidebar: document.getElementById('sidebar'),
  menuToggle: document.getElementById('menu-toggle'),
  pageTitle: document.getElementById('page-title'),
  btnNavDashboard: document.getElementById('btn-nav-dashboard'),
  btnNavResumes: document.getElementById('btn-nav-resumes'),
  btnNavJds: document.getElementById('btn-nav-jds'),
  btnNavSettings: document.getElementById('btn-nav-settings'),
  sidebarActiveJdName: document.getElementById('sidebar-active-jd-name'),
  
  // View Sections
  viewDashboard: document.getElementById('view-dashboard'),
  viewResumes: document.getElementById('view-resumes'),
  viewJds: document.getElementById('view-jds'),
  viewSettings: document.getElementById('view-settings'),
  
  // Dashboard Metrics
  statTotalResumes: document.getElementById('stat-total-resumes'),
  statShortlisted: document.getElementById('stat-shortlisted'),
  statInReview: document.getElementById('stat-in-review'),
  statRejected: document.getElementById('stat-rejected'),
  statAvgScore: document.getElementById('stat-avg-score'),
  
  // Dashboard Goal Tracker
  goalCurrent: document.getElementById('goal-current'),
  goalTarget: document.getElementById('goal-target'),
  goalPercentage: document.getElementById('goal-percentage'),
  goalProgressBar: document.getElementById('goal-progress-bar'),
  goalWarningMsg: document.getElementById('goal-warning-msg'),
  
  // Dashboard Charts & Lists
  distributionSvg: document.getElementById('distribution-svg'),
  leaderboardList: document.getElementById('leaderboard-list'),
  
  // Resumes View
  filterSearch: document.getElementById('filter-search'),
  filterJd: document.getElementById('filter-jd'),
  filterStatus: document.getElementById('filter-status'),
  filterSort: document.getElementById('filter-sort'),
  resumesListBody: document.getElementById('resumes-list-body'),
  btnGlobalAddResume: document.getElementById('btn-global-add-resume'),
  
  // JDs View
  jdsGrid: document.getElementById('jds-grid'),
  btnAddJd: document.getElementById('btn-add-jd'),
  
  // Settings View
  settingsApiKey: document.getElementById('settings-api-key'),
  btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),
  settingsModel: document.getElementById('settings-model'),
  settingsShortlistTarget: document.getElementById('settings-shortlist-target'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  btnExportJson: document.getElementById('btn-export-json'),
  btnImportJson: document.getElementById('btn-import-json'),
  btnClearDatabase: document.getElementById('btn-clear-database'),
  
  // Modal: Add Resume
  modalAddResume: document.getElementById('modal-add-resume'),
  formAddResume: document.getElementById('form-add-resume'),
  resumeCandidateName: document.getElementById('resume-candidate-name'),
  resumeCandidateEmail: document.getElementById('resume-candidate-email'),
  resumeCandidatePhone: document.getElementById('resume-candidate-phone'),
  resumeTargetJd: document.getElementById('resume-target-jd'),
  tabBtnFile: document.getElementById('tab-btn-file'),
  tabBtnPaste: document.getElementById('tab-btn-paste'),
  panelFile: document.getElementById('panel-file'),
  panelPaste: document.getElementById('panel-paste'),
  uploadDropzone: document.getElementById('upload-dropzone'),
  resumeFileInput: document.getElementById('resume-file-input'),
  fileLoadedIndicator: document.getElementById('file-loaded-indicator'),
  fileLoadedName: document.getElementById('file-loaded-name'),
  btnRemoveFile: document.getElementById('btn-remove-file'),
  resumePastedText: document.getElementById('resume-pasted-text'),
  btnCancelResume: document.getElementById('btn-cancel-resume'),
  btnCloseResumeModal: document.getElementById('btn-close-resume-modal'),
  btnSubmitResume: document.getElementById('btn-submit-resume'),
  
  // Modal: Add JD
  modalAddJd: document.getElementById('modal-add-jd'),
  jdModalTitle: document.getElementById('jd-modal-title'),
  formAddJd: document.getElementById('form-add-jd'),
  jdEditId: document.getElementById('jd-edit-id'),
  jdTitle: document.getElementById('jd-title'),
  jdDepartment: document.getElementById('jd-department'),
  jdDescription: document.getElementById('jd-description'),
  jdSkills: document.getElementById('jd-skills'),
  btnCancelJd: document.getElementById('btn-cancel-jd'),
  btnCloseJdModal: document.getElementById('btn-close-jd-modal'),
  
  // Modal: Report
  modalReport: document.getElementById('modal-report'),
  reportModalBody: document.getElementById('report-modal-body'),
  btnCloseReportModal: document.getElementById('btn-close-report-modal'),
  
  // Modal: Confirm
  modalConfirm: document.getElementById('modal-confirm'),
  confirmTitle: document.getElementById('confirm-title'),
  confirmMessage: document.getElementById('confirm-message'),
  btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
  btnConfirmOk: document.getElementById('btn-confirm-ok'),
  btnCloseConfirmModal: document.getElementById('btn-close-confirm-modal'),
  
  // Toast container
  toastContainer: document.getElementById('toast-container')
};

// Temp file holder for resume uploads
let selectedResumeFile = null;
let currentUploadTab = 'file'; // 'file' | 'paste'

// ==========================================================================
// TOAST ALERTS SYSTEM
// ==========================================================================
function showToast(message, type = 'info', undoCallback = null) {
  // Clear any existing timeouts to keep toast visible
  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
  }

  // Clear previous toasts
  DOM.toastContainer.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.role = 'alert';
  
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  if (undoCallback) {
    const undoBtn = document.createElement('button');
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = 'Undo';
    undoBtn.onclick = () => {
      undoCallback();
      toast.remove();
    };
    toast.appendChild(undoBtn);
  }

  DOM.toastContainer.appendChild(toast);

  // Auto remove after 5 seconds
  toastTimeoutId = setTimeout(() => {
    toast.style.animation = 'slideIn 200ms ease-out reverse';
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 5000);
}

// ==========================================================================
// RENDER METHODS
// ==========================================================================

function updateActiveJdIndicator() {
  const activeJd = state.jobDescriptions.find(j => j.id === activeJdId);
  if (activeJd) {
    DOM.sidebarActiveJdName.textContent = activeJd.title;
    DOM.sidebarActiveJdName.title = activeJd.title;
  } else {
    DOM.sidebarActiveJdName.textContent = 'None Selected';
    DOM.sidebarActiveJdName.title = 'None Selected';
  }
}

function renderAll() {
  updateActiveJdIndicator();
  renderActiveView();
  
  if (activeView === 'dashboard') {
    renderDashboard();
  } else if (activeView === 'resumes') {
    renderResumesList();
  } else if (activeView === 'jds') {
    renderJdList();
  } else if (activeView === 'settings') {
    renderSettingsView();
  }
}

function renderActiveView() {
  const navButtons = [DOM.btnNavDashboard, DOM.btnNavResumes, DOM.btnNavJds, DOM.btnNavSettings];
  const sections = [DOM.viewDashboard, DOM.viewResumes, DOM.viewJds, DOM.viewSettings];
  
  navButtons.forEach(btn => btn.classList.remove('active'));
  sections.forEach(sec => sec.classList.remove('active'));
  
  if (activeView === 'dashboard') {
    DOM.btnNavDashboard.classList.add('active');
    DOM.viewDashboard.classList.add('active');
    DOM.pageTitle.textContent = 'Dashboard';
  } else if (activeView === 'resumes') {
    DOM.btnNavResumes.classList.add('active');
    DOM.viewResumes.classList.add('active');
    DOM.pageTitle.textContent = 'Candidates Directory';
  } else if (activeView === 'jds') {
    DOM.btnNavJds.classList.add('active');
    DOM.viewJds.classList.add('active');
    DOM.pageTitle.textContent = 'Job Profiles';
  } else if (activeView === 'settings') {
    DOM.btnNavSettings.classList.add('active');
    DOM.viewSettings.classList.add('active');
    DOM.pageTitle.textContent = 'Settings & Configuration';
  }
}

function renderDashboard() {
  // Filter resumes matching active JD
  const activeResumes = activeJdId 
    ? state.resumes.filter(r => r.jobId === activeJdId) 
    : state.resumes;
    
  const total = activeResumes.length;
  const shortlisted = activeResumes.filter(r => r.status === 'Shortlist').length;
  const inReview = activeResumes.filter(r => r.status === 'Under Review').length;
  const rejected = activeResumes.filter(r => r.status === 'Reject').length;
  
  // Calculate average match score
  const scoredResumes = activeResumes.filter(r => r.screening && typeof r.screening.score === 'number');
  const avgScore = scoredResumes.length > 0 
    ? Math.round(scoredResumes.reduce((acc, curr) => acc + curr.screening.score, 0) / scoredResumes.length)
    : 0;

  // Set counters
  DOM.statTotalResumes.textContent = total;
  DOM.statShortlisted.textContent = shortlisted;
  DOM.statInReview.textContent = inReview;
  DOM.statRejected.textContent = rejected;
  DOM.statAvgScore.textContent = avgScore;

  // RENDER TARGET GOAL PROGRESS
  const target = state.settings.targetShortlist || 10;
  const pct = target > 0 ? Math.round((shortlisted / target) * 100) : 0;
  
  DOM.goalCurrent.textContent = shortlisted;
  DOM.goalTarget.textContent = target;
  DOM.goalPercentage.textContent = `${pct}%`;
  DOM.goalProgressBar.style.width = `${Math.min(pct, 100)}%`;
  
  // Warning triggers
  DOM.goalProgressBar.className = 'progress-bar';
  DOM.goalWarningMsg.className = 'progress-warning-msg';
  DOM.goalWarningMsg.textContent = '';
  
  if (pct >= 100) {
    DOM.goalProgressBar.classList.add('danger');
    DOM.goalWarningMsg.classList.add('danger');
    DOM.goalWarningMsg.textContent = 'Shortlist target fully achieved! Consider closing uploads.';
  } else if (pct >= 80) {
    DOM.goalProgressBar.classList.add('warning');
    DOM.goalWarningMsg.classList.add('warning');
    DOM.goalWarningMsg.textContent = 'Approaching target shortlist size (80%+ filled).';
  } else {
    DOM.goalWarningMsg.textContent = 'Accepting resumes for shortlist criteria.';
  }

  // RENDER CHART
  renderMatchDistributionChart(activeResumes);

  // RENDER LEADERBOARD
  renderLeaderboard(scoredResumes);
}

function renderMatchDistributionChart(resumes) {
  DOM.distributionSvg.innerHTML = '';
  
  // Score brackets
  const brackets = [
    { label: '0-20%', min: 0, max: 20, count: 0 },
    { label: '21-40%', min: 21, max: 40, count: 0 },
    { label: '41-60%', min: 41, max: 60, count: 0 },
    { label: '61-80%', min: 61, max: 80, count: 0 },
    { label: '81-100%', min: 81, max: 100, count: 0 }
  ];

  resumes.forEach(r => {
    if (r.screening && typeof r.screening.score === 'number') {
      const score = r.screening.score;
      const bracket = brackets.find(b => score >= b.min && score <= b.max);
      if (bracket) bracket.count++;
    }
  });

  const maxCount = Math.max(...brackets.map(b => b.count), 1);
  const width = 400;
  const height = 200;
  const paddingLeft = 30;
  const paddingBottom = 30;
  const paddingTop = 20;
  const paddingRight = 10;
  
  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;
  const barWidth = (graphWidth / brackets.length) - 16;

  // Add grid lines (horizontal)
  const gridLinesCount = Math.min(maxCount, 5);
  for (let i = 0; i <= gridLinesCount; i++) {
    const yVal = paddingTop + (graphHeight * (1 - i / gridLinesCount));
    const labelVal = Math.round((maxCount / gridLinesCount) * i);
    
    // Line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', paddingLeft);
    line.setAttribute('y1', yVal);
    line.setAttribute('x2', width - paddingRight);
    line.setAttribute('y2', yVal);
    line.setAttribute('class', 'chart-axis');
    line.setAttribute('style', 'opacity: 0.3');
    DOM.distributionSvg.appendChild(line);

    // Y Axis label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', paddingLeft - 8);
    text.setAttribute('y', yVal + 3);
    text.setAttribute('class', 'chart-text');
    text.setAttribute('style', 'text-anchor: end');
    text.textContent = labelVal;
    DOM.distributionSvg.appendChild(text);
  }

  // Draw Bars & Labels
  brackets.forEach((b, idx) => {
    const x = paddingLeft + (idx * (graphWidth / brackets.length)) + 8;
    const barHeight = (b.count / maxCount) * graphHeight;
    const y = paddingTop + graphHeight - barHeight;

    // Bar
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', Math.max(barHeight, 2)); // Minimum 2px bar height for visibility
    rect.setAttribute('class', 'chart-bar');
    
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${b.count} candidate(s) in range ${b.label}`;
    rect.appendChild(title);
    
    DOM.distributionSvg.appendChild(rect);

    // X Axis Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x + barWidth / 2);
    text.setAttribute('y', height - 10);
    text.setAttribute('class', 'chart-text');
    text.setAttribute('style', 'text-anchor: middle');
    text.textContent = b.label.split('%')[0] + '%';
    DOM.distributionSvg.appendChild(text);

    // Value on top of bar (if count > 0)
    if (b.count > 0) {
      const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valText.setAttribute('x', x + barWidth / 2);
      valText.setAttribute('y', y - 6);
      valText.setAttribute('class', 'chart-text-value');
      valText.textContent = b.count;
      DOM.distributionSvg.appendChild(valText);
    }
  });

  // Base Axis Line
  const baseLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  baseLine.setAttribute('x1', paddingLeft);
  baseLine.setAttribute('y1', height - paddingBottom);
  baseLine.setAttribute('x2', width - paddingRight);
  baseLine.setAttribute('y2', height - paddingBottom);
  baseLine.setAttribute('class', 'chart-axis');
  DOM.distributionSvg.appendChild(baseLine);
}

function renderLeaderboard(scoredResumes) {
  DOM.leaderboardList.innerHTML = '';
  
  const leaderboardItems = [...scoredResumes]
    .sort((a, b) => b.screening.score - a.screening.score)
    .slice(0, 5);

  if (leaderboardItems.length === 0) {
    DOM.leaderboardList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <p>No candidates screened yet for active job.</p>
      </div>`;
    return;
  }

  leaderboardItems.forEach((r, idx) => {
    const item = document.createElement('div');
    item.className = 'leaderboard-item';
    item.onclick = () => openReportModal(r.id);
    item.style.cursor = 'pointer';
    
    item.innerHTML = `
      <span class="leaderboard-rank">#${idx + 1}</span>
      <span class="leaderboard-name">${sanitizeHTML(r.candidateName)}</span>
      <span class="leaderboard-score">${r.screening.score}%</span>
    `;
    DOM.leaderboardList.appendChild(item);
  });
}

function renderResumesList() {
  DOM.resumesListBody.innerHTML = '';

  const searchQuery = DOM.filterSearch.value.trim().toLowerCase();
  const jdFilter = DOM.filterJd.value;
  const statusFilter = DOM.filterStatus.value;
  const sortOption = DOM.filterSort.value;

  // Filter list
  let filtered = state.resumes.filter(r => {
    const matchesSearch = searchQuery === '' 
      || r.candidateName.toLowerCase().includes(searchQuery)
      || (r.email && r.email.toLowerCase().includes(searchQuery))
      || (r.screening && r.screening.summary && r.screening.summary.toLowerCase().includes(searchQuery));
      
    const matchesJd = jdFilter === 'all' || r.jobId === jdFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesJd && matchesStatus;
  });

  // Sort list
  filtered.sort((a, b) => {
    if (sortOption === 'date-desc') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortOption === 'date-asc') return new Date(a.createdAt) - new Date(b.createdAt);
    
    if (sortOption === 'score-desc') {
      const scoreA = a.screening ? a.screening.score : -1;
      const scoreB = b.screening ? b.screening.score : -1;
      return scoreB - scoreA;
    }
    if (sortOption === 'score-asc') {
      const scoreA = a.screening ? a.screening.score : 101;
      const scoreB = b.screening ? b.screening.score : 101;
      return scoreA - scoreB;
    }
    if (sortOption === 'name-asc') return a.candidateName.localeCompare(b.candidateName);
    return 0;
  });

  if (filtered.length === 0) {
    DOM.resumesListBody.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No candidates found matching the filters.</p>
      </div>`;
    return;
  }

  // GROUP BY DAY
  // Group contiguous items on the same calendar day
  const groups = [];
  let currentGroup = null;

  filtered.forEach(r => {
    const dateStr = new Date(r.createdAt).toDateString();
    if (!currentGroup || currentGroup.dateStr !== dateStr) {
      currentGroup = {
        dateStr,
        formattedDate: formatDate(r.createdAt) || 'Today',
        resumes: []
      };
      groups.push(currentGroup);
    }
    currentGroup.resumes.push(r);
  });

  groups.forEach(group => {
    // Group Header Row
    const header = document.createElement('div');
    header.className = 'day-group-header';
    header.innerHTML = `
      <span>${group.formattedDate}</span>
      <span class="day-group-count">${group.resumes.length} Candidate(s)</span>
    `;
    DOM.resumesListBody.appendChild(header);

    // Group Content Rows
    group.resumes.forEach(r => {
      const jd = state.jobDescriptions.find(j => j.id === r.jobId);
      const jdTitle = jd ? jd.title : 'Deleted Profile';
      
      const score = r.screening ? r.screening.score : null;
      let scoreClass = 'score-none';
      let scoreText = 'N/A';
      if (score !== null) {
        scoreText = `${score}%`;
        if (score >= 75) scoreClass = 'score-high';
        else if (score >= 45) scoreClass = 'score-mid';
        else scoreClass = 'score-low';
      }

      let badgeClass = 'unread';
      if (r.status === 'Shortlist') badgeClass = 'shortlist';
      else if (r.status === 'Under Review') badgeClass = 'review';
      else if (r.status === 'Reject') badgeClass = 'reject';

      const row = document.createElement('div');
      row.className = 'resume-row';
      row.innerHTML = `
        <div class="col-candidate">
          <span class="cand-name">${sanitizeHTML(r.candidateName)}</span>
          <span class="cand-email">${sanitizeHTML(r.email || 'No email')}</span>
        </div>
        <div class="col-jd">${sanitizeHTML(jdTitle)}</div>
        <div class="col-score ${scoreClass}"><span>${scoreText}</span></div>
        <div class="col-status">
          <span class="status-badge ${badgeClass}">${r.status}</span>
        </div>
        <div class="col-date">${formatDate(r.createdAt)}</div>
        <div class="col-actions">
          <button class="action-icon-btn btn-view" title="View Screening Report" data-id="${r.id}" aria-label="View Screening Report">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </button>
          <button class="action-icon-btn btn-delete" title="Delete Candidate" data-id="${r.id}" aria-label="Delete Candidate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      `;
      
      // Bind actions
      row.querySelector('.btn-view').onclick = () => openReportModal(r.id);
      row.querySelector('.btn-delete').onclick = () => deleteCandidate(r.id);
      
      DOM.resumesListBody.appendChild(row);
    });
  });
}

function renderJdList() {
  DOM.jdsGrid.innerHTML = '';
  
  if (state.jobDescriptions.length === 0) {
    DOM.jdsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📁</div>
        <p>No job descriptions configured. Create one to begin evaluation.</p>
      </div>`;
    return;
  }

  state.jobDescriptions.forEach(jd => {
    const card = document.createElement('div');
    const isActive = jd.id === activeJdId;
    card.className = `jd-card ${isActive ? 'active' : ''}`;
    
    // Parse skills as chips
    const skillsArray = jd.skills ? jd.skills.split(',').map(s => s.trim()).filter(s => s) : [];
    const skillsHtml = skillsArray.map(s => `<span class="jd-tag">${sanitizeHTML(s)}</span>`).join('');
    
    card.innerHTML = `
      <div class="jd-card-header">
        <div class="jd-card-title-group">
          <h3 class="jd-card-title" title="${sanitizeHTML(jd.title)}">${sanitizeHTML(jd.title)}</h3>
          <span class="jd-card-dept">${sanitizeHTML(jd.department || 'General')}</span>
        </div>
      </div>
      <p class="jd-card-desc">${sanitizeHTML(jd.description)}</p>
      <div class="jd-card-tags">
        ${skillsHtml || '<span class="jd-tag" style="opacity:0.5">No skill tokens</span>'}
      </div>
      <div class="jd-card-footer">
        <label class="active-radio">
          <input type="radio" name="active-jd-group" value="${jd.id}" ${isActive ? 'checked' : ''}>
          <span>Select Active</span>
        </label>
        <div class="jd-card-actions">
          <button class="action-icon-btn btn-edit" title="Edit Profile" aria-label="Edit Profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
          </button>
          <button class="action-icon-btn btn-delete" title="Delete Profile" aria-label="Delete Profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>
    `;

    // Radio select
    card.querySelector('input[type="radio"]').onchange = () => {
      activeJdId = jd.id;
      renderAll();
    };

    // Actions
    card.querySelector('.btn-edit').onclick = () => openJdModal(jd.id);
    card.querySelector('.btn-delete').onclick = () => deleteJobDescription(jd.id);

    DOM.jdsGrid.appendChild(card);
  });
}

function renderSettingsView() {
  DOM.settingsApiKey.value = state.settings.apiKey || '';
  DOM.settingsModel.value = state.settings.model || 'gemini-1.5-flash';
  DOM.settingsShortlistTarget.value = state.settings.targetShortlist || 10;
}

// ==========================================================================
// MODAL ACTIONS & STATE TRIGGERS
// ==========================================================================

function openJdModal(jdId = null) {
  if (jdId) {
    // Edit Mode
    const jd = state.jobDescriptions.find(j => j.id === jdId);
    if (!jd) return;
    DOM.jdModalTitle.textContent = 'Edit Job Profile';
    DOM.jdEditId.value = jd.id;
    DOM.jdTitle.value = jd.title;
    DOM.jdDepartment.value = jd.department || '';
    DOM.jdDescription.value = jd.description;
    DOM.jdSkills.value = jd.skills || '';
  } else {
    // Create Mode
    DOM.jdModalTitle.textContent = 'Create Job Profile';
    DOM.jdEditId.value = '';
    DOM.formAddJd.reset();
  }
  openModal(DOM.modalAddJd);
}

function openModal(modalEl) {
  modalEl.classList.add('active');
  modalEl.setAttribute('aria-hidden', 'false');
  // Set focus to the first input element for accessibility
  const firstInput = modalEl.querySelector('input, select, textarea, button');
  if (firstInput) firstInput.focus();
}

function closeModal(modalEl) {
  modalEl.classList.remove('active');
  modalEl.setAttribute('aria-hidden', 'true');
}

function toggleUploadTab(tab) {
  currentUploadTab = tab;
  if (tab === 'file') {
    DOM.tabBtnFile.classList.add('active');
    DOM.tabBtnPaste.classList.remove('active');
    DOM.panelFile.classList.add('active');
    DOM.panelPaste.classList.add('active'); // Wait, panel paste active should be removed
    DOM.panelPaste.classList.remove('active');
  } else {
    DOM.tabBtnPaste.classList.add('active');
    DOM.tabBtnFile.classList.remove('active');
    DOM.panelPaste.classList.add('active');
    DOM.panelFile.classList.remove('active');
  }
}

// Dynamic dropdown lists
function populateDropdowns() {
  // Resume Modal target JD select
  DOM.resumeTargetJd.innerHTML = '';
  DOM.filterJd.innerHTML = '<option value="all">All Job Profiles</option>';

  if (state.jobDescriptions.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No Job Profiles Configured';
    DOM.resumeTargetJd.appendChild(opt);
    return;
  }

  state.jobDescriptions.forEach(jd => {
    const opt = document.createElement('option');
    opt.value = jd.id;
    opt.textContent = jd.title;
    DOM.resumeTargetJd.appendChild(opt.cloneNode(true));
    DOM.filterJd.appendChild(opt.cloneNode(true));
  });

  if (activeJdId) {
    DOM.resumeTargetJd.value = activeJdId;
    DOM.filterJd.value = activeJdId;
  }
}

// Open detailed evaluation report
function openReportModal(resumeId) {
  const r = state.resumes.find(item => item.id === resumeId);
  if (!r) return;

  const jd = state.jobDescriptions.find(j => j.id === r.jobId);
  const jdTitle = jd ? jd.title : 'Deleted Profile';

  let scoreText = 'N/A';
  let ratingClass = 'score-none';
  if (r.screening && typeof r.screening.score === 'number') {
    scoreText = `${r.screening.score}`;
    if (r.screening.score >= 75) ratingClass = 'score-high';
    else if (r.screening.score >= 45) ratingClass = 'score-mid';
    else ratingClass = 'score-low';
  }

  const strengthsHtml = r.screening && r.screening.strengths
    ? r.screening.strengths.map(s => `<li>${sanitizeHTML(s)}</li>`).join('')
    : '<li>No strengths generated</li>';

  const gapsHtml = r.screening && r.screening.gaps
    ? r.screening.gaps.map(g => `<li>${sanitizeHTML(g)}</li>`).join('')
    : '<li>No major gaps reported</li>';

  const questionsHtml = r.screening && r.screening.interviewQuestions
    ? r.screening.interviewQuestions.map(q => `<div class="q-item">${sanitizeHTML(q)}</div>`).join('')
    : '<div>No recommended questions</div>';

  DOM.reportModalBody.innerHTML = `
    <div class="report-grid">
      <!-- Sidebar stats -->
      <div class="report-aside">
        <div class="report-gauge-card">
          <div class="gauge-title">Match Percentage</div>
          <div class="gauge-score ${ratingClass}">${scoreText}<span class="gauge-max">%</span></div>
        </div>
        <div class="report-meta-list">
          <div class="report-meta-item">
            <label>Candidate</label>
            <span>${sanitizeHTML(r.candidateName)}</span>
          </div>
          <div class="report-meta-item">
            <label>Applied Role</label>
            <span>${sanitizeHTML(jdTitle)}</span>
          </div>
          <div class="report-meta-item">
            <label>Experience Match</label>
            <span>${sanitizeHTML(r.screening ? r.screening.experienceLevel : 'Unknown')}</span>
          </div>
          <div class="report-meta-item">
            <label>Evaluation Date</label>
            <span>${formatDate(r.createdAt)}</span>
          </div>
          <div class="report-meta-item">
            <label>Current Status</label>
            <div class="status-wrapper">
              <div class="select-wrapper">
                <select id="report-change-status" data-id="${r.id}">
                  <option value="Under Review" ${r.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                  <option value="Shortlist" ${r.status === 'Shortlist' ? 'selected' : ''}>Shortlisted</option>
                  <option value="Reject" ${r.status === 'Reject' ? 'selected' : ''}>Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main report content -->
      <div class="report-main">
        <div class="report-section">
          <h3>Match Summary Evaluation</h3>
          <p class="report-summary-text">${sanitizeHTML(r.screening ? r.screening.summary : 'No evaluation report available.')}</p>
        </div>

        <div class="report-bullets-grid">
          <div class="bullet-card strengths">
            <h4>Key Strengths</h4>
            <ul class="bullet-list strengths-list">
              ${strengthsHtml}
            </ul>
          </div>
          <div class="bullet-card gaps">
            <h4>Critical Gaps</h4>
            <ul class="bullet-list gaps-list">
              ${gapsHtml}
            </ul>
          </div>
        </div>

        <div class="report-section">
          <h3>Tailored Interview Questions</h3>
          <div class="q-list">
            ${questionsHtml}
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind change handler
  DOM.reportModalBody.querySelector('#report-change-status').onchange = (e) => {
    updateCandidateStatus(e.target.dataset.id, e.target.value);
  };

  openModal(DOM.modalReport);
}

function updateCandidateStatus(id, newStatus) {
  const index = state.resumes.findIndex(r => r.id === id);
  if (index !== -1) {
    state.resumes[index].status = newStatus;
    state.resumes[index].updatedAt = new Date().toISOString();
    saveData(state);
    renderAll();
    showToast(`Status updated to: ${newStatus}`, 'success');
  }
}

// Confirm dialog callback placeholder
let confirmCallback = null;
function openConfirmModal(title, msg, onConfirm) {
  DOM.confirmTitle.textContent = title;
  DOM.confirmMessage.textContent = msg;
  confirmCallback = onConfirm;
  openModal(DOM.modalConfirm);
}

// ==========================================================================
// BUSINESS LOGIC: CANDIDATES & JD CRUD OPERATIONS
// ==========================================================================

function deleteCandidate(id) {
  const idx = state.resumes.findIndex(r => r.id === id);
  if (idx !== -1) {
    deletedResumeBackup = state.resumes[idx];
    state.resumes.splice(idx, 1);
    saveData(state);
    renderAll();
    
    showToast(`${deletedResumeBackup.candidateName}'s profile deleted.`, 'warning', () => {
      // Undo callback
      if (deletedResumeBackup) {
        state.resumes.push(deletedResumeBackup);
        saveData(state);
        deletedResumeBackup = null;
        renderAll();
        showToast('Restore successful.', 'success');
      }
    });
  }
}

function deleteJobDescription(id) {
  // Prevent deletion of default if it's the last one, or warn
  const count = state.resumes.filter(r => r.jobId === id).length;
  const msg = count > 0 
    ? `There are ${count} candidates associated with this Job Profile. Deleting this profile will leave those candidates without an associated role profile. Continue?`
    : `Are you sure you want to delete this Job Profile?`;
    
  openConfirmModal('Delete Job Profile', msg, () => {
    state.jobDescriptions = state.jobDescriptions.filter(j => j.id !== id);
    if (activeJdId === id) {
      activeJdId = state.jobDescriptions.length > 0 ? state.jobDescriptions[0].id : null;
    }
    saveData(state);
    populateDropdowns();
    renderAll();
    showToast('Job Profile deleted successfully.', 'success');
  });
}

// ==========================================================================
// GEMINI INTELLIGENCE API CONNECTIONS
// ==========================================================================

async function screenCandidate(candidateName, email, phone, jobId, rawResumeText) {
  const jd = state.jobDescriptions.find(j => j.id === jobId);
  if (!jd) {
    throw new Error('Associated Job Profile not found. Select a valid profile.');
  }

  // Display screening loader
  DOM.reportModalBody.innerHTML = `
    <div class="screening-loader">
      <div class="spinner"></div>
      <h3>Evaluating Candidate Profile via Gemini</h3>
      <p>Analyzing resume matching parameters against <strong>${sanitizeHTML(jd.title)}</strong> requirements...</p>
    </div>
  `;
  openModal(DOM.modalReport);

  try {
    const report = await callGeminiAPI(rawResumeText, jd.description, jd.skills);
    
    // Add resume records
    const newResume = {
      id: generateId(),
      candidateName,
      email,
      phone,
      resumeText: rawResumeText,
      jobId,
      status: report.recommendation || 'Under Review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      screening: report
    };

    state.resumes.push(newResume);
    saveData(state);
    
    // Close modal first and open report modal
    closeModal(DOM.modalReport);
    renderAll();
    openReportModal(newResume.id);
    showToast(`Successfully screened candidate: ${candidateName}`, 'success');
  } catch (error) {
    console.error('API Error:', error);
    closeModal(DOM.modalReport);
    showToast(`AI Screening Failed: ${error.message}`, 'error');
  }
}

async function callGeminiAPI(resumeText, jdText, keywords = '') {
  const apiKey = state.settings.apiKey;
  const model = state.settings.model || 'gemini-1.5-flash';
  
  if (!apiKey) {
    // RUN IN MOCK FALLBACK MODE
    return runMockScreening(resumeText, jdText, keywords);
  }

  const prompt = `
  You are an expert technical recruiter. Evaluate the following candidate resume against the Job Description requirements.
  
  Format instructions:
  You must output a single, valid JSON object matching the JSON schema below. Do not output any HTML markdown wrapping blocks, extra comments, or formatting strings other than the JSON itself.
  
  JSON Schema specifications:
  {
    "type": "object",
    "properties": {
      "score": {
        "type": "integer",
        "description": "An overall suitability rating score from 0 to 100 based on core skills and requirement match."
      },
      "summary": {
        "type": "string",
        "description": "A concise summary (1-2 sentences) evaluating why the candidate matches or lags behind."
      },
      "strengths": {
        "type": "array",
        "items": { "type": "string" },
        "description": "List of top 2-4 candidate strengths, relevant experiences, or skill matches."
      },
      "gaps": {
        "type": "array",
        "items": { "type": "string" },
        "description": "List of top 1-3 core qualification/skill gaps or deficiencies compared to the JD."
      },
      "experienceLevel": {
        "type": "string",
        "enum": ["Poor", "Medium", "Strong"],
        "description": "The overall experience match level."
      },
      "interviewQuestions": {
        "type": "array",
        "items": { "type": "string" },
        "description": "List of 2-3 tailored behavioral or technical interview questions to verify candidate's fit."
      },
      "recommendation": {
        "type": "string",
        "enum": ["Shortlist", "Under Review", "Reject"],
        "description": "Final sorting recommendation based on scores."
      }
    },
    "required": ["score", "summary", "strengths", "gaps", "experienceLevel", "interviewQuestions", "recommendation"]
  }

  Job Description Details:
  ${jdText}
  ${keywords ? `Target keywords to scan for: ${keywords}` : ''}
  
  Candidate Resume Content:
  ${resumeText}
  `;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errorMsg = errorJson?.error?.message || `HTTP error! Status: ${response.status}`;
      throw new Error(errorMsg);
    }

    const resData = await response.json();
    const candidateTextOutput = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateTextOutput) {
      throw new Error('Gemini API returned an empty content output block.');
    }

    const report = JSON.parse(candidateTextOutput.trim());
    return report;
  } catch (error) {
    throw new Error(`Gemini evaluation failed: ${error.message}`);
  }
}

/**
 * High quality simulated response generator when API key is missing
 */
function runMockScreening(resumeText, jdText, keywords = '') {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Analyze text for overlap
      const resumeLower = resumeText.toLowerCase();
      const jdLower = jdText.toLowerCase();
      const skillsArray = keywords ? keywords.split(',').map(s => s.trim().toLowerCase()).filter(s => s) : [];

      let score = 50; // base score
      const matches = [];
      const gaps = [];

      // Simple keyword matching checks
      const checks = [
        { name: 'javascript', weight: 8 },
        { name: 'typescript', weight: 8 },
        { name: 'html', weight: 5 },
        { name: 'css', weight: 5 },
        { name: 'database', weight: 6 },
        { name: 'system design', weight: 10 },
        { name: 'node', weight: 6 },
        { name: 'react', weight: 8 },
        { name: 'lead', weight: 10 },
        { name: 'senior', weight: 8 }
      ];

      checks.forEach(c => {
        if (resumeLower.includes(c.name) && jdLower.includes(c.name)) {
          score += c.weight;
          matches.push(c.name);
        } else if (jdLower.includes(c.name)) {
          gaps.push(c.name);
        }
      });

      // Keywords from active JD specific list
      skillsArray.forEach(skill => {
        if (resumeLower.includes(skill)) {
          score += 6;
          if (!matches.includes(skill)) matches.push(skill);
        } else {
          if (!gaps.includes(skill)) gaps.push(skill);
        }
      });

      // Clamp score
      score = Math.min(Math.max(score, 15), 98);

      let recommendation = 'Under Review';
      let experienceLevel = 'Medium';
      if (score >= 75) {
        recommendation = 'Shortlist';
        experienceLevel = 'Strong';
      } else if (score < 45) {
        recommendation = 'Reject';
        experienceLevel = 'Poor';
      }

      const matchLabels = matches.map(m => m.charAt(0).toUpperCase() + m.slice(1));
      const gapLabels = gaps.slice(0, 3).map(g => g.charAt(0).toUpperCase() + g.slice(1));

      const strengths = matchLabels.length > 0
        ? matchLabels.slice(0, 3).map(m => `Demonstrated technical capability in ${m}`)
        : ['Has base layout experience matches', 'Good resume formatting details'];
        
      if (resumeLower.length > 500) {
        strengths.push('Detailed career history listed');
      }

      const gapsList = gapLabels.length > 0
        ? gapLabels.map(g => `Lacks explicitly demonstrated experience with ${g}`)
        : ['Could expand on advanced technical scale components'];

      const result = {
        score,
        summary: `[DEMO MODE] Candidate suitability evaluated at ${score}%. Strengths include key overlap in ${matchLabels.slice(0, 2).join(', ') || 'general sectors'}. Gaps noted in ${gapLabels.slice(0, 2).join(', ') || 'none'}.`,
        strengths,
        gaps: gapsList,
        experienceLevel,
        interviewQuestions: [
          `Can you detail your practical experience handling projects that required ${matchLabels[0] || 'software architecture design'}?`,
          `How would you bridge the gap regarding your unfamiliarity with ${gapLabels[0] || 'certain backend frameworks'}?`,
          `Discuss a complex technical challenge you solved at your last job.`
        ],
        recommendation
      };

      showToast('Evaluation run in Demo Mode. Provide a Gemini API Key in settings to enable actual LLM screening.', 'info');
      resolve(result);
    }, 1500);
  });
}

// ==========================================================================
// DATABASE EXPORT / IMPORT CONTROLLERS
// ==========================================================================

function exportToCSV() {
  if (state.resumes.length === 0) {
    showToast('No candidates available to export.', 'warning');
    return;
  }

  // Define headers
  const headers = ['Candidate Name', 'Email', 'Phone', 'Applied Role', 'Match Score (%)', 'Status', 'Date Evaluated', 'Evaluation Summary'];
  
  const rows = state.resumes.map(r => {
    const jd = state.jobDescriptions.find(j => j.id === r.jobId);
    const jdTitle = jd ? jd.title : 'Deleted Profile';
    const score = r.screening ? r.screening.score : 'N/A';
    const summary = r.screening ? r.screening.summary.replace(/"/g, '""') : '';

    return [
      `"${r.candidateName.replace(/"/g, '""')}"`,
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${(r.phone || '').replace(/"/g, '""')}"`,
      `"${jdTitle.replace(/"/g, '""')}"`,
      score,
      `"${r.status}"`,
      `"${new Date(r.createdAt).toISOString()}"`,
      `"${summary}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `TalentScan_Candidates_Backup_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Candidates list exported to CSV.', 'success');
}

function exportToJSON() {
  const jsonContent = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `TalentScan_Database_Backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Database backup exported to JSON.', 'success');
}

function importFromJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      
      // Basic Validation
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Root level element must be an object.');
      }
      
      // Upgrade database
      const migrated = loadData(); // Call loadData to get structure, then overwrite components safely
      
      if (parsed.settings) migrated.settings = { ...migrated.settings, ...parsed.settings };
      if (Array.isArray(parsed.jobDescriptions)) migrated.jobDescriptions = parsed.jobDescriptions;
      if (Array.isArray(parsed.resumes)) migrated.resumes = parsed.resumes;
      
      // Validate schema variables
      migrated.jobDescriptions.forEach((jd, idx) => {
        if (!jd.id || !jd.title || !jd.description) {
          throw new Error(`Job Profile at index ${idx} is missing required properties (id, title, or description).`);
        }
      });
      
      migrated.resumes.forEach((res, idx) => {
        if (!res.id || !res.candidateName || !res.jobId || !res.status) {
          throw new Error(`Candidate record at index ${idx} is missing required fields (id, candidateName, jobId, or status).`);
        }
      });

      state = migrated;
      saveData(state);
      
      // Reset active JD if old one is missing
      if (state.jobDescriptions.length > 0) {
        if (!state.jobDescriptions.some(j => j.id === activeJdId)) {
          activeJdId = state.jobDescriptions[0].id;
        }
      } else {
        activeJdId = null;
      }
      
      populateDropdowns();
      renderAll();
      showToast('Database backup successfully restored!', 'success');
    } catch (err) {
      console.error(err);
      openConfirmModal('Import Error', `Failed to parse database backup JSON: ${err.message}`, () => {});
    }
  };
  reader.readAsText(file);
  DOM.btnImportJson.value = ''; // Reset file input trigger
}

// ==========================================================================
// EVENT LISTENERS BINDING
// ==========================================================================

// Global nav link clicks
DOM.btnNavDashboard.onclick = () => { activeView = 'dashboard'; renderAll(); };
DOM.btnNavResumes.onclick = () => { activeView = 'resumes'; renderAll(); };
DOM.btnNavJds.onclick = () => { activeView = 'jds'; renderAll(); };
DOM.btnNavSettings.onclick = () => { activeView = 'settings'; renderAll(); };

// Sidebar menu toggling on mobile
DOM.menuToggle.onclick = () => {
  DOM.sidebar.classList.toggle('active');
};

// Document Click Close Sidebar
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768) {
    if (!DOM.sidebar.contains(e.target) && !DOM.menuToggle.contains(e.target) && DOM.sidebar.classList.contains('active')) {
      DOM.sidebar.classList.remove('active');
    }
  }
});

// Settings configuration saves
DOM.btnSaveSettings.onclick = () => {
  state.settings.apiKey = DOM.settingsApiKey.value.trim();
  state.settings.model = DOM.settingsModel.value;
  state.settings.targetShortlist = parseInt(DOM.settingsShortlistTarget.value) || 10;
  
  saveData(state);
  renderAll();
  showToast('Configuration settings updated successfully!', 'success');
};

// Backup controls
DOM.btnExportCsv.onclick = exportToCSV;
DOM.btnExportJson.onclick = exportToJSON;
DOM.btnImportJson.onchange = (e) => {
  if (e.target.files.length > 0) {
    importFromJSON(e.target.files[0]);
  }
};

// Factory Reset Data
DOM.btnClearDatabase.onclick = () => {
  openConfirmModal(
    'Factory Reset System Data',
    'Are you sure you want to run a complete reset? All job description templates, API configs, and candidate resume evaluations will be completely wiped out. This is irreversible.',
    () => {
      state = resetData();
      activeJdId = state.jobDescriptions[0].id;
      populateDropdowns();
      renderAll();
      closeModal(DOM.modalConfirm);
      showToast('System database reset to initial defaults.', 'info');
    }
  );
};

// Mask/Unmask API Key visibility toggles
DOM.btnToggleKeyVisibility.onclick = () => {
  const isPwd = DOM.settingsApiKey.type === 'password';
  DOM.settingsApiKey.type = isPwd ? 'text' : 'password';
  DOM.btnToggleKeyVisibility.innerHTML = isPwd 
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-closed"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-open"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
};

// ==================== CANDIDATE RESUME MODAL & FORMS ====================
DOM.btnGlobalAddResume.onclick = () => {
  populateDropdowns();
  if (state.jobDescriptions.length === 0) {
    showToast('Configure a Job Profile before screening candidates.', 'warning');
    activeView = 'jds';
    renderAll();
    return;
  }
  
  DOM.formAddResume.reset();
  selectedResumeFile = null;
  DOM.fileLoadedIndicator.style.display = 'none';
  DOM.uploadDropzone.style.display = 'flex';
  toggleUploadTab('file');
  openModal(DOM.modalAddResume);
};

DOM.btnCancelResume.onclick = () => closeModal(DOM.modalAddResume);
DOM.btnCloseResumeModal.onclick = () => closeModal(DOM.modalAddResume);
DOM.tabBtnFile.onclick = () => toggleUploadTab('file');
DOM.tabBtnPaste.onclick = () => toggleUploadTab('paste');

// Upload drag and drop handlers
DOM.uploadDropzone.onclick = () => DOM.resumeFileInput.click();

DOM.uploadDropzone.ondragover = (e) => {
  e.preventDefault();
  DOM.uploadDropzone.classList.add('dragover');
};

DOM.uploadDropzone.ondragleave = () => {
  DOM.uploadDropzone.classList.remove('dragover');
};

DOM.uploadDropzone.ondrop = (e) => {
  e.preventDefault();
  DOM.uploadDropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    handleResumeFileSelection(e.dataTransfer.files[0]);
  }
};

DOM.resumeFileInput.onchange = (e) => {
  if (e.target.files.length > 0) {
    handleResumeFileSelection(e.target.files[0]);
  }
};

function handleResumeFileSelection(file) {
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf') && !file.name.endsWith('.txt')) {
    showToast('Invalid file format. Only PDF and TXT documents are accepted.', 'error');
    return;
  }
  
  selectedResumeFile = file;
  DOM.fileLoadedName.textContent = file.name;
  DOM.uploadDropzone.style.display = 'none';
  DOM.fileLoadedIndicator.style.display = 'flex';
}

DOM.btnRemoveFile.onclick = () => {
  selectedResumeFile = null;
  DOM.resumeFileInput.value = '';
  DOM.fileLoadedIndicator.style.display = 'none';
  DOM.uploadDropzone.style.display = 'flex';
};

DOM.formAddResume.onsubmit = async (e) => {
  e.preventDefault();
  
  const name = DOM.resumeCandidateName.value.trim();
  const email = DOM.resumeCandidateEmail.value.trim();
  const phone = DOM.resumeCandidatePhone.value.trim();
  const jobId = DOM.resumeTargetJd.value;

  let resumeText = '';
  
  if (currentUploadTab === 'file') {
    if (!selectedResumeFile) {
      showToast('Please select or upload a resume file first.', 'warning');
      return;
    }
    
    // Parse PDF/Txt
    try {
      DOM.btnSubmitResume.disabled = true;
      DOM.btnSubmitResume.textContent = 'Extracting text...';
      
      if (selectedResumeFile.type === 'application/pdf' || selectedResumeFile.name.endsWith('.pdf')) {
        const arrayBuffer = await selectedResumeFile.arrayBuffer();
        resumeText = await extractTextFromPDF(arrayBuffer);
      } else {
        // Text file
        resumeText = await selectedResumeFile.text();
      }
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
      DOM.btnSubmitResume.disabled = false;
      DOM.btnSubmitResume.textContent = 'Save Candidate';
      return;
    } finally {
      DOM.btnSubmitResume.disabled = false;
      DOM.btnSubmitResume.textContent = 'Save Candidate';
    }
  } else {
    // Paste text tab
    resumeText = DOM.resumePastedText.value.trim();
    if (!resumeText) {
      showToast('Please paste the candidate resume text details.', 'warning');
      return;
    }
  }

  if (!resumeText) {
    showToast('Failed to extract readable content from resume.', 'error');
    return;
  }

  closeModal(DOM.modalAddResume);
  screenCandidate(name, email, phone, jobId, resumeText);
};

// ==================== JOB PROFILE DESCRIPTION MODAL & FORMS ====================
DOM.btnAddJd.onclick = () => openJdModal();
DOM.btnCancelJd.onclick = () => closeModal(DOM.modalAddJd);
DOM.btnCloseJdModal.onclick = () => closeModal(DOM.modalAddJd);

DOM.formAddJd.onsubmit = (e) => {
  e.preventDefault();
  
  const id = DOM.jdEditId.value;
  const title = DOM.jdTitle.value.trim();
  const department = DOM.jdDepartment.value.trim();
  const description = DOM.jdDescription.value.trim();
  const skills = DOM.jdSkills.value.trim();

  if (id) {
    // Update
    const idx = state.jobDescriptions.findIndex(j => j.id === id);
    if (idx !== -1) {
      state.jobDescriptions[idx] = {
        ...state.jobDescriptions[idx],
        title,
        department,
        description,
        skills,
        updatedAt: new Date().toISOString()
      };
      showToast('Job Profile details updated.', 'success');
    }
  } else {
    // Create
    const newJd = {
      id: generateId(),
      title,
      department,
      description,
      skills,
      createdAt: new Date().toISOString()
    };
    state.jobDescriptions.push(newJd);
    
    // Set as active JD if it's the first one
    if (state.jobDescriptions.length === 1) {
      activeJdId = newJd.id;
    }
    showToast('New Job Profile created successfully.', 'success');
  }

  saveData(state);
  closeModal(DOM.modalAddJd);
  populateDropdowns();
  renderAll();
};

// ==================== FILTERING / SEARCHING HANDLERS ====================
DOM.filterSearch.oninput = () => renderResumesList();
DOM.filterJd.onchange = (e) => {
  activeJdId = e.target.value === 'all' ? (state.jobDescriptions.length > 0 ? state.jobDescriptions[0].id : null) : e.target.value;
  renderAll();
};
DOM.filterStatus.onchange = () => renderResumesList();
DOM.filterSort.onchange = () => renderResumesList();

// ==================== CONFIRM MODAL CONTROLLERS ====================
DOM.btnConfirmCancel.onclick = () => closeModal(DOM.modalConfirm);
DOM.btnCloseConfirmModal.onclick = () => closeModal(DOM.modalConfirm);
DOM.btnConfirmOk.onclick = () => {
  if (confirmCallback) {
    confirmCallback();
  }
};

DOM.btnCloseReportModal.onclick = () => closeModal(DOM.modalReport);

// Global Keyboard Handler (Escape closes modals)
window.onkeydown = (e) => {
  if (e.key === 'Escape') {
    closeModal(DOM.modalAddResume);
    closeModal(DOM.modalAddJd);
    closeModal(DOM.modalReport);
    closeModal(DOM.modalConfirm);
  }
};

// Focus Trap handler inside active modal overlays
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) {
      const focusableElements = activeModal.querySelectorAll('input, select, textarea, button, [tabindex="0"]');
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) { // shift + tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else { // tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  }
});

// ==========================================================================
// STARTUP BOOTSTRAPPER
// ==========================================================================
function bootstrap() {
  populateDropdowns();
  renderAll();
}

bootstrap();
