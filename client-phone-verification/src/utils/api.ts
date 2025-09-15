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
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error || data.message || 'An error occurred') as ApiError;
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
        headers['Authorization'] = `Bearer ${token}`;
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
        headers['Authorization'] = `Bearer ${token}`;
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
        headers['Authorization'] = `Bearer ${token}`;
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
        headers['Authorization'] = `Bearer ${token}`;
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
  sendSurveyInvitation: async (phone: string, batchLabel?: string) => {
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
};