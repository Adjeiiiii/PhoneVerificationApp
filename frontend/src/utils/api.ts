// In development, use relative URLs to leverage Vite proxy
// In production, use the full API URL
const API_BASE_URL = import.meta.env.PROD ? (import.meta.env.VITE_API_BASE_URL || '') : '';

export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`;
};

interface ApiOptions {
  headers?: Record<string, string>;
}

interface ApiError extends Error {
  status?: number;
}

const ENROLLMENT_ACCESS_TOKEN_KEY = 'enrollmentAccessToken';
const SURVEY_ACCESS_TOKEN_KEY = 'surveyAccessToken';

// Phone number normalization utility
export const normalizePhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If it's 10 digits, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it's 11 digits and starts with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it already has +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: add +1
  return `+1${digits}`;
};

// Utility function to check if token is expired
const isTokenExpired = (token: string): boolean => {
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return true; // Invalid token format
    }
    const payload = JSON.parse(atob(tokenParts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return true; // Token expired
    }
    return false;
  } catch (error) {
    return true; // Token is malformed
  }
};

// Utility function to handle logout when authentication fails
const handleLogout = () => {
  localStorage.removeItem('adminToken');
  sessionStorage.removeItem(ENROLLMENT_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(SURVEY_ACCESS_TOKEN_KEY);
  // Only redirect if we're on an admin page
  if (window.location.pathname.startsWith('/admin')) {
    window.location.href = '/admin-login?expired=true';
  }
};

const getEnrollmentAccessTokenHeader = (): Record<string, string> => {
  const token = sessionStorage.getItem(ENROLLMENT_ACCESS_TOKEN_KEY);
  if (!token) {
    throw new Error('Enrollment settings password is required.');
  }
  return { 'X-Enrollment-Access-Token': token };
};

const getSurveyAccessTokenHeader = (): Record<string, string> => {
  const token = sessionStorage.getItem(SURVEY_ACCESS_TOKEN_KEY);
  if (!token) {
    throw new Error('Study access password is required.');
  }
  return { 'X-Survey-Access-Token': token };
};

const handleResponse = async (response: Response) => {
  // Check if response has content to parse
  const contentType = response.headers.get('content-type');
  const hasJsonContent = contentType && contentType.includes('application/json');
  
  let data = null;
  if (hasJsonContent) {
    try {
      data = await response.json();
    } catch (error) {
      // If JSON parsing fails but response is ok, it might be empty
      if (response.ok) {
        return null;
      }
      throw error;
    }
  }
  
  if (!response.ok) {
    // Handle authentication errors - auto logout
    if (response.status === 401 || response.status === 403) {
      handleLogout();
      const error = new Error('Your session has expired. Please log in again.') as ApiError;
      error.status = response.status;
      throw error;
    }
    
    let errorMessage = 'An error occurred';
    
    if (data?.error) {
      errorMessage = data.error;
    } else if (data?.message) {
      errorMessage = data.message;
    } else if (response.status === 400) {
      errorMessage = 'Invalid request. Please check your input.';
    } else if (response.status === 404) {
      errorMessage = 'Resource not found.';
    } else if (response.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    }
    
    const error = new Error(errorMessage) as ApiError;
    error.status = response.status;
    throw error;
  }

  return data;
};

export const api = {
  get: async (endpoint: string, options: ApiOptions = {}) => {
    const headers = { ...options.headers };
    
    // Add JWT token for admin endpoints
    if (endpoint.startsWith('/api/admin/')) {
      const token = localStorage.getItem('adminToken');
      if (token) {
        // Check if token is expired before making the request
        if (isTokenExpired(token)) {
          handleLogout();
          throw new Error('Your session has expired. Please log in again.');
        }
        (headers as any)['Authorization'] = `Bearer ${token}`;
      } else {
        handleLogout();
        throw new Error('Please log in to access this resource.');
      }
    }
    
    const response = await fetch(getApiUrl(endpoint), {
      headers,
    });
    return handleResponse(response);
  },

  post: async (endpoint: string, data: any, options: ApiOptions = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Add JWT token for admin endpoints (except login endpoint)
    if (endpoint.startsWith('/api/admin/') && endpoint !== '/api/admin/login') {
      const token = localStorage.getItem('adminToken');
      if (token) {
        // Check if token is expired before making the request
        if (isTokenExpired(token)) {
          handleLogout();
          throw new Error('Your session has expired. Please log in again.');
        }
        (headers as any)['Authorization'] = `Bearer ${token}`;
      } else {
        handleLogout();
        throw new Error('Please log in to access this resource.');
      }
    }
    
    const response = await fetch(getApiUrl(endpoint), {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  put: async (endpoint: string, data: any, options: ApiOptions = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Add JWT token for admin endpoints
    if (endpoint.startsWith('/api/admin/')) {
      const token = localStorage.getItem('adminToken');
      if (token) {
        // Check if token is expired before making the request
        if (isTokenExpired(token)) {
          handleLogout();
          throw new Error('Your session has expired. Please log in again.');
        }
        (headers as any)['Authorization'] = `Bearer ${token}`;
      } else {
        handleLogout();
        throw new Error('Please log in to access this resource.');
      }
    }
    
    const response = await fetch(getApiUrl(endpoint), {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (endpoint: string, options: ApiOptions = {}) => {
    const headers = { ...options.headers };
    
    // Add JWT token for admin endpoints
    if (endpoint.startsWith('/api/admin/')) {
      const token = localStorage.getItem('adminToken');
      if (token) {
        // Check if token is expired before making the request
        if (isTokenExpired(token)) {
          handleLogout();
          throw new Error('Your session has expired. Please log in again.');
        }
        (headers as any)['Authorization'] = `Bearer ${token}`;
      } else {
        // No token for admin endpoint - redirect to login
        handleLogout();
        throw new Error('Please log in to access this resource.');
      }
    }
    
    const response = await fetch(getApiUrl(endpoint), {
      method: 'DELETE',
      headers,
    });
    return handleResponse(response);
  },

  // OTP API calls
  startOtp: async (phone: string) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    return api.post('/api/otp/start', { 
      phone: normalizedPhone, 
      channel: 'sms' 
    }, {
      headers: getSurveyAccessTokenHeader(),
    });
  },

  checkOtp: async (phone: string, code: string, email?: string, name?: string) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    return api.post('/api/otp/check', { 
      phone: normalizedPhone, 
      code,
      email: email || null,
      name: name || null
    }, {
      headers: getSurveyAccessTokenHeader(),
    });
  },

  // Send survey invitation (user endpoint)
  sendSurveyInvitation: async (phone: string) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    return api.post('/api/participants/resend-survey-link', { 
      phone: normalizedPhone, 
      body: 'resend' // Required field for SendSmsRequest
    }, {
      headers: getSurveyAccessTokenHeader(),
    });
  },

  // Send SMS message
  sendSms: async (phone: string, message: string) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    return api.post('/api/messages/send', { 
      phone: normalizedPhone, 
      body: message 
    });
  },

  // Get participant details
  getParticipant: async (phone: string) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    return api.get(`/api/participants/${encodeURIComponent(normalizedPhone)}`);
  },

  // Check if participant is already verified
  checkVerification: async (phone: string) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    return api.get(`/api/participants/check-verification/${encodeURIComponent(normalizedPhone)}`, {
      headers: getSurveyAccessTokenHeader(),
    });
  },

  // Validate phone number type (check for VOIP)
  validatePhone: async (phone: string) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    return api.post('/api/participants/validate-phone', { phone: normalizedPhone }, {
      headers: getSurveyAccessTokenHeader(),
    });
  },

  // Gift Card API calls
  getGiftCardPoolStatus: async () => {
    return api.get('/api/admin/gift-cards/pool/status');
  },

  getAvailableGiftCards: async (page = 0, size = 20) => {
    return api.get(`/api/admin/gift-cards/pool/available?page=${page}&size=${size}`);
  },

  getGiftCardsFromPool: async (status: string | null, page = 0, size = 20, code?: string) => {
    const statusParam = status ? `&status=${status}` : '';
    const codeParam = code ? `&code=${encodeURIComponent(code)}` : '';
    return api.get(`/api/admin/gift-cards/pool?page=${page}&size=${size}${statusParam}${codeParam}`);
  },

  getEligibleParticipants: async () => {
    return api.get('/api/admin/gift-cards/eligible');
  },

  getFailedGiftCards: async (page = 0, size = 20) => {
    return api.get(`/api/admin/gift-cards/failed?page=${page}&size=${size}`);
  },

  getGiftCards: async (filters: any = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    return api.get(`/api/admin/gift-cards?${params.toString()}`);
  },

  getSentGiftCards: async (page = 0, size = 20) => {
    return api.get(`/api/admin/gift-cards/sent?page=${page}&size=${size}`);
  },

  addGiftCardToPool: async (giftCard: any) => {
    return api.post('/api/admin/gift-cards/pool/add', giftCard);
  },

  uploadGiftCards: async (file: File, batchLabel?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (batchLabel) {
      formData.append('batchLabel', batchLabel);
    }
    
    const token = localStorage.getItem('adminToken');
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(getApiUrl('/api/admin/gift-cards/pool/upload'), {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(response);
  },

  sendGiftCard: async (participantId: string, giftCardData: any) => {
    return api.post(`/api/admin/gift-cards/send/${participantId}`, giftCardData);
  },

  batchSendGiftCards: async (participants: Array<{ participantId: string; invitationId: string }>, deliveryMethod: string, notes?: string) => {
    return api.post('/api/admin/gift-cards/batch-send', {
      participants,
      deliveryMethod,
      notes: notes || ''
    });
  },

  resendGiftCard: async (giftCardId: string) => {
    return api.post(`/api/admin/gift-cards/${giftCardId}/resend`, {});
  },

  addGiftCardNotes: async (giftCardId: string, notes: string) => {
    return api.post(`/api/admin/gift-cards/${giftCardId}/notes`, { notes });
  },

  updateGiftCardInPool: async (poolId: string, cardCode: string) => {
    return api.put(`/api/admin/gift-cards/pool/${poolId}`, { cardCode });
  },

  deleteGiftCardFromPool: async (poolId: string) => {
    return api.delete(`/api/admin/gift-cards/pool/${poolId}`);
  },

  unsendGiftCard: async (giftCardId: string) => {
    return api.post(`/api/admin/gift-cards/${giftCardId}/unsend`, {});
  },

  getUnsentGiftCards: async (page = 0, size = 20) => {
    return api.get(`/api/admin/gift-cards/unsent?page=${page}&size=${size}`);
  },

  getGiftCardDistributionLogs: async (giftCardId: string) => {
    return api.get(`/api/admin/gift-cards/${giftCardId}/logs`);
  },

  // Survey management API calls
  markSurveyCompleted: async (invitationId: string) => {
    return api.post(`/api/admin/invitations/${invitationId}/complete`, {});
  },

  markSurveyUncompleted: async (invitationId: string) => {
    return api.post(`/api/admin/invitations/${invitationId}/uncomplete`, {});
  },

  bulkMarkSurveysCompleted: async (invitationIds: string[]) => {
    return api.post('/api/admin/invitations/bulk-complete', invitationIds);
  },

  bulkMarkSurveysUncompleted: async (invitationIds: string[]) => {
    return api.post('/api/admin/invitations/bulk-uncomplete', invitationIds);
  },

  previewLinks: async (links: string[]) => {
    return api.post('/api/admin/invitations/preview-links', { links });
  },

  bulkCompleteByLinks: async (links: string[]) => {
    return api.post('/api/admin/invitations/bulk-complete-by-links', { links });
  },

  seedTestData: async () => {
    return api.post('/api/admin/seed-test-data', {});
  },

  checkGiftCardForInvitation: async (invitationId: string) => {
    return api.get(`/api/admin/gift-cards/check-invitation/${invitationId}`);
  },

  // User deletion API calls
  getUserDeletionInfo: async (userId: string) => {
    return api.get(`/api/admin/delete-user-info/${userId}`);
  },

  deleteUser: async (userId: string) => {
    return api.delete(`/api/admin/delete-user/${userId}`);
  },

  // Eligibility / IP block check (called when user clicks Next on eligibility screen)
  checkEligibilityIp: async () => {
    return api.post('/api/eligibility/check-ip', {}, {
      headers: getSurveyAccessTokenHeader(),
    });
  },

  requestSurveyAccessToken: async (password: string) => {
    return api.post('/api/enrollment/access-token', { password });
  },

  // Enrollment Management
  getEnrollmentStatus: async () => {
    // Add timestamp to prevent browser caching
    return api.get(`/api/enrollment/status?t=${Date.now()}`);
  },

  getEnrollmentConfig: async () => {
    return api.get('/api/admin/enrollment/config', {
      headers: getEnrollmentAccessTokenHeader(),
    });
  },

  updateEnrollmentConfig: async (
    maxParticipants: number | null,
    isEnrollmentActive: boolean | null,
    surveyAccessEnabled?: boolean,
    surveyAccessPassword?: string
  ) => {
    return api.put('/api/admin/enrollment/config', {
      maxParticipants,
      isEnrollmentActive,
      surveyAccessEnabled,
      surveyAccessPassword
    }, {
      headers: getEnrollmentAccessTokenHeader(),
    });
  },

  requestEnrollmentAccessToken: async (password: string) => {
    return api.post('/api/admin/enrollment/access-token', { password });
  },
};