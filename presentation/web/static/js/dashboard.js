// Dashboard JavaScript - User Analytics and Progress Tracking

// Dashboard state
let dashboardData = null;
let chartsInitialized = false;
let loadingState = {
  profile: false,
  analytics: false,
  customTrilhas: false,
  learningPath: false,
  recommendations: false
};

// Initialize dashboard
function initDashboard() {
  const currentUser = window.elearning?.getCurrentUser();

  if (!currentUser) {
    console.error('User not logged in');
    return;
  }

  setupDashboardEventListeners();
  loadDashboardData();

  console.log('Dashboard initialized for user:', currentUser.id);
}

// Setup event listeners
function setupDashboardEventListeners() {
  // Refresh button
  const refreshBtn = document.getElementById('refreshDashboard');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadDashboardData);
  }

  // Period selector
  const periodSelector = document.getElementById('analyticsPeriod');
  if (periodSelector) {
    periodSelector.addEventListener('change', (e) => {
      loadAnalytics(parseInt(e.target.value));
    });
  }
}

async function loadDashboardData() {
  const currentUser = window.elearning?.getCurrentUser();
  if (!currentUser) return;


  showDashboardLoading(true);
  

  initializeDashboardDefaults();

  try {
    const profilePromise = UserAPI.getProfile(currentUser.id).catch(err => {
      console.error('Profile error:', err);
      return { success: false, data: {} };
    });

    const analyticsPromise = UserAPI.getAnalytics(currentUser.id, 30).catch(err => {
      console.error('Analytics error:', err);
      return { success: false, data: {} };
    });

    const recommendationsPromise = loadRecommendationsWithCache(currentUser.id).catch(err => {
      console.error('Erro ao carregar recomendações:', err);
      return { success: false, data: {} };
    });

    showRecommendationsLoading(true);

    const learningPathPromise = UserAPI.getLearningPath(currentUser.id).catch(err => {
      console.error('Learning path error:', err);
      return { success: false, data: {} };
    });

    const customTrilhasPromise = loadUserCustomTrilhas(currentUser.id).catch(err => {
      console.error('Custom trilhas error:', err);
      return { success: false, data: {} };
    });


    profilePromise.then(profileResponse => {
      loadingState.profile = true;
      if (profileResponse && profileResponse.success) {
        updateProfileSection(profileResponse.data);
      }
      removeLoadingFromCard('profile');
      checkAllDataLoaded();
    });

    analyticsPromise.then(analyticsResponse => {
      loadingState.analytics = true;
      if (analyticsResponse && analyticsResponse.success) {
        updateAnalyticsSection(analyticsResponse.data);
        const currentUser = window.elearning?.getCurrentUser();
        if (currentUser) {
          checkAndInvalidateRecommendationsCache(currentUser.id, analyticsResponse.data);
        }
      } else {
        console.warn('Resposta de analytics não foi bem-sucedida:', analyticsResponse);
      }
      removeLoadingFromCard('analytics');
      checkAllDataLoaded();
    });

    customTrilhasPromise.then(customTrilhasResponse => {
      loadingState.customTrilhas = true;
      if (customTrilhasResponse && customTrilhasResponse.success) {
        updateCustomTrilhasSection(customTrilhasResponse.data);
        updateStatCard('createdTrilhas', customTrilhasResponse.data?.trilhas?.length || 0);
        updateRecentActivity(customTrilhasResponse.data?.trilhas || []);
        const currentUser = window.elearning?.getCurrentUser();
        if (currentUser) {
          checkAndInvalidateRecommendationsCache(currentUser.id, null, customTrilhasResponse.data);
        }
      } else {
        updateStatCard('createdTrilhas', 0);
      }

      removeLoadingFromCard('customTrilhas');
      checkAllDataLoaded();
    });

    learningPathPromise.then(learningPathResponse => {
      loadingState.learningPath = true;
      if (learningPathResponse && learningPathResponse.success) {
        updateLearningPathSection(learningPathResponse.data);
      }
      removeLoadingFromCard('learningPath');
      checkAllDataLoaded();
    });


    recommendationsPromise.then(recommendationsResponse => {
      loadingState.recommendations = true;
      showRecommendationsLoading(false);
      if (recommendationsResponse && recommendationsResponse.success) {
        updateRecommendationsSection(recommendationsResponse.data);
      } else {

        const recommendationsGrid = document.getElementById('recommendationsGrid');
        if (recommendationsGrid) {
          recommendationsGrid.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-lightbulb"></i>
              <p>Continue estudando para receber recomendações personalizadas!</p>
            </div>
          `;
        }
      }
      removeLoadingFromCard('recommendations');
      checkAllDataLoaded();
    });

    const [profileResponse, analyticsResponse, recommendationsResponse, learningPathResponse, customTrilhasResponse] =
      await Promise.allSettled([
        profilePromise,
        analyticsPromise,
        recommendationsPromise,
        learningPathPromise,
        customTrilhasPromise
      ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : { success: false, data: {} }));

    dashboardData = {
      profile: profileResponse?.data || {},
      analytics: analyticsResponse?.data || {},
      recommendations: recommendationsResponse?.data || {},
      learningPath: learningPathResponse?.data || {},
      customTrilhas: customTrilhasResponse?.data || {}
    };

    setTimeout(() => {
      checkAllDataLoaded();
    }, 100);

  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showDashboardError('Erro ao carregar dados do dashboard');
    showDashboardLoading(false);
  }
}

// Initialize dashboard with default values for immediate display
function initializeDashboardDefaults() {
  // Reset loading state
  loadingState = {
    profile: false,
    analytics: false,
    customTrilhas: false,
    learningPath: false,
    recommendations: false
  };
  
  // Set default values immediately so user sees something
  updateStatCard('overallProgress', '0%');
  updateStatCard('studyTime', '0h');
  updateStatCard('learningStreak', 0);
  updateStatCard('createdTrilhas', 0);
  updateProgressCircle(0);
}

// Remove loading state from specific card
function removeLoadingFromCard(cardType) {
  const dashboardGrid = document.querySelector('.dashboard-grid');
  if (!dashboardGrid) return;

  // Map card types to specific cards
  if (cardType === 'analytics') {
    // Remove loading from stats cards (progress, study time, streak, created trilhas)
    const progressCard = dashboardGrid.querySelector('.dashboard-card.gradient-card');
    const studyTimeCard = document.getElementById('studyTime')?.closest('.dashboard-card');
    const streakCard = document.getElementById('learningStreak')?.closest('.dashboard-card');
    const createdTrilhasCard = document.getElementById('createdTrilhas')?.closest('.dashboard-card');
    
    [progressCard, studyTimeCard, streakCard, createdTrilhasCard].forEach(card => {
      if (card) {
        card.classList.remove('loading');
        const statValues = card.querySelectorAll('.stat-value, .progress-value');
        statValues.forEach(el => {
          el.classList.remove('loading-pulse');
          el.style.opacity = '1'; // Ensure visible
        });
      }
    });
  } else if (cardType === 'customTrilhas') {
    // Remove loading from custom trilhas card (full-width card)
    const customTrilhasCard = dashboardGrid.querySelector('.dashboard-card.full-width-card');
    if (customTrilhasCard) {
      customTrilhasCard.classList.remove('loading');
      const statValues = customTrilhasCard.querySelectorAll('.stat-value, .stat-number, .stat-label');
      statValues.forEach(el => {
        el.classList.remove('loading-pulse');
        el.style.opacity = '1'; // Ensure visible
      });
    }
    // Also remove from created trilhas stat card
    const createdTrilhasCard = document.getElementById('createdTrilhas')?.closest('.dashboard-card');
    if (createdTrilhasCard) {
      createdTrilhasCard.classList.remove('loading');
      const statValue = document.getElementById('createdTrilhas');
      if (statValue) {
        statValue.classList.remove('loading-pulse');
        statValue.style.opacity = '1';
      }
    }
  } else if (cardType === 'profile') {
    // Remove loading from profile-related cards if any
    const profileCards = dashboardGrid.querySelectorAll('.dashboard-card');
    profileCards.forEach(card => {
      card.classList.remove('loading');
    });
  }
}

// Check if all data has loaded and remove remaining loading states
function checkAllDataLoaded() {
  const allLoaded = Object.values(loadingState).every(loaded => loaded === true);
  if (allLoaded) {
    // Remove all loading states
    const dashboardGrid = document.querySelector('.dashboard-grid');
    if (dashboardGrid) {
      const cards = dashboardGrid.querySelectorAll('.dashboard-card');
      cards.forEach(card => {
        card.classList.remove('loading');
        const statValues = card.querySelectorAll('.stat-value, .progress-value, .stat-number');
        statValues.forEach(el => el.classList.remove('loading-pulse'));
      });
    }
    
    // Also hide any remaining loading indicators
    showDashboardLoading(false);
  }
}

// Update profile section
function updateProfileSection(profileData) {
  // Update user info
  const userNameElement = document.getElementById('dashboardUserName');
  const userEmailElement = document.getElementById('dashboardUserEmail');
  const userLevelElement = document.getElementById('dashboardUserLevel');

  if (userNameElement) userNameElement.textContent = profileData.nome || 'Usuário';
  if (userEmailElement) userEmailElement.textContent = profileData.email || '';
  if (userLevelElement) {
    const levelLabels = {
      beginner: 'Iniciante',
      intermediate: 'Intermediário',
      advanced: 'Avançado'
    };
    userLevelElement.textContent = levelLabels[profileData.perfil_aprend] || profileData.perfil_aprend;
  }

  // Update enrolled trilhas count
  const enrolledTrilhasElement = document.getElementById('enrolledTrilhas');
  if (enrolledTrilhasElement) {
    enrolledTrilhasElement.textContent = profileData.enrolled_trilhas?.length || 0;
  }
}

// Update analytics section
function updateAnalyticsSection(analyticsData) {
  console.log('Updating analytics section with data:', analyticsData);

  // Remove loading states before updating
  removeLoadingFromCard('analytics');

  // Update main stats
  updateStatCard('overallProgress', `${analyticsData.completion_rate || 0}%`);
  updateStatCard('studyTime', `${analyticsData.total_study_time_hours || 0}h`);
  updateStatCard('learningStreak', analyticsData.learning_streak || 0);

  // Update progress circle
  updateProgressCircle(analyticsData.completion_rate || 0);

  // Update detailed analytics if function exists
  if (typeof updateDetailedAnalytics === 'function') {
    updateDetailedAnalytics(analyticsData);
  }
}

// Update stat card
function updateStatCard(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    // Remove loading animation when updating
    element.classList.remove('loading-pulse');
    element.textContent = value;
    // Add a subtle fade-in effect
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.opacity = '1';
    }, 10);
  }
}

// Update progress circle
function updateProgressCircle(percentage) {
  const progressCircle = document.querySelector('.progress-circle');
  const progressValue = document.querySelector('.progress-value');

  if (progressCircle && progressValue) {
    // Remove loading animation
    progressValue.classList.remove('loading-pulse');
    progressCircle.classList.remove('loading');
    
    // Update text
    progressValue.textContent = `${percentage}%`;

    // Update circle background (conic gradient)
    const degrees = (percentage / 100) * 360;
    progressCircle.style.background = `conic-gradient(var(--primary-color) ${degrees}deg, var(--gray-200) 0deg)`;

    // Animate the progress
    let currentDegrees = 0;
    const increment = degrees / 30; // 30 frames animation

    const animateProgress = () => {
      if (currentDegrees < degrees) {
        currentDegrees += increment;
        progressCircle.style.background = `conic-gradient(var(--primary-color) ${currentDegrees}deg, var(--gray-200) 0deg)`;
        requestAnimationFrame(animateProgress);
      }
    };

    animateProgress();
  }
}

// Update detailed analytics
function updateDetailedAnalytics(analyticsData) {
  const detailsContainer = document.getElementById('analyticsDetails');
  if (!detailsContainer) return;

  detailsContainer.innerHTML = `
        <div class="analytics-grid">
            <div class="analytics-card">
                <h4>Desempenho Recente</h4>
                <div class="metric">
                    <span class="metric-label">Progresso Médio (30 dias)</span>
                    <span class="metric-value">${analyticsData.average_progress_recent || 0}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Nota Média (30 dias)</span>
                    <span class="metric-value">${analyticsData.average_grade_recent || 0}/100</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Tempo de Estudo (30 dias)</span>
                    <span class="metric-value">${analyticsData.recent_study_time_hours || 0}h</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h4>Estatísticas Gerais</h4>
                <div class="metric">
                    <span class="metric-label">Total de Atividades</span>
                    <span class="metric-value">${analyticsData.total_activities || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Atividades Concluídas</span>
                    <span class="metric-value">${analyticsData.completed_activities || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Tempo Total de Estudo</span>
                    <span class="metric-value">${analyticsData.total_study_time_hours || 0}h</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h4>Hábitos de Estudo</h4>
                <div class="metric">
                    <span class="metric-label">Média Diária</span>
                    <span class="metric-value">${analyticsData.daily_average_study_time || 0}h/dia</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Sequência Atual</span>
                    <span class="metric-value">${analyticsData.learning_streak || 0} dias</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Taxa de Conclusão</span>
                    <span class="metric-value">${analyticsData.completion_rate || 0}%</span>
                </div>
            </div>
        </div>
    `;
}

function showRecommendationsLoading(show) {
  const recommendationsSection = document.querySelector('.recommendations-section');
  const recommendationsGrid = document.getElementById('recommendationsGrid');
  
  if (!recommendationsSection || !recommendationsGrid) return;

  if (show) {
    recommendationsSection.style.display = 'block';
    recommendationsGrid.innerHTML = `
      <div class="recommendations-loading">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Carregando materiais recomendados...</p>
      </div>
    `;
  } else {
    recommendationsSection.style.display = 'none';
  }
}

// Update recommendations section
function updateRecommendationsSection(recommendationsData) {
  const recommendationsGrid = document.getElementById('recommendationsGrid');
  const recommendationsSection = document.querySelector('.recommendations-section');
  const hasCompletedTrack = true;
  
  if (!recommendationsGrid) return;

  // Show section
  if (recommendationsSection) {
    recommendationsSection.style.display = 'block';
  }

  if (!recommendationsData.structured_recommendations?.content_recommendations?.length) {
    recommendationsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lightbulb"></i>
                <p>Continue estudando para receber recomendações de materiais!</p>
            </div>
        `;
    return;
  }

  const recommendations = recommendationsData.structured_recommendations.content_recommendations;
  
  // Helper function to get icon for material type
  function getMaterialIcon(type) {
    const icons = {
      'youtube': 'fa-youtube',
      'course': 'fa-graduation-cap',
      'article': 'fa-file-alt',
      'documentation': 'fa-book',
      'video': 'fa-video',
      'ebook': 'fa-book-open',
      'tutorial': 'fa-chalkboard-teacher',
      'material': 'fa-link'
    };
    return icons[type.toLowerCase()] || 'fa-link';
  }
  
  // Helper function to get type label
  function getMaterialTypeLabel(type) {
    const labels = {
      'youtube': 'YouTube',
      'course': 'Curso Online',
      'article': 'Artigo',
      'documentation': 'Documentação',
      'video': 'Vídeo',
      'ebook': 'E-book',
      'tutorial': 'Tutorial',
      'material': 'Material'
    };
    return labels[type.toLowerCase()] || 'Material';
  }
  
  recommendationsGrid.innerHTML = recommendations.map(rec => `
        <div class="material-recommendation-card">
            <div class="material-header">
                <div class="material-icon">
                    <i class="fas ${getMaterialIcon(rec.type)}"></i>
                </div>
                <div class="material-type-badge">${getMaterialTypeLabel(rec.type)}</div>
            </div>
            <h4 class="material-title">${rec.title || rec.titulo || 'Material Recomendado'}</h4>
            <p class="material-description">${rec.description || rec.reason || ''}</p>
            <div class="material-meta">
                <span class="difficulty-badge difficulty-${rec.difficulty || rec.dificuldade || 'intermediario'}">
                    ${getDifficultyLabel(rec.difficulty || rec.dificuldade || 'intermediario')}
                </span>
                ${rec.estimated_time ? `<span class="time-badge"><i class="fas fa-clock"></i> ${rec.estimated_time}</span>` : ''}
                ${rec.free ? '<span class="free-badge"><i class="fas fa-gift"></i> Gratuito</span>' : ''}
            </div>
            <div class="material-reason">
                <i class="fas fa-info-circle"></i>
                <span>${rec.reason || 'Recomendado com base no seu perfil'}</span>
            </div>
            <a href="${rec.url}" target="_blank" rel="noopener noreferrer" class="material-link-btn">
                <i class="fas fa-external-link-alt"></i>
                ${rec.type === 'youtube' ? 'Assistir no YouTube' : rec.type === 'course' ? 'Acessar Curso' : 'Acessar Material'}
            </a>
        </div>
    `).join('');
}

// Update learning path section
function updateLearningPathSection(learningPathData) {
  const learningPathContainer = document.getElementById('learningPathContainer');
  if (!learningPathContainer) return;

  if (!learningPathData.learning_path?.length) {
    learningPathContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-route"></i>
                <p>Inscreva-se em trilhas para ver seu caminho de aprendizado!</p>
                <button class="btn btn-primary" onclick="window.elearning.showSection('trilhas')">
                    Explorar Trilhas
                </button>
            </div>
        `;
    return;
  }

  const learningPath = learningPathData.learning_path;

  learningPathContainer.innerHTML = `
        <div class="learning-path-grid">
            ${learningPath.map(path => `
                <div class="learning-path-card">
                    <div class="path-header">
                        <h4>${path.trilha.titulo}</h4>
                        <span class="difficulty-badge difficulty-${path.trilha.dificuldade}">
                            ${getDifficultyLabel(path.trilha.dificuldade)}
                        </span>
                    </div>
                    <div class="path-progress">
                        <div class="progress-info">
                            <span>Progresso: ${path.progress.completion_rate || 0}%</span>
                            <span>${path.progress.completed_content || 0}/${path.progress.total_content || 0} conteúdos</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${path.progress.completion_rate || 0}%"></div>
                        </div>
                    </div>
                    <div class="path-stats">
                        <div class="stat">
                            <i class="fas fa-clock"></i>
                            <span>${path.progress.total_study_time_hours || 0}h estudadas</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-star"></i>
                            <span>Nota média: ${path.progress.average_grade || 0}/100</span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-small" onclick="openTrilha(${path.trilha.id})">
                        ${path.progress.completion_rate >= 100 ? 'Ver Resultado' : 'Iniciar'}
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

// Handle recommendation click
function handleRecommendationClick(id, type) {
  if (type === 'trilha') {
    openTrilha(id);
  } else {
    // Handle other recommendation types
    window.elearning?.showNotification('Recomendação aplicada!', 'success');
  }
}

// Get recommendation icon
function getRecommendationIcon(type) {
  const icons = {
    trilha: 'book',
    habit: 'lightbulb',
    content: 'play-circle',
    assessment: 'clipboard-check'
  };
  return icons[type] || 'star';
}

// Get difficulty label
function getDifficultyLabel(difficulty) {
  const labels = {
    beginner: 'Iniciante',
    intermediate: 'Intermediário',
    advanced: 'Avançado'
  };
  return labels[difficulty] || difficulty;
}

// Get confidence class
function getConfidenceClass(confidence) {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

// Show dashboard loading
function showDashboardLoading(show) {
  const dashboardGrid = document.querySelector('.dashboard-grid');
  const loadingElements = document.querySelectorAll('.dashboard-loading');
  const statCards = document.querySelectorAll('.dashboard-card .stat-value, .dashboard-card .progress-value, .dashboard-card .stat-number');


  loadingElements.forEach(el => {
    el.style.display = show ? 'block' : 'none';
  });

  if (!show) {
    if (dashboardGrid) {
      const cards = dashboardGrid.querySelectorAll('.dashboard-card');
      cards.forEach(card => {
        card.classList.remove('loading');

        const allElements = card.querySelectorAll('.stat-value, .progress-value, .stat-number, .stat-label');
        allElements.forEach(el => {
          el.classList.remove('loading-pulse');
          el.style.opacity = '1';
          el.style.animation = 'none';
        });
        card.style.opacity = '1';
      });
    }
    
    statCards.forEach(el => {
      el.classList.remove('loading-pulse');
      el.style.opacity = '1';
      el.style.animation = 'none';
    });
  } else {

    if (dashboardGrid) {
      const cards = dashboardGrid.querySelectorAll('.dashboard-card');
      cards.forEach(card => {
        card.classList.add('loading');
      });
    }

    statCards.forEach(el => {
      el.classList.add('loading-pulse');
    });
  }
}

// Show dashboard error
function showDashboardError(message) {
  const errorContainer = document.getElementById('dashboardError');
  if (errorContainer) {
    errorContainer.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                <button onclick="loadDashboardData()" class="btn btn-small btn-outline">
                    Tentar Novamente
                </button>
            </div>
        `;
    errorContainer.style.display = 'block';
  }
}

// Load analytics for specific period
async function loadAnalytics(days) {
  const currentUser = window.elearning?.getCurrentUser();
  if (!currentUser) return;

  try {
    const response = await UserAPI.getAnalytics(currentUser.id, days);

    if (response.success) {
      updateAnalyticsSection(response.data);
    }
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

async function loadRecommendationsWithCache(userId) {
  const CACHE_KEY = `recommendations_cache_${userId}`;
  const CACHE_VERSION_KEY = `recommendations_version_${userId}`;
  const CACHE_DURATION = 24 * 60 * 60 * 1000;

  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    const cachedTimestamp = localStorage.getItem(`${CACHE_KEY}_timestamp`);
    
    if (cachedData && cachedVersion && cachedTimestamp) {
      const cacheAge = Date.now() - parseInt(cachedTimestamp);
      
      if (cacheAge < CACHE_DURATION) {
        const parsedCache = JSON.parse(cachedData);
        const parsedVersion = JSON.parse(cachedVersion);
        
        const currentVersion = await getRecommendationsCacheVersion(userId);
        
        if (currentVersion.trilhas_count === parsedVersion.trilhas_count &&
            currentVersion.completion_rate === parsedVersion.completion_rate) {
          console.log('Usando recomendações do cache');
          return parsedCache;
        } else {
          console.log('Cache inválido - dados do usuário mudaram');
        }
      } else {
        console.log('Cache expirado');
      }
    }

    console.log('Carregando novas recomendações da API');
    const response = await RecommendationsAPI.getAIRecommendations(userId, 2);
    
    if (response && response.success) {
      const currentVersion = await getRecommendationsCacheVersion(userId);
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(response));
      localStorage.setItem(CACHE_VERSION_KEY, JSON.stringify(currentVersion));
      localStorage.setItem(`${CACHE_KEY}_timestamp`, Date.now().toString());
    }
    
    return response;
  } catch (error) {
    console.error('Erro ao carregar recomendações:', error);
    return { success: false, error: error.message };
  }
}

async function getRecommendationsCacheVersion(userId) {
  try {
    const analyticsResponse = await UserAPI.getAnalytics(userId, 30);
    const customTrilhasResponse = await loadUserCustomTrilhas(userId);
    
    const completion_rate = analyticsResponse?.data?.completion_rate || 0;
    const trilhas_count = customTrilhasResponse?.data?.trilhas?.length || 0;
    
    return {
      trilhas_count: trilhas_count,
      completion_rate: Math.round(completion_rate),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Erro ao obter versão do cache:', error);
    return {
      trilhas_count: 0,
      completion_rate: 0,
      timestamp: Date.now()
    };
  }
}

function invalidateRecommendationsCache(userId) {
  const CACHE_KEY = `recommendations_cache_${userId}`;
  const CACHE_VERSION_KEY = `recommendations_version_${userId}`;
  const CACHE_TIMESTAMP_KEY = `${CACHE_KEY}_timestamp`;
  
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_VERSION_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  
  console.log('Cache de recomendações invalidado');
}

async function checkAndInvalidateRecommendationsCache(userId, analyticsData = null, customTrilhasData = null) {
  const CACHE_VERSION_KEY = `recommendations_version_${userId}`;
  const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
  
  if (!cachedVersion) return;
  
  try {
    const parsedVersion = JSON.parse(cachedVersion);
    let shouldInvalidate = false;
    
    if (analyticsData) {
      const currentCompletionRate = Math.round(analyticsData.completion_rate || 0);
      if (currentCompletionRate !== parsedVersion.completion_rate) {
        console.log(`Taxa de conclusão mudou: ${parsedVersion.completion_rate}% -> ${currentCompletionRate}%`);
        shouldInvalidate = true;
      }
    }
    
    if (customTrilhasData) {
      const currentTrilhasCount = customTrilhasData?.trilhas?.length || 0;
      if (currentTrilhasCount !== parsedVersion.trilhas_count) {
        console.log(`Quantidade de trilhas mudou: ${parsedVersion.trilhas_count} -> ${currentTrilhasCount}`);
        shouldInvalidate = true;
      }
    }
    
    if (shouldInvalidate) {
      invalidateRecommendationsCache(userId);
    }
  } catch (error) {
    console.error('Erro ao verificar cache:', error);
  }
}

async function loadUserCustomTrilhas(userId) {
  try {
    const response = await fetch(`/api/v1/trilhas-personalizadas/user/${userId}/created`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erro ao carregar trilhas personalizadas:', error);
    return { success: false, error: error.message };
  }
}

// Update recent activity
function updateRecentActivity(trilhas) {
  const activityList = document.getElementById('recentActivityList');
  if (!activityList) return;

  if (!trilhas || trilhas.length === 0) {
    activityList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>Nenhuma atividade recente</p>
                <p class="small-text">Crie sua primeira trilha para começar!</p>
            </div>
        `;
    return;
  }

  // Show the 5 most recent trilhas
  const recentTrilhas = trilhas.slice(0, 5);

  activityList.innerHTML = recentTrilhas.map(trilha => {
    const difficultyLabels = {
      'iniciante': 'Nível Iniciante',
      'intermediario': 'Nível Intermediário',
      'avancado': 'Nível Avançado',
      'beginner': 'Nível Iniciante',
      'intermediate': 'Nível Intermediário',
      'advanced': 'Nível Avançado'
    };

    const difficultyLabel = difficultyLabels[trilha.dificuldade] || trilha.dificuldade;

    // Calculate time ago
    let timeAgo = 'Hoje';
    if (trilha.created_at) {
      const createdDate = new Date(trilha.created_at);
      const now = new Date();
      const diffDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        timeAgo = 'Hoje';
      } else if (diffDays === 1) {
        timeAgo = 'Ontem';
      } else if (diffDays < 7) {
        timeAgo = `${diffDays} dias atrás`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        timeAgo = `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} atrás`;
      } else {
        const months = Math.floor(diffDays / 30);
        timeAgo = `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
      }
    }

    return `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-plus"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-title">${trilha.titulo}</p>
                    <p class="activity-description">${difficultyLabel} • ${trilha.modules_count || 0} módulos</p>
                </div>
                <div class="activity-time">${timeAgo}</div>
            </div>
        `;
  }).join('');
}

// Update custom trilhas section
function updateCustomTrilhasSection(customTrilhasData) {
  // Remove loading state before updating
  removeLoadingFromCard('customTrilhas');
  
  // Add custom trilhas card to dashboard if it doesn't exist
  let customTrilhasContainer = document.getElementById('customTrilhasContainer');

  if (!customTrilhasContainer) {
    // Create custom trilhas section
    const dashboardGrid = document.querySelector('.dashboard-grid');
    if (dashboardGrid) {
      const customTrilhasCard = document.createElement('div');
      customTrilhasCard.className = 'dashboard-card full-width-card';
      customTrilhasCard.innerHTML = `
        <div class="card-header">
          <h3>Trilhas Criadas</h3>
          <i class="fas fa-magic"></i>
        </div>
        <div id="customTrilhasContainer">
          <!-- Custom trilhas content will be loaded here -->
        </div>
      `;
      dashboardGrid.appendChild(customTrilhasCard);
      customTrilhasContainer = document.getElementById('customTrilhasContainer');
    }
  }

  if (!customTrilhasContainer) return;

  if (!customTrilhasData.trilhas || customTrilhasData.trilhas.length === 0) {
    customTrilhasContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-plus-circle"></i>
                <p>Nenhuma trilha personalizada criada ainda</p>
                <button class="btn btn-primary btn-small" onclick="window.trilhasPersonalizadas?.showCreateModal()">
                    Criar Primeira Trilha
                </button>
            </div>
        `;
    return;
  }

  const trilhas = customTrilhasData.trilhas;

  customTrilhasContainer.innerHTML = `
        <div class="custom-trilhas-stats">
            <div class="stat-item">
                <span class="stat-number">${trilhas.length}</span>
                <span class="stat-label">Trilhas Criadas</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${trilhas.reduce((sum, t) => sum + (t.enrollment_count || 0), 0)}</span>
                <span class="stat-label">Total Inscrições</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${Math.round(trilhas.reduce((sum, t) => sum + (t.completion_rate || 0), 0) / trilhas.length)}%</span>
                <span class="stat-label">Taxa Média de Conclusão</span>
            </div>
        </div>
        <div class="custom-trilhas-list" id="customTrilhasList">
            ${trilhas.slice(0, 3).map(trilha => `
                <div class="trilha-item" data-trilha-id="${trilha.id}">
                    <div class="trilha-info">
                        <h4>${trilha.titulo}</h4>
                        <div class="trilha-meta">
                            <span class="difficulty-badge difficulty-${trilha.dificuldade}">
                                ${getDifficultyLabel(trilha.dificuldade)}
                            </span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        ${trilhas.length > 3 ? `
            <div class="view-all-trilhas">
                <button class="btn btn-outline btn-small" onclick="window.elearning?.showSection('trilhas')">
                    Ver Todas as Trilhas
                </button>
            </div>
        ` : ''}
        <div class="create-new-trilha">
            <button class="btn btn-primary btn-small" onclick="window.trilhasPersonalizadas?.showCreateModal()">
                <i class="fas fa-plus"></i>
                Criar Nova Trilha
            </button>
        </div>
    `;
  
  setTimeout(() => {
    const customTrilhasCard = customTrilhasContainer.closest('.dashboard-card');
    if (customTrilhasCard) {
      customTrilhasCard.classList.remove('loading');
      const allElements = customTrilhasCard.querySelectorAll('.stat-number, .stat-label, .stat-value');
      allElements.forEach(el => {
        el.classList.remove('loading-pulse');
        el.style.opacity = '1';
        el.style.animation = 'none';
      });
      customTrilhasCard.style.opacity = '1';
    }
    
    updateCustomTrilhasButtons(trilhas.slice(0, 3));
  }, 100);
}

async function updateCustomTrilhasButtons(trilhas) {
  const currentUser = window.elearning?.getCurrentUser();
  if (!currentUser || !trilhas || trilhas.length === 0) return;
  
  for (const trilha of trilhas) {
    try {
      const progressResponse = await fetch(`/api/v1/trilhas/${trilha.id}/progress/${currentUser.id}`);
      const progressResult = await progressResponse.json();
      
      if (progressResult.success && progressResult.data) {
        const averageGrade = progressResult.data.average_grade || 0;
        const overallProgress = progressResult.data.overall_progress || 0;
        const completedContent = progressResult.data.completed_content || 0;
        const totalContent = progressResult.data.total_content || 0;
        const isCompleted = overallProgress >= 100 || (completedContent === totalContent && totalContent > 0);
        
        const trilhaItem = document.querySelector(`[data-trilha-id="${trilha.id}"]`);
        if (trilhaItem) {
          const button = trilhaItem.querySelector('.trilha-actions button');
          const statsDiv = trilhaItem.querySelector('.trilha-stats');
          
          if (button) {
            if (isCompleted) {
              button.innerHTML = `<i class="fas fa-chart-line"></i> Ver Resultado`;
              button.setAttribute('onclick', `window.trilhasPersonalizadas?.showTrilhaFinalResults(${trilha.id})`);
            } else {
              button.innerHTML = `<i class="fas fa-play"></i> Iniciar`;
              button.setAttribute('onclick', `window.trilhasPersonalizadas?.startTrilha(${trilha.id})`);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Erro ao buscar progresso da trilha ${trilha.id}:`, error);
    }
  }
}

// Export dashboard data
function exportDashboardData() {
  if (!dashboardData) {
    window.elearning?.showNotification('Nenhum dado para exportar', 'warning');
    return;
  }

  const dataStr = JSON.stringify(dashboardData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `dashboard-data-${new Date().toISOString().split('T')[0]}.json`;
  link.click();

  window.elearning?.showNotification('Dados exportados com sucesso!', 'success');
}

// Generate progress report
async function generateProgressReport() {
  const currentUser = window.elearning?.getCurrentUser();
  if (!currentUser) return;

  try {
    // This would call an API endpoint to generate a PDF report
    window.elearning?.showNotification('Relatório sendo gerado...', 'info');

    // For demo, just show success message
    setTimeout(() => {
      window.elearning?.showNotification('Relatório de progresso gerado!', 'success');
    }, 2000);

  } catch (error) {
    console.error('Error generating report:', error);
    window.elearning?.showNotification('Erro ao gerar relatório', 'error');
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Only initialize if we're on the dashboard section
  if (document.getElementById('dashboard')) {
    // Initialize immediately
    if (window.elearning?.getCurrentUser()) {
      initDashboard();
    }
  }
});

// Export functions
window.dashboard = {
  init: initDashboard,
  loadData: loadDashboardData,
  exportData: exportDashboardData,
  generateReport: generateProgressReport
};
