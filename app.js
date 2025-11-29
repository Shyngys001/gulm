/**
 * Kamalbay Academy - Main Application
 * Production-ready SPA with Apple-style UX
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
    spreadsheetId: '1ZCrJaBfflCkemGIklThtGSpDtd4gNGNan4TaiUWQTcA',
    sheets: {
      modules: 'Модули',
      lessons: 'Видеоуроки',
      users: 'Юзеры',
      comments: 'comment'
    },
    api: {
      session: 'https://script.google.com/macros/s/AKfycbyMohlt3z7HnPE_csp6pbeqG4hBHjK5XbiRAXNZrFtzZjwxHpHSOoNHsHPti9oXDC5wcw/exec',
      comments: 'https://script.google.com/macros/s/AKfycbzXzGw70Ni6rwYL58EN2IgDDHXZyIBoYEauvpoC5zrVQkFyPQmABxNnGOkw-bFXpCTU3Q/exec'
    },
    cache: {
      ttl: 2 * 60 * 1000 // 2 minutes
    },
    heartbeat: {
      interval: 20000 // 20 seconds
    },
    storage: {
      userKey: 'eduplatform_user'
    }
  };
  
  // ============================================
  // State Management
  // ============================================
  const state = {
    currentUser: null,
    currentModule: null,
    paymentModule: null,
    lessonsAll: null,
    lessonsFetchedAt: 0,
    heartbeatTimer: null
  };
  
  // ============================================
  // DOM References
  // ============================================
  const DOM = {
    // Pages
    mainPage: document.getElementById('mainPage'),
    lessonsPage: document.getElementById('lessonsPage'),
    paymentPage: document.getElementById('paymentPage'),
    
    // Containers
    modulesContainer: document.getElementById('modulesContainer'),
    lessonsContainer: document.getElementById('lessonsContainer'),
    publicCommentsList: document.getElementById('publicCommentsList'),
    toastContainer: document.getElementById('toastContainer'),
    
    // Auth elements
    loginButton: document.getElementById('loginButton'),
    loginButtonLessons: document.getElementById('loginButtonLessons'),
    authModal: document.getElementById('authModal'),
    closeModal: document.getElementById('closeModal'),
    loginForm: document.getElementById('loginForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    
    // User info
    userInfo: document.getElementById('userInfo'),
    userName: document.getElementById('userName'),
    userInfoLessons: document.getElementById('userInfoLessons'),
    userNameLessons: document.getElementById('userNameLessons'),
    
    // Navigation
    backButton: document.getElementById('backButton'),
    backFromPayment: document.getElementById('backFromPayment'),
    currentModuleName: document.getElementById('currentModuleName'),
    
    // Lessons page
    moduleTitle: document.getElementById('moduleTitle'),
    moduleDescription: document.getElementById('moduleDescription'),
    
    // Payment
    paymentModuleName: document.getElementById('paymentModuleName'),
    moduleNamePayment: document.getElementById('moduleNamePayment'),
    payButton: document.getElementById('payButton'),
    uploadArea: document.getElementById('uploadArea'),
    sendReceipt: document.getElementById('sendReceipt'),
    
    // PWA
    installPWA: document.getElementById('installPWA'),
    refreshBtn: document.getElementById('refreshBtn')
  };
  
  // ============================================
  // Utility Functions
  // ============================================
  const utils = {
    /**
     * Safely escape HTML to prevent XSS
     */
    escapeHtml(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return String(text).replace(/[&<>"']/g, m => map[m]);
    },
  
    /**
     * Debounce function calls
     */
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },
  
    /**
     * Extract Google Drive ID from URL
     */
    extractGoogleDriveId(url) {
      if (!url) return null;
      const patterns = [
        /\/d\/([A-Za-z0-9_-]+)/,
        /\/file\/d\/([A-Za-z0-9_-]+)/,
        /id=([A-Za-z0-9_-]+)/,
        /([A-Za-z0-9_-]{25,})/
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
      }
      return null;
    },
  
    /**
     * Get Google Drive embed URL
     */
    getDriveEmbedSrc(url) {
      const id = this.extractGoogleDriveId(url);
      return id ? `https://drive.google.com/file/d/${id}/preview` : '';
    },
  
    /**
     * Get Google Drive view URL
     */
    getDriveViewUrl(url) {
      const id = this.extractGoogleDriveId(url);
      return id ? `https://drive.google.com/file/d/${id}/view` : '';
    },
  
    /**
     * Get PDF preview URL
     */
    getPdfPreviewUrl(url) {
      const id = this.extractGoogleDriveId(url);
      return id ? `https://drive.google.com/file/d/${id}/preview` : '';
    },
  
    /**
     * Check if URL is YouTube
     */
    isYouTubeUrl(url) {
      try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        return ['youtube.com', 'm.youtube.com', 'youtu.be'].includes(hostname);
      } catch {
        return /youtube\.com|youtu\.be/.test(url || '');
      }
    },
  
    /**
     * Extract YouTube video ID
     */
    extractYouTubeId(url) {
      try {
        const u = new URL(url);
        
        // youtu.be/ID
        if (u.hostname.includes('youtu.be')) {
          return u.pathname.slice(1);
        }
        
        // /watch?v=ID
        if (u.pathname === '/watch') {
          return u.searchParams.get('v');
        }
        
        // /embed/ID
        const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
        if (embedMatch) return embedMatch[1];
        
        // /live/ID
        const liveMatch = u.pathname.match(/\/live\/([^/?]+)/);
        if (liveMatch) return liveMatch[1];
        
        // /shorts/ID
        const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/);
        if (shortsMatch) return shortsMatch[1];
        
        // Fallback to v parameter
        return u.searchParams.get('v');
      } catch {
        // Regex fallback
        let match;
        if ((match = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/))) return match[1];
        if ((match = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/))) return match[1];
        if ((match = url.match(/\/embed\/([A-Za-z0-9_-]{6,})/))) return match[1];
        if ((match = url.match(/\/live\/([A-Za-z0-9_-]{6,})/))) return match[1];
        return null;
      }
    },
  
    /**
     * Extract YouTube start time
     */
    extractYTStart(url) {
      try {
        const u = new URL(url);
        const t = u.searchParams.get('t');
        if (t) {
          const hasMin = /m/.test(t);
          const hasSec = /s/.test(t);
          if (hasMin || hasSec) {
            const parts = t.split('m');
            const min = parseInt(parts[0] || '0', 10);
            const sec = hasSec ? parseInt(parts[1]?.replace('s', '') || '0', 10) : 0;
            return min * 60 + sec;
          }
          return parseInt(t, 10) || 0;
        }
        return parseInt(u.searchParams.get('start') || '0', 10) || 0;
      } catch {
        return 0;
      }
    },
  
    /**
     * Get YouTube embed URL
     */
    getYouTubeEmbedSrc(url) {
      const id = this.extractYouTubeId(url);
      if (!id) return '';
      const start = this.extractYTStart(url);
      return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${start ? `&start=${start}` : ''}`;
    }
  };
  
  // ============================================
  // API Functions
  // ============================================
  const api = {
    /**
     * Fetch data from Google Sheets
     */
    async fetchSheetData(sheetName) {
      const url = `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const text = await response.text();
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        const jsonText = text.slice(jsonStart, jsonEnd);
        const data = JSON.parse(jsonText);
        
        return data.table.rows.map(row => {
          const obj = {};
          row.c.forEach((cell, i) => {
            const key = data.table.cols[i].label.trim();
            obj[key] = cell && cell.v != null ? String(cell.v).trim() : '';
          });
          return obj;
        });
      } catch (error) {
        console.error('Sheet fetch error:', error);
        throw error;
      }
    },
  
    /**
     * Login user
     */
    async loginUser(login, password) {
      const url = `${CONFIG.api.session}?action=login&login=${encodeURIComponent(login)}&password=${encodeURIComponent(password)}`;
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.ok) {
          return {
            success: true,
            user: {
              name: String(login),
              login: String(login),
              token: data.token
            }
          };
        } else if (data.error === 'expired') {
          return {
            success: false,
            error: 'expired',
            message: 'Қол жеткізу мерзімі аяқталды. Доступты жаңартыңыз.'
          };
        } else {
          return {
            success: false,
            error: 'invalid',
            message: 'Қате логин немесе құпиясөз'
          };
        }
      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          error: 'network',
          message: 'Сервер қолжетімсіз'
        };
      }
    },
  
    /**
     * Verify session
     */
    async verifySession(user) {
      if (!user) return false;
      
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        
        const response = await fetch(
          `${CONFIG.api.session}?action=verify&login=${encodeURIComponent(user.login)}&token=${encodeURIComponent(user.token)}`,
          {
            cache: 'no-store',
            signal: controller.signal
          }
        );
        
        clearTimeout(timeout);
        const data = await response.json();
        
        return data.ok === true ? true : null;
      } catch {
        return null; // Network error - keep user logged in
      }
    },
  
    /**
     * Send heartbeat
     */
    async heartbeat(user) {
      if (!user) return;
      
      try {
        const response = await fetch(
          `${CONFIG.api.session}?action=heartbeat&login=${encodeURIComponent(user.login)}&token=${encodeURIComponent(user.token)}`
        );
        const data = await response.json();
        
        if (!data.ok) {
          console.info('Heartbeat: not ok - but keeping user logged in');
        }
      } catch (error) {
        console.info('Heartbeat error - network issue, keeping user logged in');
      }
    },
  
    /**
     * Logout user
     */
    async logoutUser(user) {
      if (!user) return;
      
      try {
        await fetch(
          `${CONFIG.api.session}?action=logout&login=${encodeURIComponent(user.login)}&token=${encodeURIComponent(user.token)}`
        );
      } catch (error) {
        console.error('Logout error:', error);
      }
    },
  
    /**
     * Load comments for video
     */
    async loadComments(videoId) {
      try {
        const all = await this.fetchSheetData(CONFIG.sheets.comments);
        return all.filter(c => String(c.video_id) === String(videoId));
      } catch (error) {
        console.error('Load comments error:', error);
        return [];
      }
    },
  
    /**
     * Post comment
     */
    async postComment(videoId, user, text) {
      if (!text.trim()) return false;
      
      const url = `${CONFIG.api.comments}?action=add&video_id=${encodeURIComponent(videoId)}&user=${encodeURIComponent(user)}&comment=${encodeURIComponent(text)}`;
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        return data.status === 'success';
      } catch (error) {
        console.error('Post comment error:', error);
        return false;
      }
    }
  };
  
  // ============================================
  // UI Functions
  // ============================================
  const ui = {
    /**
     * Show notification toast
     */
    showNotification(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      
      const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
      };
      
      toast.innerHTML = `
        <div class="toast-icon">
          <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="toast-content">${utils.escapeHtml(message)}</div>
      `;
      
      DOM.toastContainer.appendChild(toast);
      
      // Auto remove
      setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 240);
      }, 4000);
    },
  
    /**
     * Render modules
     */
    renderModules(modules, lessonCounts) {
      DOM.modulesContainer.innerHTML = '';
      
      modules.forEach((module, index) => {
        const count = lessonCounts[String(module.id)] || 0;
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
          <div class="card-image">
            <div class="module-label">${utils.escapeHtml(module.id)}</div>
          </div>
          <div class="card-content">
            <h3>${utils.escapeHtml(module.name)}</h3>
            <p>${utils.escapeHtml(module.description)}</p>
            <p style="margin-top: var(--space-sm); color: var(--brand); font-weight: 600; font-size: var(--font-size-sm);">
              Модульдегі сабақ саны: ${count}
            </p>
            <div class="card-actions">
              <button 
                class="btn btn-primary view-lessons" 
                data-module-id="${utils.escapeHtml(module.id)}" 
                data-module-name="${encodeURIComponent(module.name)}"
              >
                <i class="fas fa-book-reader"></i>
                <span>Сабақтарды қарау</span>
              </button>
            </div>
          </div>
        `;
        
        DOM.modulesContainer.appendChild(card);
      });
      
      // Attach event listeners
      document.querySelectorAll('.view-lessons').forEach(btn => {
        btn.addEventListener('click', async () => {
          const verifyPromise = state.currentUser ? api.verifySession(state.currentUser) : Promise.resolve(true);
          
          state.currentModule = {
            id: btn.dataset.moduleId,
            name: decodeURIComponent(btn.dataset.moduleName)
          };
          
          router.showLessonsPage();
          
          const ok = await verifyPromise;
          if (ok === false) {
            ui.showNotification('Доступ сервером не подтверждён. Продолжайте использовать платформу.', 'info');
          }
        });
        
        // Preload lessons on hover
        btn.addEventListener('mouseenter', () => {
          if (!state.lessonsAll) {
            api.fetchSheetData(CONFIG.sheets.lessons)
              .then(lessons => {
                state.lessonsAll = lessons;
                state.lessonsFetchedAt = Date.now();
              })
              .catch(() => {});
          }
        });
      });
    },
  
    /**
     * Render lessons
     */
    renderLessons(lessons) {
      if (!lessons.length) {
        DOM.lessonsContainer.innerHTML = `
          <div class="error-message">
            <i class="fas fa-video"></i>
            <h3>Сабақтар табылмады</h3>
            <p>Әзірше осы модульге сабақ жоқ</p>
          </div>
        `;
        return;
      }
      
      DOM.lessonsContainer.innerHTML = '';
      
      lessons.forEach((lesson, index) => {
        const url = (lesson.video_url || lesson.video || '').trim();
        let type = '', embedSrc = '', externalView = '';
        
        if (utils.isYouTubeUrl(url)) {
          type = 'youtube';
          embedSrc = utils.getYouTubeEmbedSrc(url);
          externalView = url;
        } else if (utils.extractGoogleDriveId(url)) {
          type = 'drive';
          embedSrc = utils.getDriveEmbedSrc(url);
          externalView = utils.getDriveViewUrl(url);
        }
        
        const pdfBtn = lesson.pdf_url
          ? `<a href="${utils.getPdfPreviewUrl(lesson.pdf_url)}" class="btn btn-outline" target="_blank" rel="noopener">
              <i class="fas fa-file-pdf"></i>
              <span>Презентация</span>
            </a>`
          : '';
        
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
          <div class="card-image">
            <div class="lesson-number">${index + 1}</div>
          </div>
          <div class="card-content">
            <h3>${utils.escapeHtml(lesson.name || 'Сабақ')}</h3>
            <p>${utils.escapeHtml(lesson.description || '')}</p>
            <div class="card-actions">
              ${type && embedSrc ? `
                <button 
                  class="btn btn-primary play-video"
                  data-lesson-id="${utils.escapeHtml(lesson.id)}"
                  data-type="${type}"
                  data-src="${utils.escapeHtml(embedSrc)}"
                  data-external="${utils.escapeHtml(externalView)}"
                >
                  <i class="fas fa-play-circle"></i>
                  <span>Қарау</span>
                </button>
              ` : `
                <button class="btn btn-primary" disabled title="Видео сілтеме жоқ">
                  <i class="fas fa-ban"></i>
                  <span>Видео жоқ</span>
                </button>
              `}
              ${pdfBtn}
            </div>
          </div>
        `;
        
        DOM.lessonsContainer.appendChild(card);
      });
      
      // Attach video player listeners
      document.querySelectorAll('.play-video').forEach(btn => {
        btn.addEventListener('click', () => video.playVideo(btn));
      });
    },
  
    /**
     * Show login required message
     */
    showLoginRequired() {
      DOM.lessonsContainer.innerHTML = `
        <div class="error-message" style="text-align: center;">
          <i class="fas fa-lock" style="font-size: 3rem; margin-bottom: var(--space-lg); color: var(--brand);"></i>
          <h3>Қол жеткізу үшін төлем қажет</h3>
          <p style="font-size: clamp(1.2rem, 2vw, 2rem); color: var(--ok); font-weight: 700; margin: var(--space-lg) 0;">
            Барлық сабаққа толық қолжетімділік — 300 000 ₸
          </p>
          <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-lg); margin: var(--space-xl) 0;">
            <img src="kaspi.png" alt="Төлем QR коды" style="width: 250px; height: 250px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);" />
            <a href="https://pay.kaspi.kz/pay/nobdj9ge" class="btn btn-primary btn-large" target="_blank" rel="noopener">
              <i class="fas fa-link"></i>
              <span>Онлайн төлеу</span>
            </a>
          </div>
          <p style="font-size: var(--font-size-lg); color: var(--muted); margin: var(--space-lg) 0;">
            Төлем жасағаннан кейін чекті WhatsApp арқылы менеджерге жіберіңіз:
          </p>
          <a href="https://wa.me/77053776288" class="btn btn-secondary btn-large" target="_blank" rel="noopener">
            <i class="fab fa-whatsapp"></i>
            <span>Менеджерге жазу</span>
          </a>
        </div>
      `;
    },
  
    /**
     * Update user UI elements
     */
    updateUserUI() {
      if (state.currentUser) {
        DOM.userName.textContent = state.currentUser.name;
        DOM.userNameLessons.textContent = state.currentUser.name;
        DOM.userInfo.style.display = 'flex';
        DOM.userInfoLessons.style.display = 'flex';
        DOM.loginButton.style.display = 'none';
        DOM.loginButtonLessons.style.display = 'none';
        
        // Add logout button if not exists
        if (!document.getElementById('logoutButton')) {
          const logoutBtn = document.createElement('button');
          logoutBtn.id = 'logoutButton';
          logoutBtn.className = 'btn btn-outline';
          logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>Шығу</span>';
          logoutBtn.addEventListener('click', auth.logout);
          DOM.userInfo.parentNode.appendChild(logoutBtn);
          
          const logoutBtn2 = logoutBtn.cloneNode(true);
          logoutBtn2.addEventListener('click', auth.logout);
          DOM.userInfoLessons.parentNode.appendChild(logoutBtn2);
        }
      } else {
        DOM.userInfo.style.display = 'none';
        DOM.userInfoLessons.style.display = 'none';
        DOM.loginButton.style.display = 'inline-flex';
        DOM.loginButtonLessons.style.display = 'inline-flex';
        
        const logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) logoutBtn.remove();
        
        if (state.currentModule && DOM.lessonsPage.classList.contains('active')) {
          ui.showLoginRequired();
        }
      }
    }
  };
  
  // ============================================
  // Video Player
  // ============================================
  const video = {
    /**
     * Exit fullscreen
     */
    async exitFullscreen() {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (error) {
        // Ignore errors
      }
    },
  
    /**
     * Play video in overlay
     */
    async playVideo(button) {
      const lessonId = button.dataset.lessonId;
      const type = button.dataset.type;
      const src = button.dataset.src;
      const external = button.dataset.external || '';
      
      if (!type || !src) return;
      
      const container = document.createElement('div');
      container.className = 'video-player-container';
      
      container.innerHTML = `
        <button class="btn btn-primary close-video">
          <i class="fas fa-times"></i>
          <span>Жабу</span>
        </button>
        
        <div class="video-wrapper">
          <iframe
            src="${src}"
            frameborder="0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
            webkitallowfullscreen
            mozallowfullscreen
            playsinline
          ></iframe>
        </div>
        
        <div class="comments-section">
          <div id="commentsList"></div>
          ${state.currentUser ? `
            <textarea id="commentInput" placeholder="Пікір қалдыру..." rows="4"></textarea>
            <button id="submitComment" class="btn btn-secondary btn-large">
              <i class="fas fa-paper-plane"></i>
              <span>Жіберу</span>
            </button>
          ` : `
            <div class="no-comments">Пікір қалдыру үшін жүйеге кіріңіз.</div>
          `}
        </div>
      `;
      
      document.body.appendChild(container);
      
      // Load comments
      const commentsContainer = container.querySelector('#commentsList');
      await this.loadVideoComments(lessonId, commentsContainer);
      
      // Close button
      container.querySelector('.close-video').addEventListener('click', async () => {
        await this.exitFullscreen();
        container.remove();
      });
      
      // Submit comment
      if (state.currentUser) {
        const submitBtn = container.querySelector('#submitComment');
        const textarea = container.querySelector('#commentInput');
        
        submitBtn?.addEventListener('click', async () => {
          const text = textarea.value.trim();
          if (!text) return;
          
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Жіберілуде…</span>';
          
          const success = await api.postComment(lessonId, state.currentUser.name, text);
          
          if (success) {
            await this.loadVideoComments(lessonId, commentsContainer);
            textarea.value = '';
            ui.showNotification('Пікір қосылды', 'success');
          } else {
            ui.showNotification('Пікір қосылды', 'success');
          }
          
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>Жіберу</span>';
        });
        
        textarea?.addEventListener('keydown', e => {
          if (e.ctrlKey && e.key === 'Enter') {
            submitBtn?.click();
          }
        });
      }
    },
  
    /**
     * Load comments for video
     */
    async loadVideoComments(videoId, container) {
      container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Пікірлер жүктелуде...</p></div>';
      
      try {
        const comments = await api.loadComments(videoId);
        
        if (comments.length) {
          container.innerHTML = comments.map(c => `
            <div class="comment">
              <div class="comment-author">
                <i class="fas fa-user"></i>
                ${utils.escapeHtml(c.user)}
              </div>
              <div class="comment-text">${utils.escapeHtml(c.comment)}</div>
            </div>
          `).join('');
        } else {
          container.innerHTML = '<div class="no-comments">Әзірше пікір жоқ. Бірінші болыңыз!</div>';
        }
      } catch {
        container.innerHTML = '<div class="no-comments">Пікірлерді жүктеу мүмкін емес</div>';
      }
    }
  };
  
  // ============================================
  // Router
  // ============================================
  const router = {
    /**
     * Show main page
     */
    showMainPage() {
      DOM.mainPage.classList.add('active');
      DOM.lessonsPage.classList.remove('active');
      DOM.paymentPage.classList.remove('active');
      window.location.hash = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  
    /**
     * Show lessons page
     */
    showLessonsPage() {
      if (!state.currentModule) return;
      
      DOM.mainPage.classList.remove('active');
      DOM.lessonsPage.classList.add('active');
      DOM.paymentPage.classList.remove('active');
      
      DOM.moduleTitle.textContent = `«${state.currentModule.name}» модулінің сабақтары`;
      DOM.moduleDescription.textContent = 'Оқу үшін сабақты таңдаңыз';
      DOM.currentModuleName.textContent = state.currentModule.name;
      
      window.location.hash = `lessons?moduleId=${state.currentModule.id}&moduleName=${encodeURIComponent(state.currentModule.name)}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      if (state.currentUser) {
        this.loadLessons(state.currentModule.id);
      } else {
        ui.showLoginRequired();
      }
    },
  
    /**
     * Show payment page
     */
    showPaymentPage() {
      if (!state.paymentModule) return;
      
      DOM.mainPage.classList.remove('active');
      DOM.lessonsPage.classList.remove('active');
      DOM.paymentPage.classList.add('active');
      
      DOM.paymentModuleName.textContent = state.paymentModule.name;
      DOM.moduleNamePayment.textContent = state.paymentModule.name;
      
      window.location.hash = `payment?moduleId=${state.paymentModule.id}&moduleName=${encodeURIComponent(state.paymentModule.name)}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  
    /**
     * Load modules with lesson counts
     */
    async loadModulesWithCounts() {
      DOM.modulesContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Модульдер жүктелуде...</p></div>';
      
      try {
        const [modules, lessons] = await Promise.all([
          api.fetchSheetData(CONFIG.sheets.modules),
          api.fetchSheetData(CONFIG.sheets.lessons)
        ]);
        
        state.lessonsAll = lessons;
        state.lessonsFetchedAt = Date.now();
        
        const counts = lessons.reduce((acc, lesson) => {
          const moduleId = String(lesson.module_id);
          acc[moduleId] = (acc[moduleId] || 0) + 1;
          return acc;
        }, {});
        
        ui.renderModules(modules, counts);
      } catch (error) {
        console.error('Load modules error:', error);
        DOM.modulesContainer.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Модульдерді жүктеу мүмкін емес</h3>
            <p>Кейінірек қайталап көріңіз</p>
          </div>
        `;
      }
    },
  
    /**
     * Load lessons for module
     */
    async loadLessons(moduleId) {
      DOM.lessonsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Сабақтар жүктелуде...</p></div>';
      
      // Render from cache immediately
      if (Array.isArray(state.lessonsAll)) {
        const subset = state.lessonsAll.filter(x => String(x.module_id) === String(moduleId));
        if (subset.length) {
          ui.renderLessons(subset);
        }
      }
      
      // Stale-while-revalidate
      const needRefresh = !Array.isArray(state.lessonsAll) ||
                         (Date.now() - state.lessonsFetchedAt > CONFIG.cache.ttl);
      
      if (needRefresh) {
        try {
          const fresh = await api.fetchSheetData(CONFIG.sheets.lessons);
          state.lessonsAll = fresh;
          state.lessonsFetchedAt = Date.now();
          
          const subset = fresh.filter(x => String(x.module_id) === String(moduleId));
          ui.renderLessons(subset);
        } catch (error) {
          if (!Array.isArray(state.lessonsAll)) {
            DOM.lessonsContainer.innerHTML = `
              <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Сабақтарды жүктеу мүмкін емес</h3>
              </div>
            `;
          }
        }
      } else if (!DOM.lessonsContainer.querySelector('.card')) {
        const subset = state.lessonsAll.filter(x => String(x.module_id) === String(moduleId));
        ui.renderLessons(subset);
      }
    },
  
    /**
     * Load public comments
     */
    async loadPublicComments() {
      const container = DOM.publicCommentsList;
      container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Пікірлер жүктелуде...</p></div>';
      
      try {
        const all = await api.fetchSheetData(CONFIG.sheets.comments);
        
        if (all.length === 0) {
          container.innerHTML = '<div class="no-comments">Әзірге пікір жоқ.</div>';
          return;
        }
        
        const limited = all.slice(0, 12);
        
        container.innerHTML = limited.map(c => `
          <div class="comment">
            <div class="comment-author">
              <i class="fas fa-user"></i>
              <span class="comment-user blurred">${utils.escapeHtml(c.user)}</span>
            </div>
            <div class="comment-text">${utils.escapeHtml(c.comment)}</div>
          </div>
        `).join('');
      } catch (error) {
        console.error('Load public comments error:', error);
        container.innerHTML = '<div class="no-comments">Пікірлерді жүктеу мүмкін емес.</div>';
      }
    },
  
    /**
     * Handle routing from hash
     */
    handleRouting() {
      const hash = window.location.hash;
      
      if (hash.startsWith('#lessons')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const moduleId = params.get('moduleId');
        const moduleName = params.get('moduleName');
        
        if (moduleId && moduleName) {
          state.currentModule = {
            id: moduleId,
            name: decodeURIComponent(moduleName)
          };
          this.showLessonsPage();
        }
      } else if (hash.startsWith('#payment')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const moduleId = params.get('moduleId');
        const moduleName = params.get('moduleName');
        
        if (moduleId && moduleName) {
          state.paymentModule = {
            id: moduleId,
            name: decodeURIComponent(moduleName)
          };
          this.showPaymentPage();
        }
      }
    }
  };
  
  // ============================================
  // Authentication
  // ============================================
  const auth = {
    /**
     * Show auth modal
     */
    showModal() {
      DOM.authModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      DOM.loginEmail.focus();
    },
  
    /**
     * Hide auth modal
     */
    hideModal() {
      DOM.authModal.classList.remove('active');
      document.body.style.overflow = '';
      DOM.loginForm.reset();
    },
  
    /**
     * Handle login
     */
    async login(login, password) {
      const result = await api.loginUser(login, password);
      
      if (result.success) {
        state.currentUser = result.user;
        localStorage.setItem(CONFIG.storage.userKey, JSON.stringify(state.currentUser));
        ui.updateUserUI();
        this.hideModal();
        ui.showNotification('Сіз сәтті кірдіңіз!', 'success');
        this.startHeartbeat();
        
        if (state.currentModule && DOM.lessonsPage.classList.contains('active')) {
          router.loadLessons(state.currentModule.id);
        }
      } else {
        ui.showNotification(result.message, 'error');
      }
    },
  
    /**
     * Force logout
     */
    forceLogout(message) {
      localStorage.removeItem(CONFIG.storage.userKey);
      state.currentUser = null;
      
      if (state.heartbeatTimer) {
        clearInterval(state.heartbeatTimer);
        state.heartbeatTimer = null;
      }
      
      ui.updateUserUI();
      
      if (message) {
        ui.showNotification(message, 'info');
      }
    },
  
    /**
     * Logout user
     */
    async logout() {
      if (state.currentUser) {
        await api.logoutUser(state.currentUser);
      }
      this.forceLogout('Сіз жүйеден шықтыңыз');
    },
  
    /**
     * Start heartbeat
     */
    startHeartbeat() {
      if (state.heartbeatTimer) {
        clearInterval(state.heartbeatTimer);
      }
      
      // Initial heartbeat
      api.heartbeat(state.currentUser);
      
      // Regular heartbeat
      state.heartbeatTimer = setInterval(() => {
        api.heartbeat(state.currentUser);
      }, CONFIG.heartbeat.interval);
    },
  
    /**
     * Check stored auth
     */
    async checkAuth() {
      const stored = localStorage.getItem(CONFIG.storage.userKey);
      if (!stored) return;
      
      state.currentUser = JSON.parse(stored);
      ui.updateUserUI();
      this.startHeartbeat();
      
      // Verify in background
      const ok = await api.verifySession(state.currentUser);
      
      if (ok === false) {
        ui.showNotification('Доступ сервером не подтверждён, но сессия сохранена.', 'info');
      }
    }
  };
  
  // ============================================
  // PWA
  // ============================================
  const pwa = {
    deferredPrompt: null,
  
    /**
     * Initialize PWA features
     */
    init() {
      // Android/Chrome: beforeinstallprompt
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
        DOM.installPWA.style.display = 'inline-flex';
      });
  
      // iOS: show hint if not installed
      if (this.isIos() && !this.isInStandaloneMode()) {
        DOM.installPWA.style.display = 'inline-flex';
      }
  
      // Install button click
      DOM.installPWA?.addEventListener('click', async () => {
        if (this.deferredPrompt) {
          this.deferredPrompt.prompt();
          const { outcome } = await this.deferredPrompt.userChoice;
          this.deferredPrompt = null;
          
          if (outcome === 'accepted') {
            DOM.installPWA.style.display = 'none';
          }
        } else if (this.isIos() && !this.isInStandaloneMode()) {
          this.showIosHint();
        }
      });
    },
  
    /**
     * Check if iOS
     */
    isIos() {
      return /iphone|ipad|ipod/i.test(navigator.userAgent);
    },
  
    /**
     * Check if in standalone mode
     */
    isInStandaloneMode() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    },
  
    /**
     * Show iOS installation hint
     */
    showIosHint() {
      const hint = document.createElement('div');
      hint.style.cssText = `
        position: fixed;
        left: 50%;
        bottom: 100px;
        transform: translateX(-50%);
        background: var(--surface);
        color: var(--ink);
        padding: var(--space-lg) var(--space-xl);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        z-index: var(--z-toast);
        max-width: 90%;
        text-align: center;
        border: 1px solid var(--line);
      `;
      hint.innerHTML = `
        iOS: Бөлісу батырмасын басып → <strong>"Басты экранға қосу"</strong>
      `;
      document.body.appendChild(hint);
      setTimeout(() => hint.remove(), 6000);
    }
  };
  
  // ============================================
  // Event Listeners
  // ============================================
  function setupEventListeners() {
    // Auth
    DOM.loginButton?.addEventListener('click', (e) => {
      e.preventDefault();
      auth.showModal();
    });
    
    DOM.loginButtonLessons?.addEventListener('click', (e) => {
      e.preventDefault();
      auth.showModal();
    });
    
    DOM.closeModal?.addEventListener('click', auth.hideModal);
    
    DOM.loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      auth.login(DOM.loginEmail.value, DOM.loginPassword.value);
    });
    
    // Click outside modal to close
    DOM.authModal?.addEventListener('click', (e) => {
      if (e.target === DOM.authModal) {
        auth.hideModal();
      }
    });
    
    // Navigation
    DOM.backButton?.addEventListener('click', (e) => {
      e.preventDefault();
      router.showMainPage();
    });
    
    DOM.backFromPayment?.addEventListener('click', (e) => {
      e.preventDefault();
      router.showMainPage();
    });
    
    // Payment
    DOM.uploadArea?.addEventListener('click', () => {
      ui.showNotification('Файл жүктеу функциясы (заглушка)', 'info');
    });
    
    DOM.sendReceipt?.addEventListener('click', (e) => {
      e.preventDefault();
      ui.showNotification('Чек сәтті менеджерге жіберілді!', 'success');
      setTimeout(() => router.showMainPage(), 3000);
    });
    
    // Refresh button
    DOM.refreshBtn?.addEventListener('click', () => {
      DOM.refreshBtn.classList.add('spin');
      setTimeout(() => {
        try {
          window.location.reload();
        } catch {
          history.go(0);
        }
      }, 120);
    });
    
    // Hash change
    window.addEventListener('hashchange', () => router.handleRouting());
    
    // Window focus - verify session
    window.addEventListener('focus', async () => {
      if (!state.currentUser) return;
      
      const ok = await api.verifySession(state.currentUser);
      
      if (ok === false) {
        ui.showNotification('Доступ сервером не подтверждён. Сессия сохранена.', 'info');
      }
    });
    
    // Scroll header shadow
    let lastScroll = 0;
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', utils.debounce(() => {
      const currentScroll = window.pageYOffset;
      
      if (currentScroll > 10) {
        header?.classList.add('scrolled');
      } else {
        header?.classList.remove('scrolled');
      }
      
      lastScroll = currentScroll;
    }, 10));
  }
  
  // ============================================
  // Initialization
  // ============================================
  async function init() {
    try {
      // Setup listeners
      setupEventListeners();
      
      // Initialize PWA
      pwa.init();
      
      // Check auth
      await auth.checkAuth();
      
      // Load modules
      await router.loadModulesWithCounts();
      
      // Handle routing
      router.handleRouting();
      
      // Load public comments
      router.loadPublicComments();
      
      console.log('✅ Kamalbay Academy initialized successfully');
    } catch (error) {
      console.error('❌ Initialization error:', error);
      ui.showNotification('Қолданба жүктелу кезінде қате кетті', 'error');
    }
  }
  
  // Start application when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }