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

const handleResponse = async (response: Response) => {
  // Log all response details for debugging
  console.log('Response received:', {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    ok: response.ok
  });
  
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
    console.error('API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      data: data
    });
    
    let errorMessage = 'An error occurred';
    
    if (data?.error) {
      errorMessage = data.error;
    } else if (data?.message) {
      errorMessage = data.message;
    } else if (response.status === 403) {
      errorMessage = 'Access denied. Please check your permissions.';
    } else if (response.status === 400) {
      errorMessage = 'Invalid request. Please check your input.';
    } else if (response.status === 404) {
      errorMessage = 'Resource not found.';
    } else if (response.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    }
    
    console.error('Throwing error:', errorMessage, 'Status:', response.status);
    
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
        (headers as any)['Authorization'] = `Bearer ${token}`;
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
    
    // Add JWT token for admin endpoints
    if (endpoint.startsWith('/api/admin/')) {
      const token = localStorage.getItem('adminToken');
      if (token) {
        (headers as any)['Authorization'] = `Bearer ${token}`;
        console.log('POST request to:', endpoint);
        console.log('Token present:', !!token);
        console.log('Token (first 20 chars):', token?.substring(0, 20) + '...');
      } else {
        console.warn('No admin token found for admin endpoint:', endpoint);
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
        (headers as any)['Authorization'] = `Bearer ${token}`;
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
        (headers as any)['Authorization'] = `Bearer ${token}`;
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
    });
  },

  checkOtp: async (phone: string, code: string, email?: string, name?: string) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    return api.post('/api/otp/check', { 
      phone: normalizedPhone, 
      code,
      email: email || null,
      name: name || null
    });
  },

  // Send survey invitation (user endpoint)
  sendSurveyInvitation: async (phone: string) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    return api.post('/api/participants/resend-survey-link', { 
      phone: normalizedPhone, 
      body: 'resend' // Required field for SendSmsRequest
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
    return api.get(`/api/participants/check-verification/${encodeURIComponent(normalizedPhone)}`);
  },

  // Gift Card API calls
  getGiftCardPoolStatus: async () => {
    return api.get('/api/admin/gift-cards/pool/status');
  },

  getAvailableGiftCards: async (page = 0, size = 20) => {
    return api.get(`/api/admin/gift-cards/pool/available?page=${page}&size=${size}`);
  },

  getEligibleParticipants: async () => {
    return api.get('/api/admin/gift-cards/eligible');
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

  addGiftCardToPool: async (giftCard: any) => {
    return api.post('/api/admin/gift-cards/pool/add', giftCard);
  },

  uploadGiftCards: async (file: File, batchLabel: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('batchLabel', batchLabel);
    
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

  resendGiftCard: async (giftCardId: string) => {
    return api.post(`/api/admin/gift-cards/${giftCardId}/resend`);
  },

  addGiftCardNotes: async (giftCardId: string, notes: string) => {
    return api.post(`/api/admin/gift-cards/${giftCardId}/notes`, { notes });
  },

  deleteGiftCardFromPool: async (poolId: string) => {
    return api.delete(`/api/admin/gift-cards/pool/${poolId}`);
  },

  deleteGiftCard: async (giftCardId: string) => {
    return api.delete(`/api/admin/gift-cards/${giftCardId}`);
  },

  getGiftCardDistributionLogs: async (giftCardId: string) => {
    return api.get(`/api/admin/gift-cards/${giftCardId}/logs`);
  },

  // Survey management API calls
  markSurveyCompleted: async (invitationId: string) => {
    return api.post(`/api/admin/invitations/${invitationId}/complete`);
  },

  markSurveyUncompleted: async (invitationId: string) => {
    return api.post(`/api/admin/invitations/${invitationId}/uncomplete`);
  },

  bulkMarkSurveysCompleted: async (invitationIds: string[]) => {
    return api.post('/api/admin/invitations/bulk-complete', invitationIds);
  },

  bulkMarkSurveysUncompleted: async (invitationIds: string[]) => {
    return api.post('/api/admin/invitations/bulk-uncomplete', invitationIds);
  },
};