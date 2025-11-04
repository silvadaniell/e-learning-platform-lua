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

    const recommendationsPromise = RecommendationsAPI.getAIRecommendations(currentUser.id, 2).catch(err => {
      console.error('Recommendations error:', err);
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
      } else {
        console.warn('Analytics response not successful:', analyticsResponse);
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

    // Wait for all promises to complete (for error handling and data storage)
    const [profileResponse, analyticsResponse, recommendationsResponse, learningPathResponse, customTrilhasResponse] =
      await Promise.allSettled([
        profilePromise,
        analyticsPromise,
        recommendationsPromise,
        learningPathPromise,
        customTrilhasPromise
      ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : { success: false, data: {} }));

    // Store dashboard data
    dashboardData = {
      profile: profileResponse?.data || {},
      analytics: analyticsResponse?.data || {},
      recommendations: recommendationsResponse?.data || {},
      learningPath: learningPathResponse?.data || {},
      customTrilhas: customTrilhasResponse?.data || {}
    };

    // Final check to ensure loading is removed (in case all promises resolved before callbacks)
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
        <p>Carregando recomendações personalizadas...</p>
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
                <p>Continue estudando para receber recomendações personalizadas!</p>
            </div>
        `;
    return;
  }

  const recommendations = recommendationsData.structured_recommendations.content_recommendations;
  recommendationsGrid.innerHTML = recommendations.map(rec => `
        <div class="recommendation-card" onclick="handleRecommendationClick(${rec.id}, '${rec.type}')">
            <div class="recommendation-header">
                <div class="recommendation-icon">
                    <i class="fas fa-${getRecommendationIcon(rec.type)}"></i>
                </div>
                <h4 class="recommendation-title">${rec.titulo}</h4>
            </div>
            <p class="recommendation-description">${rec.reason}</p>
            <div class="recommendation-meta">
                <span class="difficulty-badge difficulty-${rec.dificuldade}">${getDifficultyLabel(rec.dificuldade)}</span>
                <span class="confidence-badge ${getConfidenceClass(rec.confidence)}">
                    ${Math.round(rec.confidence * 100)}% confiança
                </span>
            </div>
            <!-- adicionando o botão para nova trilha -->
          <div style="display: flex; justify-content: flex-begin; margin-top: 8px;">  
            <button class="btn btn-small btn-outline" onclick="window.trilhasPersonalizadas?.startTrilha(${rec.id})">
                <i class="fas fa-play"></i> Iniciar
            </button>
          </div>
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
                        Continuar
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

// Load user custom trilhas
async function loadUserCustomTrilhas(userId) {
  try {
    const response = await fetch(`/api/v1/trilhas-personalizadas/user/${userId}/created`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error loading custom trilhas:', error);
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
        <div class="custom-trilhas-list">
            ${trilhas.slice(0, 3).map(trilha => `
                <div class="trilha-item">
                    <div class="trilha-info">
                        <h4>${trilha.titulo}</h4>
                        <div class="trilha-meta">
                            <span class="difficulty-badge difficulty-${trilha.dificuldade}">
                                ${getDifficultyLabel(trilha.dificuldade)}
                            </span>
                            <span class="modules-count">${trilha.modules_count || 0} módulos</span>
                        </div>
                    </div>
                    <div class="trilha-stats">
                        <div class="stat">
                            <i class="fas fa-users"></i>
                            <span>${trilha.enrollment_count || 0}</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-chart-line"></i>
                            <span>${trilha.completion_rate || 0}%</span>
                        </div>
                    </div>
                    <button class="btn btn-small btn-outline" onclick="window.trilhasPersonalizadas?.startTrilha(${trilha.id})">
                        <i class="fas fa-play"></i>
                        Continuar
                    </button>
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
  }, 100);
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
