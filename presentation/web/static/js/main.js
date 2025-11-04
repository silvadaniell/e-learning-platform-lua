// Main JavaScript - E-Learning Platform
// Core application logic, navigation, and UI interactions

// Global application state
window.elearning = {
    currentUser: null,
    currentSection: 'home',
    isAuthenticated: false,
    
    // User management
    setCurrentUser: function(user) {
        console.log('setCurrentUser called with:', user);
        this.currentUser = user;
        this.isAuthenticated = !!user;
        console.log('isAuthenticated set to:', this.isAuthenticated);
        localStorage.setItem('elearning_user', JSON.stringify(user));
        this.updateUIForAuthState();
    },
    
    getCurrentUser: function() {
        if (!this.currentUser) {
            const stored = localStorage.getItem('elearning_user');
            if (stored) {
                this.currentUser = JSON.parse(stored);
                this.isAuthenticated = true;
            }
        }
        return this.currentUser;
    },
    
    logout: function() {
        console.log('Logging out and clearing all user data');
        this.currentUser = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem('elearning_user');
        localStorage.removeItem('elearning_token');
        
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('elearning_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        this.updateUIForAuthState();
        this.showSection('trilhas');
    },
    
    // UI state management
    updateUIForAuthState: function() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const navActions = document.querySelector('.nav-actions');
        const aiAssistantLink = document.querySelector('a[href="#chatbot"]');
        const homeLink = document.querySelector('a[href="#home"]');
        
        // Show/hide AI Assistant link based on authentication
        if (aiAssistantLink) {
            if (this.isAuthenticated) {
                aiAssistantLink.style.display = 'inline-block';
            } else {
                aiAssistantLink.style.display = 'none';
            }
        }
        
        // Show/hide Home link based on authentication
        if (homeLink) {
            if (this.isAuthenticated) {
                homeLink.style.display = 'none';
            } else {
                homeLink.style.display = 'inline-block';
            }
        }
        
        if (this.isAuthenticated && this.currentUser) {
            // Show user menu instead of login/register buttons
            navActions.innerHTML = `
                <div class="user-menu">
                    <span class="user-name">Olá, ${this.currentUser.nome || this.currentUser.email}</span>
                    <button class="btn btn-outline" id="logoutBtn">Sair</button>
                </div>
            `;
            
            // Add logout event listener
            document.getElementById('logoutBtn').addEventListener('click', () => {
                this.logout();
            });
            
            // Update trilhas personalizadas buttons if on trilhas section
            if (this.currentSection === 'trilhas' && window.trilhasPersonalizadas?.checkStatus) {
                setTimeout(() => {
                    window.trilhasPersonalizadas.checkStatus();
                }, 100);
            }
        } else {
            // Show login/register buttons
            navActions.innerHTML = `
                <button class="btn btn-outline" id="loginBtn">Entrar</button>
                <button class="btn btn-primary" id="registerBtn">Cadastrar</button>
            `;
            
            // Re-add event listeners
            setupAuthButtons();
            
            // Hide trilhas personalizadas buttons
            const createBtn = document.getElementById('createTrilhaBtn');
            const continueBtn = document.getElementById('continueTrilhaBtn');
            if (createBtn) createBtn.style.display = 'none';
            if (continueBtn) continueBtn.style.display = 'none';
        }
    },
    
    // Section navigation
    showSection: function(sectionId) {
        console.log('showSection called with:', sectionId);
        
        // Hide all sections
        const sections = document.querySelectorAll('.section');
        console.log('Found sections:', sections.length);
        sections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        console.log('Target section found:', !!targetSection);
        if (targetSection) {
            targetSection.style.display = 'block';
            this.currentSection = sectionId;
            console.log('Section displayed:', sectionId);
        } else {
            console.error('Section not found:', sectionId);
        }
        
        // Update navigation
        this.updateNavigation(sectionId);
        
        // Load section-specific data
        this.loadSectionData(sectionId);
    },
    
    updateNavigation: function(activeSection) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${activeSection}`) {
                link.classList.add('active');
            }
        });
    },
    
    loadSectionData: function(sectionId) {
        console.log('loadSectionData called with:', sectionId);
        console.log('isAuthenticated:', this.isAuthenticated);
        
        switch(sectionId) {
            case 'trilhas':
                if (typeof loadTrilhas === 'function') {
                    loadTrilhas();
                }
                // Check trilhas personalizadas status if user is logged in
                if (this.isAuthenticated && window.trilhasPersonalizadas?.checkStatus) {
                    window.trilhasPersonalizadas.checkStatus();
                }
                break;
            case 'dashboard':
                if (this.isAuthenticated) {
                    console.log('User is authenticated, loading dashboard...');
                    if (typeof initDashboard === 'function') {
                        console.log('Calling initDashboard function...');
                        initDashboard();
                    } else {
                        console.log('initDashboard function not available, but dashboard section should be visible');
                    }
                } else {
                    console.log('User not authenticated, redirecting to home');
                    this.showSection('home');
                    showModal('loginModal');
                }
                break;
            case 'chatbot':
                if (this.isAuthenticated) {
                    console.log('User is authenticated, loading chatbot...');
                    if (typeof initChat === 'function') {
                        initChat();
                    }
                } else {
                    console.log('User not authenticated, redirecting to home');
                    this.showSection('home');
                    showModal('loginModal');
                }
                break;
        }
    }
};

// Modal management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function hideAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// Authentication functions
function setupAuthButtons() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => showModal('loginModal'));
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => showModal('registerModal'));
    }
}

// Form handling
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('Por favor, preencha todos os campos', 'error');
        return;
    }
    
    try {
        showLoading(true);
        window.elearning.logout();
        
        const response = await UserAPI.login(email, password);
        
        if (response.success && response.data && response.data.access_token && response.data.user) {
            console.log('Login successful for user:', response.data.user.id, response.data.user.email);
            
            localStorage.setItem('elearning_token', response.data.access_token);
            localStorage.setItem('elearning_user_id', response.data.user.id.toString());
            
            window.elearning.setCurrentUser(response.data.user);
            
            hideModal('loginModal');
            showNotification(`Bem-vindo, ${response.data.user.nome}!`, 'success');
            
            document.getElementById('loginForm').reset();
            
            console.log('Redirecting to dashboard...');
            window.elearning.showSection('dashboard');
        }
    } catch (error) {
        console.error('Login error:', error);
        window.elearning.logout();
        showNotification(error.message || 'Erro ao fazer login', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showNotification('Por favor, preencha todos os campos', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('As senhas não coincidem', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }
    
    try {
        showLoading(true);
        window.elearning.logout();
        
        const userData = {
            nome: name,
            email: email,
            senha: password,
            perfil_aprendizado: 'beginner'
        };
        
        const response = await UserAPI.register(userData);
        
        hideModal('registerModal');
        showNotification('Conta criada com sucesso! Faça login para continuar.', 'success');
        
        document.getElementById('registerForm').reset();
        
        setTimeout(() => {
            const loginEmailField = document.getElementById('loginEmail');
            if (loginEmailField) {
                loginEmailField.value = email;
            }
            showModal('loginModal');
        }, 1000);
        
    } catch (error) {
        console.error('Register error:', error);
        showNotification(error.message || 'Erro ao criar conta', 'error');
    } finally {
        showLoading(false);
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

// Loading state
function showLoading(show) {
    let loader = document.querySelector('.global-loader');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'global-loader';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="loader-spinner"></div>
                    <p>Carregando...</p>
                </div>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    } else {
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// Trilhas loading function
async function loadTrilhas() {
    const trilhasGrid = document.getElementById('trilhasGrid');
    if (!trilhasGrid) return;
    
    // Check user trilha status for personalized trilhas
    if (window.elearning?.isAuthenticated && window.trilhasPersonalizadas?.checkStatus) {
        await window.trilhasPersonalizadas.checkStatus();
    }
    
    try {
        trilhasGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando trilhas...</p>
            </div>
        `;
        
        // If user is authenticated, load their personalized trilhas
        let currentUser = null;
        if (window.elearning?.isAuthenticated) {
            currentUser = window.elearning.getCurrentUser();
            if (currentUser && window.trilhasPersonalizadas?.showUserTrilhas) {
                console.log('Loading personalized trilhas for authenticated user');
                // Call the function that loads and displays user trilhas
                if (typeof showUserTrilhas === 'function') {
                    await showUserTrilhas();
                    return;
                }
            }
        }
        
        // Fallback: load standard trilhas from API applying user filter when available
        const params = {};
        if (currentUser?.id) {
            params.user_id = currentUser.id;
        }
        
        const trilhasResponse = await TrilhaAPI.getAll(params);
        const extractTrilhas = (response) => {
            if (!response) return [];
            if (Array.isArray(response)) return response;
            if (Array.isArray(response?.data?.trilhas)) return response.data.trilhas;
            if (Array.isArray(response?.trilhas)) return response.trilhas;
            return [];
        };
        
        const trilhasData = extractTrilhas(trilhasResponse).map(trilha => {
            const dificuldade = trilha.dificuldade || trilha.nivel || 'beginner';
            return {
                id: trilha.id,
                titulo: trilha.titulo || trilha.nome || 'Trilha',
                dificuldade,
                descricao: trilha.descricao || trilha.description || 'Conteúdo disponível em breve.',
                modulesCount: trilha.modules_count ?? trilha.total_conteudos ?? 0,
                duracao: trilha.estimated_duration || trilha.duracao_estimada || 'N/A'
            };
        });
        
        if (trilhasData.length > 0) {
            trilhasGrid.innerHTML = trilhasData.map(trilha => `
                <div class="trilha-card" data-level="${trilha.dificuldade}">
                    <div class="trilha-header">
                        <h3 class="trilha-title">${trilha.titulo}</h3>
                        <span class="trilha-level">${getLevelLabel(trilha.dificuldade)}</span>
                    </div>
                    <p class="trilha-description">${trilha.descricao}</p>
                    <div class="trilha-stats">
                        <span><i class="fas fa-book"></i> ${trilha.modulesCount} conteúdos</span>
                        <span><i class="fas fa-clock"></i> ${trilha.duracao}</span>
                    </div>
                    <div class="trilha-actions">
                        <button class="btn btn-primary" onclick="startTrilha(${trilha.id})">
                            Iniciar Trilha
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            trilhasGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <h3>Nenhuma trilha disponível</h3>
                    <p>Novas trilhas serão adicionadas em breve!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading trilhas:', error);
        trilhasGrid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar trilhas</h3>
                <p>Tente novamente mais tarde.</p>
                <button class="btn btn-outline" onclick="loadTrilhas()">Tentar Novamente</button>
            </div>
        `;
    }
}

function getLevelLabel(level) {
    const labels = {
        'beginner': 'Iniciante',
        'intermediate': 'Intermediário',
        'advanced': 'Avançado'
    };
    return labels[level] || 'Iniciante';
}

async function startTrilha(trilhaId) {
    if (!window.elearning.isAuthenticated) {
        showNotification('Faça login para iniciar uma trilha', 'warning');
        showModal('loginModal');
        return;
    }
    
    try {
        showLoading(true);
        const currentUser = window.elearning.getCurrentUser();
        await TrilhaAPI.enroll(trilhaId, currentUser.id);
        showNotification('Trilha iniciada com sucesso!', 'success');
        window.elearning.showSection('dashboard');
    } catch (error) {
        console.error('Error starting trilha:', error);
        showNotification(error.message || 'Erro ao iniciar trilha', 'error');
    } finally {
        showLoading(false);
    }
}

// Filter trilhas
function filterTrilhas(level) {
    const trilhasGrid = document.getElementById('trilhasGrid');
    const trilhaCards = document.querySelectorAll('.trilha-card');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // Update active filter button
    filterBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === level) {
            btn.classList.add('active');
        }
    });
    
    // Remove any existing empty state message
    const existingEmptyState = trilhasGrid?.querySelector('.filter-empty-state');
    if (existingEmptyState) {
        existingEmptyState.remove();
    }
    
    // Filter cards
    let visibleCount = 0;
    trilhaCards.forEach(card => {
        if (level === 'all' || card.dataset.level === level) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show message if no cards are visible and there are cards (not the initial empty state)
    if (visibleCount === 0 && trilhaCards.length > 0) {
        const levelLabels = {
            'beginner': 'iniciante',
            'intermediate': 'intermediário',
            'advanced': 'avançado'
        };
        const levelLabel = levelLabels[level] || level;
        
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'filter-empty-state';
        emptyMessage.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 3rem;';
        emptyMessage.innerHTML = `
            <i class="fas fa-filter" style="font-size: 3rem; color: #6c63ff; margin-bottom: 1rem; opacity: 0.5;"></i>
            <h3>Nenhuma trilha de nível ${levelLabel}</h3>
            <p>Tente criar uma nova trilha ou selecione outro filtro.</p>
        `;
        trilhasGrid?.appendChild(emptyMessage);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('E-Learning Platform - Main JS Loaded');
    
    // Check for existing user session
    window.elearning.getCurrentUser();
    
    // Setup navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('href').substring(1);
            window.elearning.showSection(sectionId);
        });
    });
    
    // Setup auth buttons
    setupAuthButtons();
    
    // Setup modal close buttons
    const modalCloses = document.querySelectorAll('.modal-close');
    modalCloses.forEach(close => {
        close.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });
    
    // Setup modal background clicks
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal.id);
            }
        });
    });
    
    // Setup forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Setup trilha filters
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterTrilhas(btn.dataset.filter);
        });
    });
    
    // Setup hero buttons
    const startLearningBtn = document.getElementById('startLearningBtn');
    if (startLearningBtn) {
        startLearningBtn.addEventListener('click', () => {
            if (window.elearning.isAuthenticated) {
                window.elearning.showSection('trilhas');
            } else {
                showModal('registerModal');
            }
        });
    }
    
    const exploreFeaturesBtn = document.getElementById('exploreFeaturesBtn');
    if (exploreFeaturesBtn) {
        exploreFeaturesBtn.addEventListener('click', () => {
            window.elearning.showSection('trilhas');
        });
    }
    
    // Setup floating chatbot
    const floatingChatbot = document.getElementById('floatingChatbot');
    if (floatingChatbot) {
        floatingChatbot.addEventListener('click', () => {
            window.elearning.showSection('chatbot');
        });
    }
    
    // Load initial section data
    // If user is authenticated, show dashboard; otherwise show trilhas
    if (window.elearning.isAuthenticated) {
        window.elearning.showSection('trilhas');
    } else {
        window.elearning.loadSectionData('trilhas');
    }
    
    // Update UI for current auth state
    window.elearning.updateUIForAuthState();
    
    console.log('Application initialized successfully');
});

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        window.elearning.showSection(hash);
    }
});

// Export for global access
window.showModal = showModal;
window.hideModal = hideModal;
window.showNotification = showNotification;
window.loadTrilhas = loadTrilhas;
window.startTrilha = startTrilha;
window.filterTrilhas = filterTrilhas;
