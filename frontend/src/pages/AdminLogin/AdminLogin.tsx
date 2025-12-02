// src/pages/AdminLogin/AdminLogin.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const existingToken = localStorage.getItem("adminToken");
    if (existingToken) {
      // Check if token is expired
      try {
        const tokenParts = existingToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload.exp && Date.now() < payload.exp * 1000) {
            // Token is still valid, navigate to dashboard
            navigate('/admin-dashboard', { replace: true });
            return;
          }
        }
        // Token is expired or invalid, remove it
        localStorage.removeItem('adminToken');
      } catch (error) {
        // Token is malformed, remove it
        localStorage.removeItem('adminToken');
      }
    }

    // Check if redirected due to expired token
    const expired = searchParams.get('expired');
    if (expired === 'true') {
      setLoginError('Your session has expired. Please log in again.');
      // Clear the expired parameter from URL to prevent it from showing again
      window.history.replaceState({}, '', '/admin-login');
    }
  }, [navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(''); // Clear any previous errors

    try {
      const data = await api.post('/api/admin/login', { username, password });
      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        navigate('/admin-dashboard', { replace: true });
      } else {
        setLoginError(data.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      // Don't show "session expired" error for login attempts
      const errorMessage = err.message || 'Server error. Please try again.';
      if (!errorMessage.toLowerCase().includes('expired')) {
        setLoginError(errorMessage);
      } else {
        setLoginError('Invalid credentials. Please try again.');
      }
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
            <h2 className="text-2xl font-bold text-white text-center">
              Admin Login
            </h2>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {loginError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{loginError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (loginError) setLoginError(''); // Clear error when user starts typing
                  }}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (loginError) setLoginError(''); // Clear error when user starts typing
                  }}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                  text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] 
                  active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Log In
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
