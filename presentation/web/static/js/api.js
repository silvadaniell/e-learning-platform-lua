// API Client - E-Learning Platform

// API Configuration
const API_BASE_URL = window.location.origin;
const API_VERSION = 'v1';

// API Client class
class APIClient {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }

    // Generic API call method
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}/api/v1${endpoint}`;
        
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        // Add authentication token if available
        const token = this.getAuthToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            console.log(`API Request: ${config.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // HTTP Methods
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, { method: 'GET' });
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Authentication methods
    getAuthToken() {
        return localStorage.getItem('elearning_token');
    }

    setAuthToken(token) {
        localStorage.setItem('elearning_token', token);
    }

    clearAuthToken() {
        localStorage.removeItem('elearning_token');
    }
}

// Create global API client instance
const apiClient = new APIClient();

// User API methods
const UserAPI = {
    async register(userData) {
        return apiClient.post('/users/register', userData);
    },

    async login(email, password) {
        return apiClient.post('/users/login', { email, password });
    },

    // Create new user
    async create(userData) {
        return apiClient.post('/users/', userData);
    },

    // Get user profile
    async getProfile(userId) {
        // If no userId provided, get current user profile
        const endpoint = userId ? `/users/${userId}` : '/users/me';
        return apiClient.get(endpoint);
    },

    // Update user profile
    async updateProfile(userId, updateData) {
        return apiClient.put(`/users/${userId}`, updateData);
    },

    // Search users
    async search(query, limit = 50) {
        return apiClient.get('/users/', { q: query, limit });
    },

    // Get user recommendations
    async getRecommendations(userId) {
        return apiClient.get(`/users/${userId}/recommendations`);
    },

    // Get user analytics
    async getAnalytics(userId, days = 30) {
        return apiClient.get(`/users/${userId}/analytics`, { days });
    },

    // Get user learning path
    async getLearningPath(userId) {
        return apiClient.get(`/users/${userId}/learning-path`);
    },

    // Delete user
    async delete(userId) {
        return apiClient.delete(`/users/${userId}`);
    }
};

// Trilha API methods
const TrilhaAPI = {
    // Get all trilhas
    async getAll(params = {}) {
        return apiClient.get('/trilhas/', params);
    },

    // Create new trilha
    async create(trilhaData) {
        return apiClient.post('/trilhas/', trilhaData);
    },

    // Get trilha details
    async getDetails(trilhaId, userId = null) {
        const params = userId ? { user_id: userId } : {};
        return apiClient.get(`/trilhas/${trilhaId}`, params);
    },

    // Update trilha
    async update(trilhaId, updateData) {
        return apiClient.put(`/trilhas/${trilhaId}`, updateData);
    },

    // Delete trilha
    async delete(trilhaId) {
        return apiClient.delete(`/trilhas/${trilhaId}`);
    },

    // List trilhas
    async list(difficulty = null, limit = 50, offset = 0) {
        const params = { limit, offset };
        if (difficulty) params.difficulty = difficulty;
        return apiClient.get('/trilhas/', params);
    },

    // Search trilhas
    async search(query, limit = 50) {
        return apiClient.get('/trilhas/search/', { q: query, limit });
    },

    // Get popular trilhas
    async getPopular(limit = 10) {
        return apiClient.get('/trilhas/popular/', { limit });
    },

    // Enroll user in trilha
    async enroll(trilhaId, userId) {
        return apiClient.post(`/trilhas/${trilhaId}/enroll`, { user_id: userId });
    },

    // Add content to trilha
    async addContent(trilhaId, contentData) {
        return apiClient.post(`/trilhas/${trilhaId}/content`, contentData);
    },

    // Update progress
    async updateProgress(progressData) {
        return apiClient.post('/trilhas/progress/update', progressData);
    },

    // Get user progress on trilha
    async getUserProgress(trilhaId, userId) {
        return apiClient.get(`/trilhas/${trilhaId}/progress/${userId}`);
    },

    // Get trilha statistics
    async getStatistics(trilhaId) {
        return apiClient.get(`/trilhas/${trilhaId}/statistics`);
    },

    // Get completion stats
    async getCompletionStats(trilhaId) {
        return apiClient.get(`/trilhas/${trilhaId}/completion-stats`);
    }
};

// Chatbot API methods
const ChatbotAPI = {
    // Send message to chatbot
    async sendMessage(userId, message, context = null) {
        return apiClient.post(`/chatbot/chat/${userId}`, {
            message,
            context
        });
    },

    // Get conversation history
    async getHistory(userId, limit = 10) {
        return apiClient.get(`/chatbot/history/${userId}`, { limit });
    },

    // Clear conversation history
    async clearHistory(userId) {
        return apiClient.delete(`/chatbot/history/${userId}`);
    },

    // Get quick help
    async getQuickHelp(userId, topic) {
        return apiClient.post(`/chatbot/quick-help/${userId}`, null, { topic });
    },

    // Get supported intents
    async getSupportedIntents() {
        return apiClient.get('/chatbot/intents');
    },

    // Submit feedback
    async submitFeedback(userId, rating, feedback = null, conversationId = null) {
        const params = { rating };
        if (feedback) params.feedback = feedback;
        if (conversationId) params.conversation_id = conversationId;
        
        return apiClient.post(`/chatbot/feedback/${userId}`, null, params);
    }
};

// Recommendations API methods
const RecommendationsAPI = {
    // Get AI recommendations
    async getAIRecommendations(userId, limit = 10) {
        return apiClient.get(`/recommendations/${userId}`, { limit });
    },

    // Get personalized content
    async getPersonalizedContent(userId, limit = 10) {
        return apiClient.get(`/recommendations/content/${userId}`, { limit });
    },

    // Analyze learning patterns
    async analyzeLearningPatterns(userId, periodDays = 30) {
        return apiClient.post(`/recommendations/analyze/${userId}`, null, { period_days: periodDays });
    },

    // Search content
    async searchContent(searchData) {
        return apiClient.post('/recommendations/search', searchData);
    },

    // Get trending content
    async getTrendingContent(category = null, limit = 10) {
        const params = { limit };
        if (category) params.category = category;
        return apiClient.get('/recommendations/trending', params);
    },

    // Get popular trilhas
    async getPopularTrilhas(limit = 10) {
        return apiClient.get('/recommendations/popular-trilhas', { limit });
    },

    // Get top performers insights
    async getTopPerformers(metric = 'progress', limit = 10) {
        return apiClient.get('/recommendations/top-performers', { metric, limit });
    },

    // Get recommended learning paths
    async getRecommendedPaths(userId, limit = 5) {
        return apiClient.get(`/recommendations/learning-paths/${userId}`, { limit });
    }
};

// Content API methods
const ContentAPI = {
    // Search external content
    async searchExternal(query, contentType = null, difficulty = null, limit = 20) {
        const params = { query, limit };
        if (contentType) params.content_type = contentType;
        if (difficulty) params.difficulty = difficulty;
        return apiClient.get('/content/external/search', params);
    },

    // Get external content details
    async getExternalDetails(contentId) {
        return apiClient.get(`/content/external/${contentId}`);
    },

    // Get trending content
    async getTrending(category = null, limit = 10) {
        const params = { limit };
        if (category) params.category = category;
        return apiClient.get('/content/trending', params);
    },

    // Get assessments for topic
    async getAssessments(topic, difficulty = 'intermediate') {
        return apiClient.get(`/content/assessments/${topic}`, { difficulty });
    },

    // Submit assessment
    async submitAssessment(assessmentId, userId, score, answers) {
        const params = { user_id: userId, score, answers: JSON.stringify(answers) };
        return apiClient.post(`/content/assessments/${assessmentId}/submit`, null, params);
    },

    // Upload file
    async uploadFile(file, contentType = 'courses', description = null) {
        const formData = new FormData();
        formData.append('file', file);
        
        const params = { content_type: contentType };
        if (description) params.description = description;
        
        return apiClient.request('/content/upload', {
            method: 'POST',
            body: formData,
            headers: {} // Let browser set Content-Type for FormData
        });
    },

    // List files
    async listFiles(contentType = null, limit = 100) {
        const params = { limit };
        if (contentType) params.content_type = contentType;
        return apiClient.get('/content/files', params);
    },

    // Delete file
    async deleteFile(filePath) {
        return apiClient.delete(`/content/files/${filePath}`);
    },

    // Analyze content with AI
    async analyzeContent(content, contentType = 'text') {
        const params = { content, content_type: contentType };
        return apiClient.post('/content/analyze', null, params);
    },

    // Get storage stats
    async getStorageStats() {
        return apiClient.get('/content/storage/stats');
    },

    // Get supported content types
    async getSupportedTypes() {
        return apiClient.get('/content/types');
    }
};

// System API methods
const SystemAPI = {
    // Health check
    async healthCheck() {
        return apiClient.get('/health');
    },

    // API status
    async getStatus() {
        return apiClient.get('/status');
    }
};

// Generic API call function (for backward compatibility)
async function apiCall(endpoint, method = 'GET', data = null, params = {}) {
    try {
        switch (method.toUpperCase()) {
            case 'GET':
                return await apiClient.get(endpoint, params);
            case 'POST':
                return await apiClient.post(endpoint, data);
            case 'PUT':
                return await apiClient.put(endpoint, data);
            case 'DELETE':
                return await apiClient.delete(endpoint);
            default:
                throw new Error(`Unsupported HTTP method: ${method}`);
        }
    } catch (error) {
        console.error('API Call Error:', error);
        return {
            success: false,
            error: error.message || 'API call failed'
        };
    }
}

// Error handling utilities
function handleAPIError(error, context = '') {
    console.error(`API Error ${context}:`, error);
    
    let message = 'Erro de conexão. Tente novamente.';
    
    if (error.message) {
        if (error.message.includes('404')) {
            message = 'Recurso não encontrado.';
        } else if (error.message.includes('401')) {
            message = 'Acesso não autorizado. Faça login novamente.';
        } else if (error.message.includes('403')) {
            message = 'Acesso negado.';
        } else if (error.message.includes('500')) {
            message = 'Erro interno do servidor.';
        } else {
            message = error.message;
        }
    }
    
    return message;
}

// Request interceptor for loading states
let activeRequests = 0;

const originalRequest = apiClient.request;
apiClient.request = async function(endpoint, options = {}) {
    activeRequests++;
    updateLoadingState(true);
    
    try {
        const result = await originalRequest.call(this, endpoint, options);
        return result;
    } finally {
        activeRequests--;
        if (activeRequests === 0) {
            updateLoadingState(false);
        }
    }
};

function updateLoadingState(isLoading) {
    // Update global loading indicator if it exists
    const loadingIndicator = document.getElementById('globalLoading');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
    
    // Disable/enable forms during loading
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            
            if (isLoading) {
                // Store original text if not already stored
                if (!submitBtn.dataset.originalText) {
                    submitBtn.dataset.originalText = submitBtn.textContent;
                }
                // Just disable the button, keep original text
                submitBtn.style.opacity = '0.7';
            } else {
                // Restore original text and style
                if (submitBtn.dataset.originalText) {
                    submitBtn.textContent = submitBtn.dataset.originalText;
                }
                submitBtn.style.opacity = '1';
            }
        }
    });
}

// Export API modules
window.API = {
    client: apiClient,
    User: UserAPI,
    Trilha: TrilhaAPI,
    Chatbot: ChatbotAPI,
    Recommendations: RecommendationsAPI,
    Content: ContentAPI,
    System: SystemAPI,
    call: apiCall,
    handleError: handleAPIError
};

// Also export individual functions for backward compatibility
window.apiCall = apiCall;
window.UserAPI = UserAPI;
window.TrilhaAPI = TrilhaAPI;
window.ChatbotAPI = ChatbotAPI;
window.RecommendationsAPI = RecommendationsAPI;
window.ContentAPI = ContentAPI;
