// Trilhas Personalizadas JavaScript - Custom Learning Paths Management

// Global state for trilhas personalizadas
let trilhaPersonalizadaState = {
    currentQuizSession: null,
    currentQuestion: null,
    quizTimer: null,
    timeRemaining: 0,
    selectedAnswers: {}
};

// Initialize trilhas personalizadas functionality
function initTrilhasPersonalizadas() {
    setupTrilhaEventListeners();
    checkUserTrilhaStatus();
    console.log('Trilhas Personalizadas initialized');
}

// Setup event listeners for trilha functionality
function setupTrilhaEventListeners() {
    // Create trilha button
    const createTrilhaBtn = document.getElementById('createTrilhaBtn');
    if (createTrilhaBtn) {
        createTrilhaBtn.addEventListener('click', showCreateTrilhaModal);
    }

    // Continue trilha button
    const continueTrilhaBtn = document.getElementById('continueTrilhaBtn');
    if (continueTrilhaBtn) {
        continueTrilhaBtn.addEventListener('click', () => {
            console.log('Continue trilha button clicked');
            showUserTrilhas();
        });
    }

    // Create trilha form
    const createTrilhaForm = document.getElementById('createTrilhaForm');
    
    if (createTrilhaForm) {
        createTrilhaForm.addEventListener('submit', handleCreateTrilha);

        // Form validation to enable/disable submit button
        const topicInput = document.getElementById('trilhaTopic');
        const difficultySelect = document.getElementById('trilhaDifficulty');
        const submitBtn = createTrilhaForm.querySelector('button[type="submit"]');

        function validateCreateForm() {
            const isValid = topicInput && topicInput.value.trim() && difficultySelect && difficultySelect.value;
            if (submitBtn) {
                submitBtn.disabled = !isValid;
                submitBtn.style.opacity = isValid ? '1' : '0.6';
            }
        }
        if (topicInput) topicInput.addEventListener('input', validateCreateForm);
        if (difficultySelect) difficultySelect.addEventListener('change', validateCreateForm);


        setTimeout(validateCreateForm, 100);
    }


    // Preview trilha button
    const previewTrilhaBtn = document.getElementById('previewTrilhaBtn');
    if (previewTrilhaBtn) {
        previewTrilhaBtn.addEventListener('click', showTrilhaPreview);
    }

    // Quiz navigation buttons
    const quizNextBtn = document.getElementById('quizNextBtn');
    if (quizNextBtn) {
        quizNextBtn.addEventListener('click', handleQuizNext);
    }

    const quizPrevBtn = document.getElementById('quizPrevBtn');
    if (quizPrevBtn) {
        quizPrevBtn.addEventListener('click', handleQuizPrevious);
    }

    // Quiz finish button
    const finishQuizBtn = document.getElementById('finishQuizBtn');
    if (finishQuizBtn) {
        finishQuizBtn.addEventListener('click', finishQuiz);
    }

    // Review answers button
    const reviewAnswersBtn = document.getElementById('reviewAnswersBtn');
    if (reviewAnswersBtn) {
        reviewAnswersBtn.addEventListener('click', reviewQuizAnswers);
    }
}

// Check user trilha status to show appropriate buttons
async function checkUserTrilhaStatus() {
    console.log('checkUserTrilhaStatus called');
    const currentUser = window.elearning?.getCurrentUser();
    console.log('Current user:', currentUser);

    if (!currentUser) {
        console.log('No current user found');
        return;
    }

    try {
        console.log('Fetching trilha status for user:', currentUser.id);
        const response = await fetch(`/api/v1/trilhas-personalizadas/user/${currentUser.id}/check-active`);
        const result = await response.json();

        console.log('Trilha status response:', result);

        if (result.success) {
            const createBtn = document.getElementById('createTrilhaBtn');
            const continueBtn = document.getElementById('continueTrilhaBtn');

            console.log('Create button found:', !!createBtn);
            console.log('Continue button found:', !!continueBtn);

            if (result.data.has_active_trilhas) {
                // User has active trilhas - show both options
                console.log('User has active trilhas - showing both buttons');
                if (createBtn) createBtn.style.display = 'inline-block';
                if (continueBtn) continueBtn.style.display = 'inline-block';
            } else {
                // User has no active trilhas - show only create option
                console.log('User has no active trilhas - showing create button only');
                if (createBtn) createBtn.style.display = 'inline-block';
                if (continueBtn) continueBtn.style.display = 'none';
            }
        } else {
            console.error('API returned error:', result);
        }
    } catch (error) {
        console.error('Error checking user trilha status:', error);

        // Fallback - show create button if user is logged in
        const createBtn = document.getElementById('createTrilhaBtn');
        if (createBtn && currentUser) {
            console.log('Fallback: showing create button');
            createBtn.style.display = 'inline-block';
        }
    }
}

// Show create trilha modal
function showCreateTrilhaModal() {
    const modal = document.getElementById('createTrilhaModal');
    if (modal) {
        modal.style.display = 'block';

        // Reset form
        const form = document.getElementById('createTrilhaForm');
        if (form) form.reset();

        // Hide preview
        const preview = document.getElementById('trilhaPreview');
        if (preview) preview.style.display = 'none';

        // Hide progress
        const progress = document.getElementById('trilhaCreationProgress');
        if (progress) progress.style.display = 'none';
    }
}

// Show trilha preview
function showTrilhaPreview() {
    const topic = document.getElementById('trilhaTopic').value;
    const difficulty = document.getElementById('trilhaDifficulty').value;

    if (!topic || !difficulty) {
        window.elearning?.showNotification('Preencha todos os campos primeiro', 'warning');
        return;
    }

    // Generate preview data
    const preview = generateTrilhaPreview(topic, difficulty);

    // Update preview elements
    document.getElementById('previewTitle').textContent = preview.title;
    document.getElementById('previewDescription').textContent = preview.description;
    document.getElementById('previewModules').textContent = preview.modules;
    document.getElementById('previewDuration').textContent = preview.duration;

    // Show preview
    const previewDiv = document.getElementById('trilhaPreview');
    if (previewDiv) previewDiv.style.display = 'block';
}

// Generate trilha preview data
function generateTrilhaPreview(topic, difficulty) {
    const difficultyLabels = {
        iniciante: 'Fundamentos',
        intermediario: 'Intermediário',
        avancado: 'Avançado'
    };

    const modulesCounts = {
        iniciante: 3,
        intermediario: 4,
        avancado: 5
    };

    const title = `${topic} - ${difficultyLabels[difficulty]}`;
    const description = `Aprenda ${topic} de forma estruturada com conteúdo ${difficulty} e exercícios práticos.`;
    const modules = `${modulesCounts[difficulty]} módulos`;
    const duration = `${modulesCounts[difficulty] * 30} minutos estimados`;

    return { title, description, modules, duration };
}

// Handle create trilha form submission
async function handleCreateTrilha(event) {
    event.preventDefault();
    console.log('handleCreateTrilha called');

    const currentUser = window.elearning?.getCurrentUser();
    console.log('Current user:', currentUser);

    if (!currentUser) {
        if (window.elearning?.showNotification) {
            window.elearning.showNotification('Você precisa estar logado para criar trilhas', 'error');
        } else {
            alert('Você precisa estar logado para criar trilhas');
        }
        return;
    }

    const topic = document.getElementById('trilhaTopic').value;
    const difficulty = document.getElementById('trilhaDifficulty').value;

    console.log('Form data:', { topic, difficulty });

    if (!topic || !difficulty) {
        if (window.elearning?.showNotification) {
            window.elearning.showNotification('Preencha todos os campos', 'warning');
        } else {
            alert('Preencha todos os campos');
        }
        return;
    }

    // Show creation progress
    const form = document.getElementById('createTrilhaForm');
    const progress = document.getElementById('trilhaCreationProgress');

    console.log('Showing progress...');
    if (form) form.style.display = 'none';
    if (progress) progress.style.display = 'block';

    try {
        // Animate progress steps
        animateCreationProgress();

        console.log('Making API request...');
        const response = await fetch('/api/v1/trilhas-personalizadas/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                topic: topic,
                difficulty: difficulty
            })
        });

        console.log('API response status:', response.status);
        const result = await response.json();
        console.log('API result:', result);

        if (result.success) {
            // Success - show completion
            console.log('Trilha created successfully');
            showCreationSuccess(result.data);
        } else {
            throw new Error(result.detail || 'Failed to create trilha');
        }

    } catch (error) {
        console.error('Error creating trilha:', error);
        if (window.elearning?.showNotification) {
            window.elearning.showNotification('Erro ao criar trilha: ' + error.message, 'error');
        } else {
            alert('Erro ao criar trilha: ' + error.message);
        }

        // Reset form display
        if (form) form.style.display = 'block';
        if (progress) progress.style.display = 'none';
    }
}

// Animate creation progress steps
function animateCreationProgress() {
    const steps = document.querySelectorAll('.progress-steps .step');
    let currentStep = 0;

    const animateStep = () => {
        if (currentStep < steps.length) {
            // Activate current step
            steps[currentStep].classList.add('active');

            // Deactivate previous step
            if (currentStep > 0) {
                steps[currentStep - 1].classList.remove('active');
                steps[currentStep - 1].classList.add('completed');
            }

            currentStep++;
            setTimeout(animateStep, 2000); // 2 seconds per step
        }
    };

    setTimeout(animateStep, 1000); // Start after 1 second
}

// Show creation success
function showCreationSuccess(trilhaData) {
    console.log('showCreationSuccess called with:', trilhaData);

    // Resetar completamente o modal de criação e sua animação
    const modal = document.getElementById('createTrilhaModal');
    if (modal) {
        console.log('Closing modal');
        modal.style.display = 'none';
    }
    
    // Resetar a animação de progresso
    const progress = document.getElementById('trilhaCreationProgress');
    if (progress) {
        progress.style.display = 'none';
        // Resetar os steps da animação
        const steps = progress.querySelectorAll('.progress-steps .step');
        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index === 0) {
                step.classList.add('active');
            }
        });
    }
    
    // Resetar o formulário
    const form = document.getElementById('createTrilhaForm');
    if (form) {
        form.style.display = 'block';
        form.reset();
    }

    // Show success notification
    if (window.elearning?.showNotification) {
        window.elearning.showNotification('Trilha criada com sucesso!', 'success');
    } else if (window.showNotification) {
        window.showNotification('Trilha criada com sucesso!', 'success');
    } else {
        alert('Trilha criada com sucesso!');
    }

    // Refresh trilhas list
    console.log('Refreshing trilhas list');
    if (typeof loadTrilhas === 'function') {
        loadTrilhas();
    }

    // Show user trilhas (the personalized ones)
    console.log('Showing user trilhas');
    showUserTrilhas();

    // Update user status
    console.log('Updating user status');
    checkUserTrilhaStatus();

    // Show success modal with option to start
    console.log('Showing success modal');
    showTrilhaSuccessModal(trilhaData);
}

// Show trilha success modal
function showTrilhaSuccessModal(trilhaData) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay success-modal-overlay';
    modal.innerHTML = `
        <div class="modal-content success-modal">
            <div class="modal-header success-header">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Trilha Criada com Sucesso!</h3>
            </div>
            <div class="modal-body">
                <div class="success-message">
                    <p>Sua trilha <strong>"${trilhaData.titulo}"</strong> foi criada e está pronta para uso!</p>
                    <div class="trilha-info-success">
                        <div class="info-item">
                            <i class="fas fa-book"></i>
                            <span>${trilhaData.modules_count || 3} módulos</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-signal"></i>
                            <span>Nível ${getDifficultyLabel(trilhaData.dificuldade)}</span>
                        </div>
                    </div>
                    <p class="success-question">Deseja começar agora?</p>
                </div>
            </div>
            <div class="modal-footer success-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                    Agora Não
                </button>
                <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); startTrilha(${trilhaData.id})">
                    <i class="fas fa-play"></i>
                    Começar Agora
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

async function showUserTrilhas() {
    console.log('showUserTrilhas called');
    const currentUser = window.elearning?.getCurrentUser();
    if (!currentUser) {
        console.log('No current user found');
        return;
    }
    
    const storedUserId = localStorage.getItem('elearning_user_id');
    if (storedUserId && parseInt(storedUserId) !== currentUser.id) {
        console.error('User ID mismatch! Stored:', storedUserId, 'Current:', currentUser.id);
        console.error('Forcing logout to prevent data contamination');
        window.elearning.logout();
        window.elearning.showNotification('Sessão inválida. Por favor, faça login novamente.', 'error');
        showModal('loginModal');
        return;
    }
    
    try {
        console.log('Fetching user trilhas for user:', currentUser.id, currentUser.email);
        const response = await fetch(`/api/v1/trilhas-personalizadas/user/${currentUser.id}/created`);
        const result = await response.json();

        console.log('User trilhas response:', result);

        if (result.success && result.data.trilhas) {
            console.log(`Found ${result.data.trilhas.length} trilhas for user ${currentUser.id}`);
            displayUserTrilhas(result.data.trilhas);
        } else {
            console.log('No trilhas found or error in response');
            displayUserTrilhas([]);
        }
    } catch (error) {
        console.error('Error loading user trilhas:', error);
        if (window.elearning?.showNotification) {
            window.elearning.showNotification('Erro ao carregar trilhas', 'error');
        } else {
            alert('Erro ao carregar trilhas');
        }
    }
}

async function displayUserTrilhas(trilhas) {
    const trilhasGrid = document.getElementById('trilhasGrid');
    if (!trilhasGrid) return;

    if (!trilhas || trilhas.length === 0) {
        trilhasGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fas fa-book-open" style="font-size: 4rem; color: #6c63ff; margin-bottom: 1rem;"></i>
                <h3>Nenhuma trilha disponível</h3>
                <p>Novas trilhas serão adicionadas em breve!</p>
            </div>
        `;
        return;
    }

    const currentUser = window.elearning?.getCurrentUser();
    if (!currentUser) return;

    const difficultyMap = {
        'iniciante': 'beginner',
        'intermediario': 'intermediate',
        'avancado': 'advanced'
    };

    const trilhasWithProgress = await Promise.all(trilhas.map(async (trilha) => {
        let averageGrade = 0;
        let hasStarted = false;
        let isCompleted = false;
        
        try {
            const progressResponse = await fetch(`/api/v1/trilhas/${trilha.id}/progress/${currentUser.id}`);
            const progressResult = await progressResponse.json();
            
            if (progressResult.success && progressResult.data) {
                const data = progressResult.data;
                averageGrade = data.average_grade || 0;
                hasStarted = (data.completed_content || 0) > 0 || (data.total_study_time_minutes || 0) > 0;
                const overallProgress = data.overall_progress || 0;
                const completedContent = data.completed_content || 0;
                const totalContent = data.total_content || 0;
                
                if (totalContent > 0) {
                    isCompleted = overallProgress >= 100 || completedContent === totalContent;
                } else {
                    isCompleted = false;
                }
            } else if (progressResult.success) {
                isCompleted = false;
            }
            
            if (trilha.completion_rate !== undefined && !isCompleted) {
                isCompleted = trilha.completion_rate >= 50;
            }
        } catch (error) {
            console.error(`Erro ao buscar progresso da trilha ${trilha.id}:`, error);
            if (trilha.completion_rate !== undefined) {
                isCompleted = trilha.completion_rate >= 50;
            }
        }
        
        return { ...trilha, averageGrade, hasStarted, isCompleted };
    }));

    trilhasGrid.innerHTML = trilhasWithProgress.map(trilha => {
        const englishDifficulty = difficultyMap[trilha.dificuldade] || trilha.dificuldade;
        const showPercentage = trilha.averageGrade > 0;
        
        return `
        <div class="trilha-card user-trilha" data-trilha-id="${trilha.id}" data-level="${englishDifficulty}">
            <div class="trilha-card-header">
                <button class="trilha-delete-btn" onclick="showDeleteConfirmation(${trilha.id}, '${trilha.titulo.replace(/'/g, "\\'")}')">
                    <i class="fas fa-trash"></i>
                </button>
                <h3 class="trilha-title">${trilha.titulo}</h3>
                <span class="trilha-difficulty difficulty-${trilha.dificuldade}">
                    ${getDifficultyLabel(trilha.dificuldade)}
                </span>
            </div>
            <div class="trilha-card-body">
                <p class="trilha-description">${trilha.descricao}</p>
                <div class="trilha-stats">
                    <div class="stat">
                        <i class="fas fa-book"></i>
                        <span>${trilha.modules_count || 0} módulos</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-users"></i>
                        <span>${trilha.enrollment_count || 0} inscritos</span>
                    </div>
                    ${showPercentage ? `
                    <div class="stat">
                        <i class="fas fa-percentage"></i>
                        <span>${Math.round(trilha.averageGrade)}% acerto</span>
                    </div>
                    ` : ''}
                </div>
                <div class="trilha-actions" style="display: flex; align-items: center; gap: 1rem;">
                    <button class="btn btn-primary" onclick="startTrilha(${trilha.id})">
                        <i class="fas fa-play"></i>
                        Iniciar
                    </button>
                    <button class="btn btn-outline" onclick="viewTrilhaDetails(${trilha.id})">
                        <i class="fas fa-info"></i>
                        Detalhes
                    </button>
                </div>
            </div>
        </div>
    `}).join('');

    applyActiveFilter();
}

// Apply the currently active filter
function applyActiveFilter() {
    const activeFilterBtn = document.querySelector('.filter-btn.active');
    if (activeFilterBtn && window.filterTrilhas) {
        const currentFilter = activeFilterBtn.dataset.filter;
        console.log('Applying active filter:', currentFilter);
        window.filterTrilhas(currentFilter);
    }
}

// Start trilha (begin first module)
window.startTrilha = async function startTrilha(trilhaId) {
    const currentUser = window.elearning?.getCurrentUser();
    if (!currentUser) {
        if (window.elearning?.showNotification) {
            window.elearning.showNotification('Você precisa estar logado para iniciar trilhas', 'error');
        } else {
            alert('Você precisa estar logado para iniciar trilhas');
        }
        return;
    }

    // Fechar todos os modais abertos (incluindo modal de sucesso)
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.remove();
    });
    
    // Garantir que o modal de criação e sua animação estejam completamente fechados
    const createModal = document.getElementById('createTrilhaModal');
    if (createModal) {
        createModal.style.display = 'none';
    }
    
    const createProgress = document.getElementById('trilhaCreationProgress');
    if (createProgress) {
        createProgress.style.display = 'none';
        // Resetar animação
        const steps = createProgress.querySelectorAll('.progress-steps .step');
        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index === 0) {
                step.classList.add('active');
            }
        });
    }

    try {
        const progressResponse = await fetch(`/api/v1/trilhas/${trilhaId}/progress/${currentUser.id}`);
        const progressResult = await progressResponse.json();
        
        let isCompleted = false;
        if (progressResult.success && progressResult.data) {
            const overallProgress = progressResult.data.overall_progress || 0;
            const completedContent = progressResult.data.completed_content || 0;
            const totalContent = progressResult.data.total_content || 0;
            isCompleted = overallProgress >= 100 || (completedContent === totalContent && totalContent > 0);
        }
        
        if (isCompleted) {
            showTrilhaFinalResults(trilhaId);
            return;
        }
        
        const response = await fetch(`/api/v1/trilhas-personalizadas/trilha/${trilhaId}/details`);
        const result = await response.json();

        if (result.success && result.data) {
            const trilha = result.data;
            showTrilhaStartModal(trilha);
        } else {
            throw new Error('Trilha não encontrada');
        }
    } catch (error) {
        console.error('Error starting trilha:', error);
        if (window.elearning?.showNotification) {
            window.elearning.showNotification('Erro ao iniciar trilha: ' + error.message, 'error');
        } else {
            alert('Erro ao iniciar trilha: ' + error.message);
        }
    }
}

// Start quiz session for a module
async function startQuizSession(moduleId) {
    const currentUser = window.elearning?.getCurrentUser();
    if (!currentUser) return;

    try {
        const response = await fetch('/api/v1/trilhas-personalizadas/quiz/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                module_id: moduleId
            })
        });

        const result = await response.json();

        if (result.success) {
            trilhaPersonalizadaState.currentQuizSession = result.data;
            console.log('Quiz session started:', result.data);
            // Não fazer mais nada aqui - o novo fluxo é tratado em startModuleQuiz
        } else {
            throw new Error(result.detail || 'Failed to start quiz session');
        }
    } catch (error) {
        console.error('Error starting quiz session:', error);
        window.elearning?.showNotification('Erro ao iniciar quiz: ' + error.message, 'error');
    }
}

// Show quiz modal (função antiga removida - usando a versão dinâmica)
// Esta função foi substituída pela showQuizModal(trilhaId, module, questions)

// Load current question (função antiga - comentada para evitar conflitos)
/*
async function loadCurrentQuestion() {
    const session = trilhaPersonalizadaState.currentQuizSession;
    if (!session) return;
    
    const currentUser = window.elearning?.getCurrentUser();
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/v1/trilhas-personalizadas/quiz/session/${session.id}/question?user_id=${currentUser.id}`);
        const result = await response.json();
        
        if (result.success) {
            trilhaPersonalizadaState.currentQuestion = result.data.question;
            displayQuestion(result.data.question, result.data.session_info);
        } else {
            throw new Error(result.detail || 'Failed to load question');
        }
    } catch (error) {
        console.error('Error loading question:', error);
        window.elearning?.showNotification('Erro ao carregar questão: ' + error.message, 'error');
    }
}
*/

// Display question in quiz modal (função antiga - comentada)
/*
function displayQuestion(question, sessionInfo) {
    // Update question text
    const questionText = document.getElementById('questionText');
    if (questionText) {
        questionText.textContent = question.pergunta;
    }
    
    // Update progress
    const quizProgress = document.getElementById('quizProgress');
    const quizProgressBar = document.getElementById('quizProgressBar');
    
    if (quizProgress) {
        quizProgress.textContent = `Questão ${question.ordem} de ${question.total}`;
    }
    
    if (quizProgressBar) {
        const progressPercent = (question.ordem / question.total) * 100;
        quizProgressBar.style.width = `${progressPercent}%`;
    }
    
    // Display options
    const quizOptions = document.getElementById('quizOptions');
    if (quizOptions && question.alternativas) {
        quizOptions.innerHTML = Object.entries(question.alternativas).map(([key, value]) => `
            <div class="quiz-option">
                <input type="radio" id="option_${key}" name="quiz_answer" value="${key}">
                <label for="option_${key}">
                    <span class="option-letter">${key.toUpperCase()}</span>
                    <span class="option-text">${value}</span>
                </label>
            </div>
        `).join('');
        
        // Add event listeners to options
        const options = quizOptions.querySelectorAll('input[name="quiz_answer"]');
        options.forEach(option => {
            option.addEventListener('change', handleAnswerSelection);
        });
    }
    
    // Update navigation buttons
    updateQuizNavigation(question.ordem, question.total);
}
*/

// Handle answer selection
function handleAnswerSelection(event) {
    const selectedAnswer = event.target.value;
    const questionId = trilhaPersonalizadaState.currentQuestion?.id;

    if (questionId) {
        trilhaPersonalizadaState.selectedAnswers[questionId] = selectedAnswer;
    }

    // Enable next button
    const nextBtn = document.getElementById('quizNextBtn');
    if (nextBtn) {
        nextBtn.disabled = false;
    }
}

// Update quiz navigation buttons
function updateQuizNavigation(currentQuestion, totalQuestions) {
    const prevBtn = document.getElementById('quizPrevBtn');
    const nextBtn = document.getElementById('quizNextBtn');

    if (prevBtn) {
        prevBtn.disabled = currentQuestion <= 1;
    }

    if (nextBtn) {
        nextBtn.disabled = true; // Will be enabled when answer is selected
        nextBtn.textContent = currentQuestion >= totalQuestions ? 'Finalizar' : 'Próxima';
    }
}

// Handle quiz next button
async function handleQuizNext() {
    const selectedAnswer = document.querySelector('input[name="quiz_answer"]:checked')?.value;
    const questionId = trilhaPersonalizadaState.currentQuestion?.id;
    const sessionId = trilhaPersonalizadaState.currentQuizSession?.id;

    if (!selectedAnswer || !questionId || !sessionId) {
        window.elearning?.showNotification('Selecione uma resposta', 'warning');
        return;
    }

    const currentUser = window.elearning?.getCurrentUser();
    if (!currentUser) return;

    try {
        const response = await fetch(`/api/v1/trilhas-personalizadas/quiz/session/${sessionId}/answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                question_id: questionId,
                selected_answer: selectedAnswer
            })
        });

        const result = await response.json();

        if (result.success) {
            // Show answer feedback briefly
            showAnswerFeedback(result.data.answer_result);

            // Check if quiz is completed
            if (result.data.session_info.is_completed) {
                setTimeout(() => {
                    showQuizResults(result.data.final_results);
                }, 2000);
            } else {
                // Load next question
                setTimeout(() => {
                    loadCurrentQuestion();
                }, 2000);
            }
        } else {
            throw new Error(result.detail || 'Failed to submit answer');
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        window.elearning?.showNotification('Erro ao enviar resposta: ' + error.message, 'error');
    }
}

// Show answer feedback
function showAnswerFeedback(answerResult) {
    const isCorrect = answerResult.is_correct;
    const explanation = answerResult.explanation;

    // Create feedback element
    const feedback = document.createElement('div');
    feedback.className = `answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = `
        <div class="feedback-header">
            <i class="fas fa-${isCorrect ? 'check-circle' : 'times-circle'}"></i>
            <span>${isCorrect ? 'Correto!' : 'Incorreto'}</span>
        </div>
        <div class="feedback-body">
            <p><strong>Resposta correta:</strong> ${answerResult.correct_answer.toUpperCase()}</p>
            ${explanation ? `<p><strong>Explicação:</strong> ${explanation}</p>` : ''}
        </div>
    `;

    // Insert feedback after question
    const questionDiv = document.getElementById('quizQuestion');
    if (questionDiv) {
        questionDiv.appendChild(feedback);

        // Remove feedback after delay
        setTimeout(() => {
            feedback.remove();
        }, 2000);
    }
}

// Show quiz results
function showQuizResults(results) {
    const quizContainer = document.querySelector('.quiz-container');
    const quizResults = document.getElementById('quizResults');

    if (quizContainer) quizContainer.style.display = 'none';
    if (quizResults) quizResults.style.display = 'block';

    // Stop timer
    stopQuizTimer();

    // Update results display
    document.getElementById('finalScore').textContent = `${results.score_percentage}%`;
    document.getElementById('correctAnswers').textContent = results.correct_answers;
    document.getElementById('wrongAnswers').textContent = results.wrong_answers;
    document.getElementById('totalTime').textContent = `${results.time_taken_minutes}:${results.time_taken_seconds.toString().padStart(2, '0')}`;
    document.getElementById('performanceLevel').textContent = results.performance_level;

    // Update score circle color
    const scoreCircle = document.querySelector('.score-circle');
    if (scoreCircle) {
        if (results.score_percentage >= 80) {
            scoreCircle.className = 'score-circle excellent';
        } else if (results.score_percentage >= 60) {
            scoreCircle.className = 'score-circle good';
        } else {
            scoreCircle.className = 'score-circle needs-improvement';
        }
    }
}

// Start quiz timer
function startQuizTimer() {
    const session = trilhaPersonalizadaState.currentQuizSession;
    if (!session) return;

    trilhaPersonalizadaState.timeRemaining = session.time_limit || 1800; // 30 minutes default

    trilhaPersonalizadaState.quizTimer = setInterval(() => {
        trilhaPersonalizadaState.timeRemaining--;

        const minutes = Math.floor(trilhaPersonalizadaState.timeRemaining / 60);
        const seconds = trilhaPersonalizadaState.timeRemaining % 60;

        const timerElement = document.getElementById('quizTimer');
        if (timerElement) {
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Warning when 5 minutes left
        if (trilhaPersonalizadaState.timeRemaining === 300) {
            window.elearning?.showNotification('Restam apenas 5 minutos!', 'warning');
        }

        // Time up
        if (trilhaPersonalizadaState.timeRemaining <= 0) {
            stopQuizTimer();
            window.elearning?.showNotification('Tempo esgotado!', 'error');
            finishQuiz();
        }
    }, 1000);
}

// Stop quiz timer
function stopQuizTimer() {
    if (trilhaPersonalizadaState.quizTimer) {
        clearInterval(trilhaPersonalizadaState.quizTimer);
        trilhaPersonalizadaState.quizTimer = null;
    }
}

// Handle quiz previous button (placeholder)
function handleQuizPrevious() {
    // For now, just show message that previous is not supported
    window.elearning?.showNotification('Navegação para questão anterior não disponível', 'info');
}

// Finish quiz and return to dashboard
function finishQuiz() {
    const modal = document.getElementById('quizModal');
    if (modal) modal.style.display = 'none';

    // Reset state
    trilhaPersonalizadaState.currentQuizSession = null;
    trilhaPersonalizadaState.currentQuestion = null;
    trilhaPersonalizadaState.selectedAnswers = {};

    // Stop timer
    stopQuizTimer();

    // Show dashboard
    window.elearning?.showSection('dashboard');

    // Refresh dashboard data
    if (window.dashboard?.loadData) {
        window.dashboard.loadData();
    }

    window.elearning?.showNotification('Quiz finalizado! Confira seu progresso no dashboard.', 'success');
}

// Review quiz answers (placeholder)
function reviewQuizAnswers() {
    window.elearning?.showNotification('Funcionalidade de revisão em desenvolvimento', 'info');
}

// View trilha details
async function viewTrilhaDetails(trilhaId) {
    console.log('Viewing trilha details:', trilhaId);

    try {
        // Buscar detalhes da trilha
        const response = await fetch(`/api/v1/trilhas-personalizadas/trilha/${trilhaId}/details`);
        const result = await response.json();

        if (result.success && result.data) {
            const trilha = result.data;
            showTrilhaDetailsModal(trilha);
        } else {
            throw new Error('Trilha não encontrada');
        }
    } catch (error) {
        console.error('Error loading trilha details:', error);
        if (window.elearning?.showNotification) {
            window.elearning.showNotification('Erro ao carregar detalhes: ' + error.message, 'error');
        } else {
            alert('Erro ao carregar detalhes: ' + error.message);
        }
    }
}

// Show trilha details modal
function showTrilhaDetailsModal(trilha) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay trilha-modal-overlay';
    modal.innerHTML = `
        <div class="modal-content trilha-modal">
            <div class="modal-header">
                <h3>Detalhes da Trilha</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="trilha-details">
                    <div class="trilha-header-details">
                        <h4>${trilha.titulo}</h4>
                        <span class="difficulty-badge difficulty-${trilha.dificuldade}">
                            ${getDifficultyLabel(trilha.dificuldade)}
                        </span>
                    </div>
                    
                    <p class="trilha-description">${trilha.descricao}</p>
                    
                    <div class="trilha-stats-detailed">
                        <div class="stat-card">
                            <i class="fas fa-book"></i>
                            <div>
                                <span class="stat-number">${trilha.modules?.length || 0}</span>
                                <span class="stat-label">Módulos</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-clock"></i>
                            <div>
                                <span class="stat-number">${trilha.estimated_duration || 0}</span>
                                <span class="stat-label">Minutos</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-question-circle"></i>
                            <div>
                                <span class="stat-number">${trilha.total_questions || 0}</span>
                                <span class="stat-label">Questões</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-users"></i>
                            <div>
                                <span class="stat-number">${trilha.enrollment?.enrollment_count || 0}</span>
                                <span class="stat-label">Inscritos</span>
                            </div>
                        </div>
                    </div>
                    
                    ${trilha.modules && trilha.modules.length > 0 ? `
                        <div class="modules-detailed">
                            <h5>Conteúdo da Trilha:</h5>
                            <div class="modules-list">
                                ${trilha.modules.map((module, index) => `
                                    <div class="module-item">
                                        <div class="module-header">
                                            <span class="module-number">${index + 1}</span>
                                            <div class="module-info">
                                                <h6>${module.titulo}</h6>
                                                <p>${module.descricao}</p>
                                            </div>
                                        </div>
                                        <div class="module-stats">
                                            <span><i class="fas fa-question-circle"></i> ${module.questions_count || 10} questões</span>
                                            <span><i class="fas fa-clock"></i> ~${Math.ceil((module.questions_count || 10) * 1.5)} min</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                    Fechar
                </button>
                <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); startTrilha(${trilha.id})">
                    <i class="fas fa-play"></i>
                    Iniciar Trilha
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Show trilha start modal
async function showTrilhaStartModal(trilha) {
    const currentUser = window.elearning?.getCurrentUser();
    if (!currentUser) return;

    let userProgress = {};
    let nextModule = null;
    let completedModules = 0;
    
    try {
        const progressResponse = await fetch(`/api/v1/trilhas/${trilha.id}/progress/${currentUser.id}`);
        const progressResult = await progressResponse.json();
        
        if (progressResult.success && progressResult.data) {
            userProgress = progressResult.data;
            
            if (trilha.modules && trilha.modules.length > 0) {
                for (const module of trilha.modules) {
                    const moduleProgress = userProgress.content_progress?.find(p => p.conteudo_id === module.id);
                    if (!moduleProgress || moduleProgress.progresso < 100) {
                        if (!nextModule) {
                            nextModule = module;
                        }
                    } else {
                        completedModules++;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Erro ao buscar progresso:', error);
    }

    const totalModules = trilha.modules?.length || 0;
    const overallProgress = userProgress.overall_progress || 0;
    const allModulesCompleted = completedModules === totalModules && totalModules > 0;
    const isCompleted = overallProgress >= 100 || allModulesCompleted;
    
    if (isCompleted) {
        nextModule = null;
    } else if (!nextModule && trilha.modules && trilha.modules.length > 0) {
        nextModule = trilha.modules[0];
    }
    const buttonText = isCompleted ? 'Ver Resultados' : (completedModules > 0 ? 'Continuar' : 'Começar Agora');
    const buttonIcon = isCompleted ? 'fa-chart-line' : (completedModules > 0 ? 'fa-play' : 'fa-play');
    const buttonAction = isCompleted ? `showTrilhaFinalResults(${trilha.id})` : `startModuleFromModal(this, ${trilha.id}, ${nextModule ? JSON.stringify(nextModule).replace(/"/g, '&quot;') : 'null'})`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay trilha-modal-overlay';
    modal.innerHTML = `
        <div class="modal-content trilha-modal">
            <div class="modal-header">
                <h3>${isCompleted ? 'Trilha Completa' : 'Iniciar Trilha'}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="trilha-start-info">
                    <h4>${trilha.titulo}</h4>
                    <p class="trilha-description">${trilha.descricao}</p>
                    <div class="trilha-overview">
                        <div class="overview-item">
                            <i class="fas fa-book"></i>
                            <span>${trilha.modules?.length || 0} módulos</span>
                        </div>
                        <div class="overview-item">
                            <i class="fas fa-clock"></i>
                            <span>${trilha.estimated_duration || 0} minutos</span>
                        </div>
                        <div class="overview-item">
                            <i class="fas fa-question-circle"></i>
                            <span>${trilha.total_questions || 0} questões</span>
                        </div>
                    </div>
                    
                    ${trilha.modules && trilha.modules.length > 0 ? `
                        <div class="modules-preview">
                            <h5>Módulos da Trilha:</h5>
                            <ul>
                                ${trilha.modules.map((module, index) => {
                                    const moduleProgress = userProgress.content_progress?.find(p => p.conteudo_id === module.id);
                                    const isModuleCompleted = moduleProgress && moduleProgress.progresso >= 100;
                                    const isNext = nextModule && nextModule.id === module.id;
                                    const moduleProgressPercent = isModuleCompleted ? 100 : (moduleProgress?.progresso || 0);
                                    
                                    return `
                                        <li class="${isModuleCompleted ? 'completed' : ''} ${isNext ? 'next' : ''}">
                                            ${isModuleCompleted ? '<i class="fas fa-check-circle"></i>' : ''}
                                            ${isNext ? '<i class="fas fa-arrow-right"></i>' : ''}
                                            <strong>Módulo ${index + 1}:</strong> ${module.titulo}
                                            <small>(${module.questions_count || 10} questões)</small>
                                            ${isModuleCompleted ? `<span class="module-status">✓ Completado (${moduleProgress.nota || 0}%)</span>` : (moduleProgressPercent > 0 ? `<span class="module-status">${moduleProgressPercent}%</span>` : '')}
                                            ${isNext ? '<span class="module-status next-module">→ Próximo</span>' : ''}
                                        </li>
                                    `;
                                }).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                    Cancelar
                </button>
                <button class="btn btn-primary" onclick="${buttonAction}; this.closest('.modal-overlay').remove();">
                    <i class="fas ${buttonIcon}"></i>
                    ${buttonText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

window.showTrilhaFinalResults = async function showTrilhaFinalResults(trilhaId) {
    const currentUser = window.elearning?.getCurrentUser();
    if (!currentUser) return;

    try {
        const trilhaResponse = await fetch(`/api/v1/trilhas-personalizadas/trilha/${trilhaId}/details`);
        const trilhaResult = await trilhaResponse.json();
        
        if (!trilhaResult.success || !trilhaResult.data) {
            throw new Error('Erro ao carregar detalhes da trilha');
        }

        const trilha = trilhaResult.data;
        const progressResponse = await fetch(`/api/v1/trilhas/${trilhaId}/progress/${currentUser.id}`);
        const progressResult = await progressResponse.json();
        
        if (!progressResult.success || !progressResult.data) {
            throw new Error('Erro ao carregar progresso');
        }

        const userProgress = progressResult.data;
        const completedModules = trilha.modules?.filter(module => {
            const moduleProgress = userProgress.content_progress?.find(p => p.conteudo_id === module.id);
            return moduleProgress && moduleProgress.progresso >= 100;
        }) || [];

        const totalQuestions = completedModules.reduce((sum, m) => sum + (m.questions_count || 10), 0);
        const totalCorrect = completedModules.reduce((sum, m) => {
            const progress = userProgress.content_progress?.find(p => p.conteudo_id === m.id);
            const nota = progress?.nota || 0;
            const questions = m.questions_count || 10;
            return sum + Math.round((nota / 100) * questions);
        }, 0);
        const averageScore = completedModules.length > 0 
            ? Math.round(completedModules.reduce((sum, m) => {
                const progress = userProgress.content_progress?.find(p => p.conteudo_id === m.id);
                return sum + (progress?.nota || 0);
            }, 0) / completedModules.length)
            : 0;
        const totalStudyTime = userProgress.total_study_time_minutes || 0;

        // Buscar questões com respostas de todos os módulos
        const allQuestionsWithAnswers = [];
        for (const module of completedModules) {
            try {
                const questionsResponse = await fetch(`/api/v1/trilhas-personalizadas/module/${module.id}/questions-with-answers/${currentUser.id}`);
                const questionsResult = await questionsResponse.json();
                
                if (questionsResult.success && questionsResult.data && questionsResult.data.questions) {
                    const moduleQuestions = questionsResult.data.questions.map(q => ({
                        ...q,
                        moduleTitle: module.titulo,
                        moduleIndex: completedModules.indexOf(module) + 1
                    }));
                    allQuestionsWithAnswers.push(...moduleQuestions);
                }
            } catch (error) {
                console.error(`Erro ao buscar questões do módulo ${module.id}:`, error);
            }
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay trilha-results-overlay';
        modal.innerHTML = `
            <div class="modal-content trilha-results-modal" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem;">
                    <h2 style="margin: 0; font-size: 1.8rem;">🎉 Trilha Concluída!</h2>
                    <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">${trilha.titulo}</p>
                </div>
                <div class="modal-body" style="padding: 2rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                        <div style="text-align: center; padding: 1.5rem; background: #f8f9fa; border-radius: 12px;">
                            <div style="font-size: 2.5rem; font-weight: bold; color: #667eea; margin-bottom: 0.5rem;">${averageScore}%</div>
                            <div style="color: #666; font-size: 0.9rem;">Nota Média</div>
                        </div>
                        <div style="text-align: center; padding: 1.5rem; background: #f8f9fa; border-radius: 12px;">
                            <div style="font-size: 2.5rem; font-weight: bold; color: #28a745; margin-bottom: 0.5rem;">${totalCorrect}/${totalQuestions}</div>
                            <div style="color: #666; font-size: 0.9rem;">Acertos</div>
                        </div>
                        <div style="text-align: center; padding: 1.5rem; background: #f8f9fa; border-radius: 12px;">
                            <div style="font-size: 2.5rem; font-weight: bold; color: #17a2b8; margin-bottom: 0.5rem;">${completedModules.length}</div>
                            <div style="color: #666; font-size: 0.9rem;">Módulos</div>
                        </div>
                        <div style="text-align: center; padding: 1.5rem; background: #f8f9fa; border-radius: 12px;">
                            <div style="font-size: 2.5rem; font-weight: bold; color: #ffc107; margin-bottom: 0.5rem;">${Math.floor(totalStudyTime / 60)}h ${totalStudyTime % 60}m</div>
                            <div style="color: #666; font-size: 0.9rem;">Tempo</div>
                        </div>
                    </div>

                    <h3 style="margin-bottom: 1.5rem; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 0.5rem;">Resultados por Módulo</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
                        ${completedModules.map((module, index) => {
                            const moduleProgress = userProgress.content_progress?.find(p => p.conteudo_id === module.id);
                            const nota = moduleProgress?.nota || 0;
                            const questions = module.questions_count || 10;
                            const correct = Math.round((nota / 100) * questions);
                            const wrong = questions - correct;
                            
                            return `
                                <div style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; background: white;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                        <div>
                                            <h4 style="margin: 0; color: #333; font-size: 1.1rem;">Módulo ${index + 1}: ${module.titulo}</h4>
                                            <p style="margin: 0.5rem 0 0 0; color: #666; font-size: 0.9rem;">${questions} questões</p>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-size: 2rem; font-weight: bold; color: ${nota >= 70 ? '#28a745' : nota >= 50 ? '#ffc107' : '#dc3545'};">
                                                ${nota}%
                                            </div>
                                        </div>
                                    </div>
                                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                        <div style="flex: 1; padding: 0.75rem; background: #d4edda; border-radius: 8px; text-align: center;">
                                            <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${correct}</div>
                                            <div style="font-size: 0.85rem; color: #666;">Corretas</div>
                                        </div>
                                        <div style="flex: 1; padding: 0.75rem; background: #f8d7da; border-radius: 8px; text-align: center;">
                                            <div style="font-size: 1.5rem; font-weight: bold; color: #dc3545;">${wrong}</div>
                                            <div style="font-size: 0.85rem; color: #666;">Incorretas</div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    ${allQuestionsWithAnswers.length > 0 ? `
                        <div class="quiz-review" style="margin-top: 2rem;">
                            <h4 style="margin-bottom: 1.5rem; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 0.5rem;">Revisão de Todas as Questões:</h4>
                            <div class="questions-review" style="display: flex; flex-direction: column; gap: 1.5rem;">
                                ${allQuestionsWithAnswers.map((result, index) => {
                                    const isCorrect = result.is_correct !== null ? result.is_correct : (result.user_answer === result.correct_answer);
                                    return `
                                        <div class="question-review ${isCorrect ? 'correct' : 'incorrect'}" style="border: 1px solid ${isCorrect ? '#d4edda' : '#f8d7da'}; border-radius: 12px; padding: 1.5rem; background: ${isCorrect ? '#f8fff9' : '#fff8f8'};">
                                            <div class="question-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                                <div>
                                                    <span class="question-num" style="font-weight: 600; color: #667eea;">Questão ${index + 1}</span>
                                                    ${result.moduleTitle ? `<span style="color: #666; font-size: 0.9rem; margin-left: 0.5rem;">- Módulo ${result.moduleIndex}: ${result.moduleTitle}</span>` : ''}
                                                </div>
                                                <span class="question-status" style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: ${isCorrect ? '#28a745' : '#dc3545'};">
                                                    <i class="fas ${isCorrect ? 'fa-check' : 'fa-times'}"></i>
                                                    ${isCorrect ? 'Correta' : 'Incorreta'}
                                                </span>
                                            </div>
                                            <div class="question-content">
                                                <p class="question-text" style="margin: 0 0 1rem 0; font-size: 1rem; color: #333; line-height: 1.6;">${result.question}</p>
                                                <div class="answers-comparison" style="margin-bottom: 1rem;">
                                                    <div class="user-answer" style="padding: 0.75rem; background: ${isCorrect ? '#d4edda' : '#f8d7da'}; border-radius: 8px; margin-bottom: ${!isCorrect ? '0.5rem' : '0'};">
                                                        <strong style="color: #333;">Sua resposta:</strong> 
                                                        <span class="${isCorrect ? 'correct' : 'incorrect'}" style="font-weight: 600; color: ${isCorrect ? '#28a745' : '#dc3545'}; margin-left: 0.5rem;">
                                                            ${result.user_answer ? result.user_answer.toUpperCase() : 'Não respondida'}
                                                        </span>
                                                    </div>
                                                    ${!isCorrect ? `
                                                        <div class="correct-answer" style="padding: 0.75rem; background: #d4edda; border-radius: 8px;">
                                                            <strong style="color: #333;">Resposta correta:</strong> 
                                                            <span class="correct" style="font-weight: 600; color: #28a745; margin-left: 0.5rem;">${result.correct_answer.toUpperCase()}</span>
                                                        </div>
                                                    ` : ''}
                                                </div>
                                                ${result.explanation ? `
                                                    <div class="explanation" style="padding: 1rem; background: #f0f4f8; border-radius: 8px; border-left: 4px solid #667eea;">
                                                        <strong style="color: #333; display: block; margin-bottom: 0.5rem;">Explicação:</strong>
                                                        <p style="margin: 0; color: #555; line-height: 1.6;">${result.explanation}</p>
                                                    </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer" style="padding: 1.5rem; border-top: 1px solid #e0e0e0; display: flex; justify-content: flex-end; gap: 1rem;">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                        Fechar
                    </button>
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); goToDashboard()">
                        <i class="fas fa-home"></i>
                        Ir para Dashboard
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Erro ao carregar resultados:', error);
        if (window.elearning?.showNotification) {
            window.elearning.showNotification('Erro ao carregar resultados: ' + error.message, 'error');
        }
    }
}

async function startModuleFromModal(button, trilhaId, nextModuleData) {
    const originalHTML = button.innerHTML;
    button.innerHTML = '<div class="btn-spinner"></div> Carregando...';
    button.disabled = true;

    try {
        const modal = button.closest('.modal-overlay');
        
        if (!nextModuleData) {
            const response = await fetch(`/api/v1/trilhas-personalizadas/trilha/${trilhaId}/details`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.modules && result.data.modules.length > 0) {
                nextModuleData = result.data.modules[0];
            } else {
                throw new Error('Nenhum módulo encontrado');
            }
        }

        let module = nextModuleData;
        if (typeof nextModuleData === 'string') {
            module = JSON.parse(nextModuleData.replace(/&quot;/g, '"'));
        }

        button.innerHTML = '<div class="btn-spinner"></div> Preparando Quiz...';
        
        await startModuleQuizWithModalControl(trilhaId, module);
    } catch (error) {
        console.error('Erro ao iniciar módulo:', error);
        button.innerHTML = originalHTML;
        button.disabled = false;
        showStartModuleError(error.message);
    }
}

// Start first module with loading in modal
async function startFirstModuleWithLoadingInModal(button, trilhaId) {
    // Salvar texto original do botão
    const originalHTML = button.innerHTML;

    // Mostrar loading no botão (spinner como na imagem)
    button.innerHTML = '<div class="btn-spinner"></div> Carregando...';
    button.disabled = true;

    // Também desabilitar o botão cancelar para evitar fechar durante loading
    const cancelButton = button.parentElement.querySelector('.btn-outline');
    const originalCancelHTML = cancelButton ? cancelButton.innerHTML : '';
    if (cancelButton) {
        cancelButton.disabled = true;
        cancelButton.style.opacity = '0.5';
    }

    try {
        console.log('Starting first module of trilha:', trilhaId);

        // Buscar detalhes da trilha para pegar o primeiro módulo
        const response = await fetch(`/api/v1/trilhas-personalizadas/trilha/${trilhaId}/details`);
        const result = await response.json();

        if (result.success && result.data && result.data.modules && result.data.modules.length > 0) {
            const firstModule = result.data.modules[0];

            // Atualizar botão para mostrar progresso
            button.innerHTML = '<div class="btn-spinner"></div> Preparando Quiz...';

            // Iniciar quiz do primeiro módulo
            await startModuleQuizWithModalControl(trilhaId, firstModule);
        } else {
            throw new Error('Nenhum módulo encontrado na trilha');
        }
    } catch (error) {
        console.error('Error starting first module:', error);

        // Restaurar botões
        button.innerHTML = originalHTML;
        button.disabled = false;

        if (cancelButton) {
            cancelButton.disabled = false;
            cancelButton.style.opacity = '1';
        }

        // Mostrar erro estilizado
        showStartModuleError(error.message);
    }
}

// Start first module with loading button
async function startFirstModuleWithLoading(button, trilhaId) {
    // Salvar texto original do botão
    const originalHTML = button.innerHTML;

    // Mostrar loading no botão
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
    button.disabled = true;

    try {
        // Fechar modal
        document.querySelector('.modal-overlay')?.remove();

        console.log('Starting first module of trilha:', trilhaId);

        // Buscar detalhes da trilha para pegar o primeiro módulo
        const response = await fetch(`/api/v1/trilhas-personalizadas/trilha/${trilhaId}/details`);
        const result = await response.json();

        if (result.success && result.data && result.data.modules && result.data.modules.length > 0) {
            const firstModule = result.data.modules[0];

            // Iniciar quiz do primeiro módulo diretamente
            await startModuleQuiz(trilhaId, firstModule);
        } else {
            throw new Error('Nenhum módulo encontrado na trilha');
        }
    } catch (error) {
        console.error('Error starting first module:', error);

        // Restaurar botão
        button.innerHTML = originalHTML;
        button.disabled = false;

        // Mostrar erro estilizado
        showStartModuleError(error.message);
    }
}

// Start first module (função original mantida para compatibilidade)
async function startFirstModule(trilhaId) {
    // Fechar modal
    document.querySelector('.modal-overlay')?.remove();

    console.log('Starting first module of trilha:', trilhaId);

    try {
        // Buscar detalhes da trilha para pegar o primeiro módulo
        const response = await fetch(`/api/v1/trilhas-personalizadas/trilha/${trilhaId}/details`);
        const result = await response.json();

        if (result.success && result.data && result.data.modules && result.data.modules.length > 0) {
            const firstModule = result.data.modules[0];

            // Iniciar quiz do primeiro módulo
            await startModuleQuiz(trilhaId, firstModule);
        } else {
            throw new Error('Nenhum módulo encontrado na trilha');
        }
    } catch (error) {
        console.error('Error starting first module:', error);
        showStartModuleError(error.message);
    }
}

// Start module quiz with modal control
async function startModuleQuizWithModalControl(trilhaId, module) {
    console.log('Starting quiz for module with modal control:', module);

    // Fechar modal anterior imediatamente
    document.querySelector('.modal-overlay')?.remove();

    // Mostrar modal de carregamento com animação
    const loadingModal = showQuizLoadingModal(module);

    try {
        // Primeiro, tentar buscar questões salvas do banco de dados
        let questions = null;
        let fromDatabase = false;
        
        if (module.id) {
            try {
                const savedQuestionsResponse = await fetch(`/api/v1/trilhas-personalizadas/module/${module.id}/questions`);
                const savedQuestionsResult = await savedQuestionsResponse.json();
                
                if (savedQuestionsResult.success && savedQuestionsResult.data && savedQuestionsResult.data.questions && savedQuestionsResult.data.questions.length > 0) {
                    questions = savedQuestionsResult.data.questions;
                    fromDatabase = savedQuestionsResult.data.from_database || false;
                    console.log(`Carregadas ${questions.length} questões do banco de dados para módulo ${module.id}`);
                }
            } catch (error) {
                console.warn('Erro ao buscar questões salvas, tentando gerar:', error);
            }
        }
        
        // Se não encontrou questões salvas, usar endpoint de geração (que também busca questões salvas primeiro)
        if (!questions || questions.length === 0) {
            console.log(`Gerando questões para módulo ${module.id}...`);
            const questionsResponse = await fetch('/api/v1/trilhas-personalizadas/quiz/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    trilha_id: trilhaId,
                    module_id: module.id,
                    topic: module.titulo,
                    difficulty: 'iniciante',
                    count: module.questions_count || 10
                })
            });

            const questionsResult = await questionsResponse.json();

            if (questionsResult.success && questionsResult.data && questionsResult.data.questions) {
                questions = questionsResult.data.questions;
                fromDatabase = questionsResult.data.from_database || false;
                
                if (fromDatabase) {
                    console.log(`✓ Questões carregadas do banco via endpoint de geração (${questions.length} questões)`);
                } else {
                    console.log(`✓ Questões geradas pela IA e salvas no banco (${questions.length} questões)`);
                    // Aguardar um pouco para garantir que foram salvas antes de continuar
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } else {
                throw new Error('Erro ao carregar questões');
            }
        }

        // Fechar modal de loading
        loadingModal.remove();
        
        // Mostrar quiz com questões
        if (questions && questions.length > 0) {
            showQuizModal(trilhaId, module, questions);
        } else {
            throw new Error('Nenhuma questão disponível');
        }
    } catch (error) {
        console.error('Error loading questions:', error);
        
        // Fechar modal de loading
        loadingModal.remove();
        
        // Mostrar erro ou usar questões mock como fallback
        if (window.elearning?.showNotification) {
            window.elearning.showNotification('Erro ao carregar questões. Usando questões de exemplo.', 'warning');
        }
        
        // Fallback: usar questões mock
        const mockQuestions = generateMockQuestions(module.titulo, module.questions_count || 10);
        showQuizModal(trilhaId, module, mockQuestions);
    }
}

// Start module quiz
async function startModuleQuiz(trilhaId, module) {
    console.log('Starting quiz for module:', module);

    // Fechar modal anterior se existir
    document.querySelector('.modal-overlay')?.remove();

    // Mostrar modal de carregamento com animação
    const loadingModal = showQuizLoadingModal(module);

    try {
        // Primeiro, tentar buscar questões salvas do banco de dados
        let questions = null;
        
        if (module.id) {
            try {
                const savedQuestionsResponse = await fetch(`/api/v1/trilhas-personalizadas/module/${module.id}/questions`);
                const savedQuestionsResult = await savedQuestionsResponse.json();
                
                if (savedQuestionsResult.success && savedQuestionsResult.data && savedQuestionsResult.data.questions && savedQuestionsResult.data.questions.length > 0) {
                    questions = savedQuestionsResult.data.questions;
                    console.log(`Carregadas ${questions.length} questões do banco de dados para módulo ${module.id}`);
                }
            } catch (error) {
                console.warn('Erro ao buscar questões salvas:', error);
            }
        }
        
        // Se não encontrou questões salvas, usar endpoint de geração (que também busca questões salvas primeiro)
        if (!questions || questions.length === 0) {
            const questionsResponse = await fetch('/api/v1/trilhas-personalizadas/quiz/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    trilha_id: trilhaId,
                    module_id: module.id,
                    topic: module.titulo,
                    difficulty: 'iniciante', // TODO: pegar da trilha
                    count: module.questions_count || 10
                })
            });

            const questionsResult = await questionsResponse.json();

            if (questionsResult.success && questionsResult.data && questionsResult.data.questions) {
                questions = questionsResult.data.questions;
                const fromDatabase = questionsResult.data.from_database || false;
                
                if (fromDatabase) {
                    console.log(`Questões carregadas do banco via endpoint de geração`);
                } else {
                    console.log(`Questões geradas pela IA (não foram encontradas no banco)`);
                }
            }
        }

        // Fechar modal de loading
        loadingModal.remove();

        if (questions && questions.length > 0) {
            // Iniciar quiz com as questões
            showQuizModal(trilhaId, module, questions);
        } else {
            // Fallback: usar questões mock
            if (window.elearning?.showNotification) {
                window.elearning.showNotification('Usando questões de exemplo.', 'info');
            }
            const mockQuestions = generateMockQuestions(module.titulo, module.questions_count || 10);
            showQuizModal(trilhaId, module, mockQuestions);
        }
    } catch (error) {
        console.error('Error loading questions:', error);
        
        // Fechar modal de loading
        loadingModal.remove();
        
        // Fallback: usar questões mock
        if (window.elearning?.showNotification) {
            window.elearning.showNotification('Erro ao carregar questões. Usando questões de exemplo.', 'warning');
        }
        const mockQuestions = generateMockQuestions(module.titulo, module.questions_count || 10);
        showQuizModal(trilhaId, module, mockQuestions);
    }
}

// Generate mock questions as fallback
function generateMockQuestions(topic, count) {
    const questions = [];

    for (let i = 1; i <= count; i++) {
        questions.push({
            id: i,
            question: `Questão ${i} sobre ${topic}: Qual é o conceito fundamental relacionado a este tópico?`,
            alternatives: [
                { letter: 'a', text: 'Primeira alternativa correta' },
                { letter: 'b', text: 'Segunda alternativa incorreta' },
                { letter: 'c', text: 'Terceira alternativa incorreta' },
                { letter: 'd', text: 'Quarta alternativa incorreta' },
                { letter: 'e', text: 'Quinta alternativa incorreta' }
            ],
            correct_answer: 'a',
            explanation: `Esta é a explicação para a questão ${i}. A alternativa 'a' está correta porque representa o conceito fundamental do tópico.`
        });
    }

    return questions;
}

// Show quiz modal
function showQuizModal(trilhaId, module, questions) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay quiz-modal-overlay';
    modal.innerHTML = `
        <div class="modal-content quiz-modal">
            <div class="modal-header">
                <h3>${module.titulo}</h3>
                <div class="quiz-progress">
                    <span class="current-question">1</span> / <span class="total-questions">${questions.length}</span>
                </div>
                <button class="quiz-cancel-btn" onclick="showQuizCancelConfirmation()">
                    <i class="fas fa-times"></i>
                    Cancelar
                </button>
            </div>
            <div class="modal-body">
                <div class="quiz-container">
                    <div class="quiz-timer">
                        <i class="fas fa-clock"></i>
                        <span id="quiz-timer">00:00</span>
                    </div>
                    
                    <div class="quiz-question-container">
                        <div class="question-number">Questão <span class="current-q-num">1</span></div>
                        <div class="question-text" id="question-text">
                            ${questions[0].question}
                        </div>
                        
                        <div class="quiz-alternatives" id="quiz-alternatives">
                            ${questions[0].alternatives.map(alt => `
                                <label class="alternative-option">
                                    <input type="radio" name="quiz-answer" value="${alt.letter}">
                                    <span class="alternative-letter">${alt.letter.toUpperCase()}</span>
                                    <span class="alternative-text">${alt.text}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" id="quiz-prev-btn" disabled>
                    <i class="fas fa-chevron-left"></i>
                    Anterior
                </button>
                <button class="btn btn-primary" id="quiz-next-btn">
                    Próxima
                    <i class="fas fa-chevron-right"></i>
                </button>
                <button class="btn btn-success" id="quiz-finish-btn" style="display: none;">
                    <i class="fas fa-check"></i>
                    Finalizar Quiz
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Inicializar quiz
    initializeQuiz(trilhaId, module, questions, modal);
}

// Initialize quiz functionality
function initializeQuiz(trilhaId, module, questions, modal) {
    let currentQuestion = 0;
    let answers = {};
    let startTime = Date.now();
    let timerInterval;

    // Elementos do DOM
    const currentQuestionSpan = document.querySelector('.current-question');
    const currentQNumSpan = document.querySelector('.current-q-num');
    const questionText = document.getElementById('question-text');
    const alternativesContainer = document.getElementById('quiz-alternatives');
    const prevBtn = document.getElementById('quiz-prev-btn');
    const nextBtn = document.getElementById('quiz-next-btn');
    const finishBtn = document.getElementById('quiz-finish-btn');
    const timerElement = document.getElementById('quiz-timer');

    // Iniciar timer
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);

    // Função para atualizar a questão
    function updateQuestion() {
        const question = questions[currentQuestion];

        currentQuestionSpan.textContent = currentQuestion + 1;
        currentQNumSpan.textContent = currentQuestion + 1;
        questionText.textContent = question.question;

        alternativesContainer.innerHTML = question.alternatives.map(alt => `
            <label class="alternative-option">
                <input type="radio" name="quiz-answer" value="${alt.letter}" ${answers[currentQuestion] === alt.letter ? 'checked' : ''}>
                <span class="alternative-letter">${alt.letter.toUpperCase()}</span>
                <span class="alternative-text">${alt.text}</span>
            </label>
        `).join('');

        // Atualizar botões
        prevBtn.disabled = currentQuestion === 0;

        if (currentQuestion === questions.length - 1) {
            nextBtn.style.display = 'none';
            finishBtn.style.display = 'inline-flex';
        } else {
            nextBtn.style.display = 'inline-flex';
            finishBtn.style.display = 'none';
        }

        // Event listeners para as alternativas
        document.querySelectorAll('input[name="quiz-answer"]').forEach(input => {
            input.addEventListener('change', (e) => {
                answers[currentQuestion] = e.target.value;
            });
        });
    }

    // Event listeners dos botões
    prevBtn.addEventListener('click', () => {
        if (currentQuestion > 0) {
            currentQuestion--;
            updateQuestion();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestion < questions.length - 1) {
            currentQuestion++;
            updateQuestion();
        }
    });

    finishBtn.addEventListener('click', () => {
        finishQuiz(trilhaId, module, questions, answers, startTime, timerInterval);
    });

    // Fechar modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            if (confirm('Tem certeza que deseja sair do quiz? Seu progresso será perdido.')) {
                clearInterval(timerInterval);
                modal.remove();
            }
        }
    });

    // Inicializar primeira questão
    updateQuestion();
}

// Finish quiz and show results
async function finishQuiz(trilhaId, module, questions, answers, startTime, timerInterval) {
    clearInterval(timerInterval);

    const endTime = Date.now();
    const totalTime = Math.floor((endTime - startTime) / 1000);

    // Calcular resultados
    let correctAnswers = 0;
    const results = questions.map((question, index) => {
        const userAnswer = answers[index];
        const isCorrect = userAnswer === question.correct_answer;
        if (isCorrect) correctAnswers++;

        return {
            question: question.question,
            userAnswer,
            correctAnswer: question.correct_answer,
            isCorrect,
            explanation: question.explanation
        };
    });

    const percentage = Math.round((correctAnswers / questions.length) * 100);
    const tempoEstudoMinutos = Math.floor(totalTime / 60);

    const currentUser = window.elearning?.getCurrentUser();
    if (currentUser && module && module.id) {
        try {
            // Salvar progresso
            await saveQuizProgress(currentUser.id, module.id, percentage, tempoEstudoMinutos);
            console.log('Progresso do quiz salvo com sucesso');
            
            // Salvar respostas individuais para revisão posterior
            // Só salvar se as questões tiverem ID (questões do banco de dados)
            try {
                const answersToSave = questions
                    .map((question, index) => {
                        // Verificar se a questão tem ID (questões do banco têm ID numérico)
                        const questionId = question.id;
                        const hasValidId = questionId && typeof questionId === 'number' && questionId > 0;
                        
                        if (hasValidId && answers[index]) {
                            return {
                                question_id: questionId,
                                selected_answer: answers[index]
                            };
                        }
                        return null;
                    })
                    .filter(a => a !== null);
                
                if (answersToSave.length > 0) {
                    const saveResponse = await fetch('/api/v1/trilhas-personalizadas/quiz/save-answers', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_id: currentUser.id,
                            module_id: module.id,
                            trilha_id: trilhaId,
                            answers: answersToSave,
                            total_time_seconds: totalTime
                        })
                    });
                    
                    const saveResult = await saveResponse.json();
                    if (saveResult.success) {
                        console.log(`✓ ${answersToSave.length} respostas do quiz salvas com sucesso`);
                    } else {
                        console.warn('Erro ao salvar respostas:', saveResult);
                    }
                } else {
                    console.log('Questões não têm ID válido, respostas não serão salvas para revisão');
                }
            } catch (error) {
                console.error('Erro ao salvar respostas individuais:', error);
                // Não interromper o fluxo se falhar ao salvar respostas
            }
        } catch (error) {
            console.error('Erro ao salvar progresso do quiz:', error);
            if (window.elearning?.showNotification) {
                window.elearning.showNotification('Erro ao salvar progresso, mas você pode continuar', 'warning');
            }
        }
    }

    // Mostrar resultados
    showQuizResults(trilhaId, module, results, correctAnswers, questions.length, totalTime, percentage);
}

async function saveQuizProgress(userId, conteudoId, nota, tempoEstudo) {
    try {
        const response = await fetch('/api/v1/trilhas/progress/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                conteudo_id: conteudoId,
                progresso: 100,
                nota: nota,
                tempo_estudo: tempoEstudo
            })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.detail || 'Erro ao salvar progresso');
        }
        
        return result;
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
        throw error;
    }
}

// Show quiz results
function showQuizResults(trilhaId, module, results, correctAnswers, totalQuestions, totalTime, percentage) {
    // Remover modal do quiz
    document.querySelector('.quiz-modal-overlay')?.remove();

    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay quiz-results-overlay';
    modal.innerHTML = `
        <div class="modal-content quiz-results-modal">
            <div class="modal-header">
                <h3>Resultado do Quiz</h3>
                <div class="quiz-score ${percentage >= 70 ? 'passed' : 'failed'}">
                    ${percentage}%
                </div>
            </div>
            <div class="modal-body">
                <div class="quiz-summary">
                    <div class="summary-stats">
                        <div class="stat-item">
                            <div class="stat-icon ${percentage >= 70 ? 'success' : 'warning'}">
                                <i class="fas ${percentage >= 70 ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                            </div>
                            <div class="stat-info">
                                <span class="stat-label">${percentage >= 70 ? 'Aprovado!' : 'Precisa Melhorar'}</span>
                                <span class="stat-value">${correctAnswers}/${totalQuestions} corretas</span>
                            </div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="stat-info">
                                <span class="stat-label">Tempo Total</span>
                                <span class="stat-value">${timeString}</span>
                            </div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-icon">
                                <i class="fas fa-percentage"></i>
                            </div>
                            <div class="stat-info">
                                <span class="stat-label">Aproveitamento</span>
                                <span class="stat-value">${percentage}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="performance-message">
                        ${percentage >= 90 ?
            '<p class="excellent">🎉 Excelente! Você domina muito bem este conteúdo!</p>' :
            percentage >= 70 ?
                '<p class="good">👍 Bom trabalho! Você está no caminho certo!</p>' :
                '<p class="needs-improvement">📚 Continue estudando! A prática leva à perfeição!</p>'
        }
                    </div>
                </div>
                
                <div class="quiz-review">
                    <h4>Revisão das Questões:</h4>
                    <div class="questions-review">
                        ${results.map((result, index) => `
                            <div class="question-review ${result.isCorrect ? 'correct' : 'incorrect'}">
                                <div class="question-header">
                                    <span class="question-num">Questão ${index + 1}</span>
                                    <span class="question-status">
                                        <i class="fas ${result.isCorrect ? 'fa-check' : 'fa-times'}"></i>
                                        ${result.isCorrect ? 'Correta' : 'Incorreta'}
                                    </span>
                                </div>
                                <div class="question-content">
                                    <p class="question-text">${result.question}</p>
                                    <div class="answers-comparison">
                                        <div class="user-answer">
                                            <strong>Sua resposta:</strong> 
                                            <span class="${result.isCorrect ? 'correct' : 'incorrect'}">
                                                ${result.userAnswer ? result.userAnswer.toUpperCase() : 'Não respondida'}
                                            </span>
                                        </div>
                                        ${!result.isCorrect ? `
                                            <div class="correct-answer">
                                                <strong>Resposta correta:</strong> 
                                                <span class="correct">${result.correctAnswer.toUpperCase()}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="explanation">
                                        <strong>Explicação:</strong> ${result.explanation}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                    Fechar
                </button>
                <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); goToDashboard()">
                    <i class="fas fa-home"></i>
                    Ir para Dashboard
                </button>
                ${percentage < 70 ? `
                    <button class="btn btn-warning" onclick="this.closest('.modal-overlay').remove(); retakeQuiz(${trilhaId}, ${JSON.stringify(module).replace(/"/g, '&quot;')})">
                        <i class="fas fa-redo"></i>
                        Tentar Novamente
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Go to dashboard
function goToDashboard() {
    if (window.elearning?.showSection) {
        window.elearning.showSection('dashboard');
    }
}

// Retake quiz
function retakeQuiz(trilhaId, module) {
    startModuleQuiz(trilhaId, module);
}

// Show delete confirmation modal
function showDeleteConfirmation(trilhaId, trilhaTitle) {
    console.log('Showing delete confirmation for trilha:', trilhaId, trilhaTitle);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay delete-confirmation-overlay';
    modal.innerHTML = `
        <div class="modal-content delete-confirmation-modal">
            <div class="modal-header">
                <h3>Excluir Trilha</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="delete-warning">
                    <div class="delete-warning-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="delete-warning-content">
                        <h4>Atenção!</h4>
                        <p>Esta ação não pode ser desfeita. Todos os dados da trilha serão perdidos permanentemente.</p>
                    </div>
                </div>
                
                <div class="trilha-info-delete">
                    <h5>Trilha a ser excluída:</h5>
                    <p><strong>${trilhaTitle}</strong></p>
                </div>
                
                <p>Tem certeza que deseja excluir esta trilha? Todo o progresso e dados associados serão perdidos.</p>
            </div>
            <div class="modal-footer">
                <div class="delete-actions">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                        Cancelar
                    </button>
                    <button class="btn btn-danger" onclick="confirmDeleteTrilha(${trilhaId})">
                        <i class="fas fa-trash"></i>
                        Sim, Excluir
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Confirm trilha deletion
async function confirmDeleteTrilha(trilhaId) {
    console.log('Confirming deletion of trilha:', trilhaId);

    try {
        // Show loading state
        const deleteBtn = document.querySelector('.btn-danger');
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
            deleteBtn.disabled = true;
        }

        // Call delete API
        const response = await fetch(`/api/v1/trilhas-personalizadas/trilha/${trilhaId}/delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            // Close modal
            document.querySelector('.delete-confirmation-overlay')?.remove();

            // Close any error modals that might be open
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                if (modal.innerHTML.includes('Erro ao excluir trilha')) {
                    modal.remove();
                }
            });

            // Show success modal
            showDeleteSuccessModal();

            // Refresh trilhas list
            console.log('Refreshing trilhas list after deletion');
            showUserTrilhas();

            // Update user status
            checkUserTrilhaStatus();

        } else {
            throw new Error(result.message || 'Erro ao excluir trilha');
        }

    } catch (error) {
        console.error('Error deleting trilha:', error);

        // Reset button state
        const deleteBtn = document.querySelector('.btn-danger');
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Sim, Excluir';
            deleteBtn.disabled = false;
        }

        let errorMessage = error.message;

        // Mensagens de erro mais amigáveis
        if (error.message.includes('404')) {
            errorMessage = 'Trilha não encontrada.';
        }

        if (window.elearning?.showNotification) {
            window.elearning.showNotification('Erro ao excluir trilha: ' + errorMessage, 'error');
        } else {
            alert('Erro ao excluir trilha: ' + errorMessage);
        }
    }
}

// Show delete success modal
function showDeleteSuccessModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay delete-success-overlay';
    modal.innerHTML = `
        <div class="modal-content delete-success-modal">
            <div class="modal-header delete-success-header">
                <div class="success-icon">
                    <i class="fas fa-trash-alt"></i>
                </div>
                <h3>Trilha Excluída com Sucesso!</h3>
            </div>
            <div class="modal-body">
                <div class="success-message">
                    <p>A trilha foi removida permanentemente do sistema.</p>
                    <div class="success-details">
                        <div class="detail-item">
                            <i class="fas fa-check-circle"></i>
                            <span>Dados removidos</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-sync-alt"></i>
                            <span>Lista atualizada</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer delete-success-footer">
                <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-check"></i>
                    Entendido
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Auto close after 3 seconds
    setTimeout(() => {
        if (modal && modal.parentNode) {
            modal.remove();
        }
    }, 3000);
}

// Show loading overlay in modal
function showLoadingInModal() {
    const modal = document.querySelector('.trilha-modal-overlay');
    if (!modal) return;

    // Criar overlay de loading
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'modal-loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner-large"></div>
            <p>Preparando seu quiz...</p>
            <div class="loading-steps">
                <div class="loading-step active">📚 Carregando módulo</div>
                <div class="loading-step">❓ Gerando questões</div>
                <div class="loading-step">🚀 Iniciando quiz</div>
            </div>
        </div>
    `;

    modal.appendChild(loadingOverlay);

    // Animar os steps de forma mais realista
    setTimeout(() => {
        const steps = loadingOverlay.querySelectorAll('.loading-step');
        if (steps.length >= 2) {
            steps[0].classList.remove('active');
            steps[1].classList.add('active');
        }
    }, 800);

    setTimeout(() => {
        const steps = loadingOverlay.querySelectorAll('.loading-step');
        if (steps.length >= 3) {
            steps[1].classList.remove('active');
            steps[2].classList.add('active');
        }
    }, 1600);
}

// Show quiz loading modal with progress animation
function showQuizLoadingModal(module) {
    // Garantir que o modal de criação esteja completamente fechado e resetado
    const createModal = document.getElementById('createTrilhaModal');
    if (createModal) {
        createModal.style.display = 'none';
    }
    
    const createProgress = document.getElementById('trilhaCreationProgress');
    if (createProgress) {
        createProgress.style.display = 'none';
    }
    
    // Fechar qualquer outro modal que possa estar aberto (exceto o modal de criação que é tratado acima)
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.remove();
    });
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay quiz-loading-overlay';
    modal.innerHTML = `
        <div class="modal-content quiz-loading-modal">
            <div class="creation-progress">
                <h3 style="margin-bottom: 2rem; color: var(--gray-800);">Carregando Trilha</h3>
                <div class="progress-steps">
                    <div class="step active">
                        <i class="fas fa-book"></i>
                        <span>Carregando módulo "${module.titulo}"...</span>
                    </div>
                    <div class="step">
                        <i class="fas fa-database"></i>
                        <span>Buscando questões...</span>
                    </div>
                    <div class="step">
                        <i class="fas fa-check"></i>
                        <span>Preparando quiz...</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Animar progresso
    animateQuizLoadingProgress(modal);

    return modal;
}

// Animate quiz loading progress steps
function animateQuizLoadingProgress(modal) {
    const steps = modal.querySelectorAll('.progress-steps .step');
    let currentStep = 0;

    const animateStep = () => {
        if (currentStep < steps.length) {
            // Activate current step
            steps[currentStep].classList.add('active');

            // Deactivate previous step
            if (currentStep > 0) {
                steps[currentStep - 1].classList.remove('active');
                steps[currentStep - 1].classList.add('completed');
            }

            currentStep++;
            if (currentStep < steps.length) {
                setTimeout(animateStep, 2000); // 2 seconds per step
            }
        }
    };

    setTimeout(animateStep, 1000); // Start after 1 second
}

// Show quiz cancel confirmation modal
function showQuizCancelConfirmation() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay quiz-cancel-overlay';
    modal.innerHTML = `
        <div class="modal-content quiz-cancel-modal">
            <div class="modal-header cancel-header">
                <div class="cancel-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Cancelar Quiz</h3>
            </div>
            <div class="modal-body">
                <div class="cancel-message">
                    <p>Tem certeza que deseja cancelar o quiz?</p>
                    <div class="cancel-warning">
                        <div class="warning-item">
                            <i class="fas fa-times-circle"></i>
                            <span>Todo o progresso será perdido</span>
                        </div>
                        <div class="warning-item">
                            <i class="fas fa-clock"></i>
                            <span>O tempo será zerado</span>
                        </div>
                        <div class="warning-item">
                            <i class="fas fa-undo"></i>
                            <span>Você precisará começar novamente</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer cancel-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-arrow-left"></i>
                    Voltar ao Quiz
                </button>
                <button class="btn btn-danger" onclick="confirmQuizCancel()">
                    <i class="fas fa-times"></i>
                    Sim, Cancelar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Confirm quiz cancellation
function confirmQuizCancel() {
    // Fechar modal de confirmação
    document.querySelector('.quiz-cancel-overlay')?.remove();

    // Fechar modal do quiz
    document.querySelector('.quiz-modal-overlay')?.remove();

    // Mostrar notificação
    if (window.elearning?.showNotification) {
        window.elearning.showNotification('Quiz cancelado', 'info');
    } else if (window.showNotification) {
        window.showNotification('Quiz cancelado', 'info');
    } else {
        alert('Quiz cancelado');
    }

    // Voltar para a tela de trilhas (opcional)
    console.log('Quiz cancelled by user');
}

// Show start module error modal
function showStartModuleError(errorMessage) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay error-modal-overlay';
    modal.innerHTML = `
        <div class="modal-content error-modal">
            <div class="modal-header error-header">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Erro ao Iniciar Módulo</h3>
            </div>
            <div class="modal-body">
                <div class="error-message">
                    <p>${errorMessage}</p>
                    <p class="error-suggestion">Tente novamente em alguns instantes.</p>
                </div>
            </div>
            <div class="modal-footer error-footer">
                <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-check"></i>
                    Entendido
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Close all modals
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.remove();
    });
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('Trilhas Personalizadas DOM loaded');

    // Wait for main elearning system to be ready
    const initWhenReady = () => {
        if (window.elearning) {
            console.log('Initializing Trilhas Personalizadas');
            initTrilhasPersonalizadas();
        } else {
            console.log('Waiting for elearning system...');
            setTimeout(initWhenReady, 500);
        }
    };

    initWhenReady();
});

// Export functions for global access
window.trilhasPersonalizadas = {
    init: initTrilhasPersonalizadas,
    checkStatus: checkUserTrilhaStatus,
    showCreateModal: showCreateTrilhaModal,
    showUserTrilhas: showUserTrilhas,
    startTrilha: window.startTrilha,
    startQuizSession: startQuizSession,
    showTrilhaFinalResults: window.showTrilhaFinalResults
};

// Also export showUserTrilhas directly for easier access
window.showUserTrilhas = showUserTrilhas;
