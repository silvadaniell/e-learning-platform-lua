// Dashboard JavaScript - User Analytics and Progress Tracking

// Dashboard state
let dashboardData = null;
let chartsInitialized = false;

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

// Load dashboard data
async function loadDashboardData() {
    const currentUser = window.elearning?.getCurrentUser();
    if (!currentUser) return;
    
    try {
        // Show loading state
        showDashboardLoading(true);
        
        // Load user profile with progress
        const profilePromise = UserAPI.getProfile(currentUser.id);
        
        // Load analytics
        const analyticsPromise = UserAPI.getAnalytics(currentUser.id, 30);
        
        // Load recommendations
        const recommendationsPromise = RecommendationsAPI.getAIRecommendations(currentUser.id, 5);
        
        // Load learning path
        const learningPathPromise = UserAPI.getLearningPath(currentUser.id);
        
        // Wait for all data
        const [profileResponse, analyticsResponse, recommendationsResponse, learningPathResponse] = 
            await Promise.all([profilePromise, analyticsPromise, recommendationsPromise, learningPathPromise]);
        
        // Update dashboard with loaded data
        if (profileResponse.success) {
            updateProfileSection(profileResponse.data);
        }
        
        if (analyticsResponse.success) {
            updateAnalyticsSection(analyticsResponse.data);
        }
        
        if (recommendationsResponse.success) {
            updateRecommendationsSection(recommendationsResponse.data);
        }
        
        if (learningPathResponse.success) {
            updateLearningPathSection(learningPathResponse.data);
        }
        
        // Store dashboard data
        dashboardData = {
            profile: profileResponse.data,
            analytics: analyticsResponse.data,
            recommendations: recommendationsResponse.data,
            learningPath: learningPathResponse.data
        };
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showDashboardError('Erro ao carregar dados do dashboard');
    } finally {
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
    // Update main stats
    updateStatCard('overallProgress', `${analyticsData.completion_rate || 0}%`);
    updateStatCard('activeTrilhas', analyticsData.total_activities || 0);
    updateStatCard('studyTime', `${analyticsData.total_study_time_hours || 0}h`);
    updateStatCard('learningStreak', `${analyticsData.learning_streak || 0} dias`);
    
    // Update progress circle
    updateProgressCircle(analyticsData.completion_rate || 0);
    
    // Update detailed analytics
    updateDetailedAnalytics(analyticsData);
}

// Update stat card
function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        
        // Add animation
        element.style.transform = 'scale(1.1)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }
}

// Update progress circle
function updateProgressCircle(percentage) {
    const progressCircle = document.querySelector('.progress-circle');
    const progressValue = document.querySelector('.progress-value');
    
    if (progressCircle && progressValue) {
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

// Update recommendations section
function updateRecommendationsSection(recommendationsData) {
    const recommendationsGrid = document.getElementById('recommendationsGrid');
    if (!recommendationsGrid) return;
    
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
    const loadingElements = document.querySelectorAll('.dashboard-loading');
    const contentElements = document.querySelectorAll('.dashboard-content');
    
    loadingElements.forEach(el => {
        el.style.display = show ? 'block' : 'none';
    });
    
    contentElements.forEach(el => {
        el.style.opacity = show ? '0.5' : '1';
    });
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

// Export dashboard data
function exportDashboardData() {
    if (!dashboardData) {
        window.elearning?.showNotification('Nenhum dado para exportar', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(dashboardData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
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
        // Wait for user to be loaded
        setTimeout(() => {
            if (window.elearning?.currentUser()) {
                initDashboard();
            }
        }, 1000);
    }
});

// Export functions
window.dashboard = {
    init: initDashboard,
    loadData: loadDashboardData,
    exportData: exportDashboardData,
    generateReport: generateProgressReport
};
