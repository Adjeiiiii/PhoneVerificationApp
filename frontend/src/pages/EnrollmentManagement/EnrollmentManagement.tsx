import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../utils/api';

const EnrollmentManagement: React.FC = () => {
  const ENROLLMENT_ACCESS_TOKEN_KEY = 'enrollmentAccessToken';
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [accessError, setAccessError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [maxParticipants, setMaxParticipants] = useState<string>('');
  const [isEnrollmentActive, setIsEnrollmentActive] = useState(true);

  useEffect(() => {
    // Require password every time this page/tab is opened.
    sessionStorage.removeItem(ENROLLMENT_ACCESS_TOKEN_KEY);
    setAccessGranted(false);
    setLoading(false);

    return () => {
      // Clear scoped access token when leaving the page.
      sessionStorage.removeItem(ENROLLMENT_ACCESS_TOKEN_KEY);
    };
  }, []);

  useEffect(() => {
    if (accessGranted) {
      fetchConfig();
    }
  }, [accessGranted]);

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (message && message.type === 'success') {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setAccessError(null);
      const data = await api.getEnrollmentConfig();
      setConfig(data);
      setMaxParticipants(data.maxParticipants?.toString() || '');
      setIsEnrollmentActive(data.isEnrollmentActive ?? true);
    } catch (error: any) {
      const msg = error.message || 'Failed to fetch enrollment configuration';
      setMessage({ type: 'error', text: msg });
      if (msg.toLowerCase().includes('enrollment settings access token')) {
        sessionStorage.removeItem(ENROLLMENT_ACCESS_TOKEN_KEY);
        setAccessGranted(false);
        setAccessError('Your enrollment settings access has expired. Enter the password again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockAccess = async () => {
    try {
      setUnlocking(true);
      setAccessError(null);
      const response = await api.requestEnrollmentAccessToken(accessPassword.trim());
      sessionStorage.setItem(ENROLLMENT_ACCESS_TOKEN_KEY, response.token);
      setAccessPassword('');
      setAccessGranted(true);
    } catch (error: any) {
      setAccessError(error.message || 'Invalid password. Please try again.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const maxParticipantsValue = maxParticipants.trim() === '' ? null : parseInt(maxParticipants, 10);
      
      if (maxParticipantsValue !== null && (isNaN(maxParticipantsValue) || maxParticipantsValue < 1)) {
        setMessage({ type: 'error', text: 'Maximum participants must be at least 1, or leave empty for unlimited' });
        return;
      }

      if (maxParticipantsValue !== null && maxParticipantsValue < (config?.currentCount || 0)) {
        setMessage({ 
          type: 'error', 
          text: `Cannot set maximum participants to ${maxParticipantsValue}. Current enrollment is ${config?.currentCount || 0}. Please set a limit of at least ${config?.currentCount || 0} or delete some participants first.` 
        });
        return;
      }

      const updated = await api.updateEnrollmentConfig(maxParticipantsValue, isEnrollmentActive);
      setConfig(updated);
      setMessage({ type: 'success', text: 'Enrollment settings updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update enrollment configuration' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'text-green-600';
      case 'FULL':
        return 'text-red-600';
      case 'DISABLED':
        return 'text-gray-600';
      case 'UNLIMITED':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return '✅ Enrollment OPEN';
      case 'FULL':
        return '⚠️ Enrollment FULL';
      case 'DISABLED':
        return '⛔ Enrollment DISABLED';
      case 'UNLIMITED':
        return '✅ Enrollment UNLIMITED';
      default:
        return status;
    }
  };

  const getProgressColor = () => {
    if (!config || config.maxParticipants === null) return 'bg-blue-500';
    const percentage = (config.currentCount / config.maxParticipants) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressPercentage = () => {
    if (!config || config.maxParticipants === null) return 0;
    return Math.min(100, (config.currentCount / config.maxParticipants) * 100);
  };

  if (loading) {
    return (
      <AdminLayout title="Enrollment Management" searchQuery="" onSearchChange={() => {}}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading enrollment configuration...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Enrollment Management" searchQuery="" onSearchChange={() => {}}>
      {!accessGranted && (
        <div className="p-6">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-[0_10px_30px_rgba(2,6,23,0.08)] border border-slate-200/80 p-7">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">Enrollment Settings Protected</h2>
            <p className="text-sm leading-6 text-slate-600 mb-5">
              Enter the enrollment settings password to access this page.
            </p>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={accessPassword}
              onChange={(e) => setAccessPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && accessPassword.trim() && !unlocking) {
                  handleUnlockAccess();
                }
              }}
              className="w-full px-4 py-3 text-slate-800 placeholder:text-slate-400 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-0 focus:border-blue-600 transition-colors duration-150"
              placeholder="Enter enrollment settings password"
              autoFocus
            />
            {accessError && (
              <p className="mt-2 text-sm text-red-600">{accessError}</p>
            )}
            <button
              onClick={handleUnlockAccess}
              disabled={unlocking || !accessPassword.trim()}
              className="mt-5 w-full px-4 py-3 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {unlocking ? 'Verifying...' : 'Unlock Enrollment Settings'}
            </button>
          </div>
        </div>
      )}
      {accessGranted && (
          <div className="p-6 space-y-6">
            {/* Message Banner */}
            {message && (
              <div className={`p-4 rounded-lg border-l-4 ${
                message.type === 'success' 
                  ? 'bg-green-50 border-l-green-500' 
                  : 'bg-red-50 border-l-red-500'
              }`}>
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${
                    message.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                  } rounded-full p-2`}>
                    {message.type === 'success' ? (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      message.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {message.text}
                    </p>
                  </div>
                  <button
                    onClick={() => setMessage(null)}
                    className={`ml-auto ${
                      message.type === 'success' 
                        ? 'text-green-500 hover:bg-green-100' 
                        : 'text-red-500 hover:bg-red-100'
                    } transition-colors rounded-full p-1`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Status Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Current Enrollment Status</h2>
                {config && (
                  <p className="text-xs text-gray-500">
                    Last Updated: {config.updatedAt ? new Date(config.updatedAt).toLocaleString() : 'N/A'}
                    {config.updatedBy && config.updatedBy !== 'SYSTEM' && ` by ${config.updatedBy}`}
                  </p>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Progress Bar */}
                {config && config.maxParticipants !== null && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Enrollment Progress</span>
                      <span className="text-sm font-medium text-gray-700">{getProgressPercentage().toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
                        style={{ width: `${getProgressPercentage()}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-900">Current Enrollment</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{config?.currentCount || 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="text-sm font-medium text-gray-900">Maximum Participants</div>
                    <div className="text-2xl font-bold text-gray-700 mt-1">
                      {config?.maxParticipants === null ? '∞' : (config?.maxParticipants || 'N/A')}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm font-medium text-green-900">Remaining Spots</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">
                      {config?.remainingSpots === -1 ? (
                        <span className="text-base">Unlimited</span>
                      ) : (
                        config?.remainingSpots ?? 'N/A'
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <span className={`text-lg font-semibold ${getStatusColor(config?.status || '')}`}>
                      {getStatusBadge(config?.status || '')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Enrollment Settings</h2>
              
              <div className="space-y-6">
                {/* Maximum Participants */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Participants
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    placeholder="Leave empty for unlimited"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to allow unlimited enrollment. Set a number to limit participants.
                  </p>
                </div>

                {/* Enrollment Active Toggle */}
                <div>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnrollmentActive}
                      onChange={(e) => setIsEnrollmentActive(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Enrollment Active</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500 ml-8">
                    When disabled, new participants cannot enroll even if under the limit.
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const newMax = (config?.currentCount || 0) + 10;
                        setMaxParticipants(newMax.toString());
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Increase by 10
                    </button>
                    <button
                      onClick={() => {
                        const newMax = (config?.currentCount || 0) + 25;
                        setMaxParticipants(newMax.toString());
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Increase by 25
                    </button>
                    <button
                      onClick={() => setMaxParticipants('')}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Set to Unlimited
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Update Settings'}
                  </button>
                </div>
              </div>
            </div>

          </div>
      )}
    </AdminLayout>
  );
};

export default EnrollmentManagement;

