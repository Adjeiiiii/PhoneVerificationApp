import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../utils/api';

const CONFIRM_PHRASE = 'YES';
const MIN_SURVEY_PASSWORD_LEN = 6;
const AUDIT_PAGE_SIZE = 25;

const EnrollmentManagement: React.FC = () => {
  const ENROLLMENT_ACCESS_TOKEN_KEY = 'enrollmentAccessToken';
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [showAccessPassword, setShowAccessPassword] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [maxParticipants, setMaxParticipants] = useState<string>('');
  const [isEnrollmentActive, setIsEnrollmentActive] = useState(true);
  const [surveyAccessEnabled, setSurveyAccessEnabled] = useState(true);
  const [surveyAccessPassword, setSurveyAccessPassword] = useState('');
  const [surveyAccessPasswordConfirm, setSurveyAccessPasswordConfirm] = useState('');
  const [showSurveyAccessPassword, setShowSurveyAccessPassword] = useState(false);
  const [showSurveyAccessPasswordConfirm, setShowSurveyAccessPasswordConfirm] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmPhraseInput, setConfirmPhraseInput] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [pendingConfirmReasons, setPendingConfirmReasons] = useState<string[]>([]);
  type AuditEntry = { id: string; createdAt: string; actorUsername: string; summary: string };
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditLogLoading, setAuditLogLoading] = useState(false);
  const [auditLogLoadingMore, setAuditLogLoadingMore] = useState(false);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditTotalElements, setAuditTotalElements] = useState<number | null>(null);
  const auditNextPageRef = useRef(0);

  /** @param reset If true, reload from page 0 (after save or initial load). If false, append next page. */
  const fetchAuditLog = async (reset: boolean) => {
    if (reset) {
      auditNextPageRef.current = 0;
      setAuditLogLoading(true);
    } else {
      setAuditLogLoadingMore(true);
    }
    try {
      const pageIdx = reset ? 0 : auditNextPageRef.current;
      const page = await api.getEnrollmentAuditLog(pageIdx, AUDIT_PAGE_SIZE);
      const content = Array.isArray(page?.content) ? page.content : [];
      if (typeof page?.totalElements === 'number') {
        setAuditTotalElements(page.totalElements);
      }
      if (reset) {
        setAuditLog(content);
      } else {
        setAuditLog((prev) => [...prev, ...content]);
      }
      const n = page?.number ?? pageIdx;
      auditNextPageRef.current = n + 1;
      const totalPages = page?.totalPages ?? 0;
      const lastFlag = page?.last;
      const hasMore =
        lastFlag === false ||
        (lastFlag === undefined && totalPages > 0 && n < totalPages - 1);
      setAuditHasMore(hasMore);
    } catch {
      if (reset) {
        setAuditLog([]);
        setAuditTotalElements(null);
      }
      setAuditHasMore(false);
    } finally {
      setAuditLogLoading(false);
      setAuditLogLoadingMore(false);
    }
  };

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
      setSurveyAccessEnabled(data.surveyAccessEnabled ?? true);
      setSurveyAccessPassword('');
      setSurveyAccessPasswordConfirm('');
      await fetchAuditLog(true);
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

  /** Human-readable list of every difference vs last-loaded config; empty if nothing to save. */
  const getPendingChangeDescriptions = (): string[] => {
    const changes: string[] = [];
    if (!config) return changes;

    const wasEnrollmentActive = config.isEnrollmentActive ?? true;
    if (isEnrollmentActive !== wasEnrollmentActive) {
      changes.push(
        isEnrollmentActive
          ? 'Enrollment will be opened—new participants will be able to enroll again.'
          : 'Enrollment will be closed—new participants will not be able to enroll.'
      );
    }

    const wasSurveyGateOn = config.surveyAccessEnabled ?? true;
    if (surveyAccessEnabled !== wasSurveyGateOn) {
      changes.push(
        surveyAccessEnabled
          ? 'The survey access password requirement will be turned on.'
          : 'The survey access password requirement will be turned off.'
      );
    }

    if (surveyAccessPassword.trim().length > 0) {
      changes.push('The survey access password will be updated.');
    }

    const oldMax: number | null = config.maxParticipants ?? null;
    const newMaxVal: number | null =
      maxParticipants.trim() === '' ? null : parseInt(maxParticipants, 10);

    if (oldMax !== newMaxVal) {
      if (oldMax === null && newMaxVal !== null && !isNaN(newMaxVal)) {
        changes.push(`Maximum participants will be set to ${newMaxVal} (switch from unlimited to a cap).`);
      } else if (oldMax !== null && newMaxVal === null) {
        changes.push(`Maximum participants will be set to unlimited (was ${oldMax}).`);
      } else if (
        oldMax !== null &&
        newMaxVal !== null &&
        !isNaN(newMaxVal) &&
        oldMax !== newMaxVal
      ) {
        changes.push(`Maximum participants will change from ${oldMax} to ${newMaxVal}.`);
      }
    }

    return changes;
  };

  const runSave = async () => {
    const maxParticipantsValue = maxParticipants.trim() === '' ? null : parseInt(maxParticipants, 10);
    const updated = await api.updateEnrollmentConfig(
      maxParticipantsValue,
      isEnrollmentActive,
      surveyAccessEnabled,
      surveyAccessPassword.trim() || undefined
    );
    setConfig(updated);
    setSurveyAccessPassword('');
    setSurveyAccessPasswordConfirm('');
    setMessage({ type: 'success', text: 'Enrollment settings updated successfully!' });
    await fetchAuditLog(true);
  };

  const handleSave = async () => {
    setMessage(null);

    const maxParticipantsValue = maxParticipants.trim() === '' ? null : parseInt(maxParticipants, 10);

    if (maxParticipantsValue !== null && (isNaN(maxParticipantsValue) || maxParticipantsValue < 1)) {
      setMessage({ type: 'error', text: 'Maximum participants must be at least 1, or leave empty for unlimited' });
      return;
    }

    if (maxParticipantsValue !== null && maxParticipantsValue < (config?.currentCount || 0)) {
      setMessage({
        type: 'error',
        text: `Cannot set maximum participants to ${maxParticipantsValue}. Current enrollment is ${config?.currentCount || 0}. Please set a limit of at least ${config?.currentCount || 0} or delete some participants first.`,
      });
      return;
    }

    const newPwd = surveyAccessPassword.trim();
    if (newPwd.length > 0) {
      if (newPwd.length < MIN_SURVEY_PASSWORD_LEN) {
        setMessage({ type: 'error', text: `Survey access password must be at least ${MIN_SURVEY_PASSWORD_LEN} characters.` });
        return;
      }
      if (newPwd !== surveyAccessPasswordConfirm.trim()) {
        setMessage({ type: 'error', text: 'Survey access passwords do not match. Please re-enter them.' });
        return;
      }
    } else if (surveyAccessPasswordConfirm.trim().length > 0) {
      setMessage({ type: 'error', text: 'Clear the confirm field or enter the new password in both fields.' });
      return;
    }

    const changes = getPendingChangeDescriptions();
    if (changes.length === 0) {
      setMessage({
        type: 'success',
        text: 'Everything is already saved. No changes to apply.',
      });
      return;
    }

    setPendingConfirmReasons(changes);
    setConfirmPhraseInput('');
    setConfirmError(null);
    setConfirmModalOpen(true);
  };

  const handleConfirmModalSubmit = async () => {
    if (confirmPhraseInput.trim().toUpperCase() !== CONFIRM_PHRASE) {
      setConfirmError(`Type ${CONFIRM_PHRASE} in capital letters to confirm.`);
      return;
    }
    setConfirmError(null);
    setConfirmModalOpen(false);
    setPendingConfirmReasons([]);
    setConfirmPhraseInput('');
    try {
      setSaving(true);
      await runSave();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update enrollment configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmModalCancel = () => {
    setConfirmModalOpen(false);
    setConfirmPhraseInput('');
    setConfirmError(null);
    setPendingConfirmReasons([]);
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
            <div className="relative">
              <input
                type={showAccessPassword ? 'text' : 'password'}
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && accessPassword.trim() && !unlocking) {
                    handleUnlockAccess();
                  }
                }}
                className="w-full px-4 py-3 pr-12 text-slate-800 placeholder:text-slate-400 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-0 focus:border-blue-600 transition-colors duration-150"
                placeholder="Enter enrollment settings password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowAccessPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                aria-label={showAccessPassword ? 'Hide password' : 'Show password'}
              >
                {showAccessPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
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

                {/* Survey Access Password Gate */}
                <div className="pt-4 border-t border-gray-200 space-y-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={surveyAccessEnabled}
                      onChange={(e) => setSurveyAccessEnabled(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Require Survey Access Password</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-8">
                    When enabled, participants must enter a study password before accessing survey enrollment.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New survey access password
                      </label>
                      <div className="relative">
                        <input
                          type={showSurveyAccessPassword ? 'text' : 'password'}
                          value={surveyAccessPassword}
                          onChange={(e) => setSurveyAccessPassword(e.target.value)}
                          placeholder={config?.hasSurveyAccessPassword ? 'Leave blank to keep current password' : 'Enter new password'}
                          autoComplete="new-password"
                          className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSurveyAccessPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-800 rounded-md hover:bg-gray-100"
                          aria-label={showSurveyAccessPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSurveyAccessPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm new password
                      </label>
                      <div className="relative">
                        <input
                          type={showSurveyAccessPasswordConfirm ? 'text' : 'password'}
                          value={surveyAccessPasswordConfirm}
                          onChange={(e) => setSurveyAccessPasswordConfirm(e.target.value)}
                          placeholder="Re-enter new password"
                          autoComplete="new-password"
                          className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSurveyAccessPasswordConfirm((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-800 rounded-md hover:bg-gray-100"
                          aria-label={showSurveyAccessPasswordConfirm ? 'Hide password' : 'Show password'}
                        >
                          {showSurveyAccessPasswordConfirm ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Minimum {MIN_SURVEY_PASSWORD_LEN} characters. Leave both fields blank to keep the existing password.
                    </p>
                  </div>
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

            {/* Enrollment change history */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Change history</h2>
              <p className="text-sm text-gray-500 mb-4">
                Logged when settings are saved. Survey passwords are never stored—only that a new password was set.
              </p>
              {auditLogLoading ? (
                <p className="text-sm text-gray-500">Loading history…</p>
              ) : auditLog.length === 0 ? (
                <p className="text-sm text-gray-500">No changes recorded yet.</p>
              ) : (
                <>
                  {auditTotalElements != null && (
                    <p className="text-xs text-gray-500 mb-2">
                      Showing {auditLog.length} of {auditTotalElements}{' '}
                      {auditTotalElements === 1 ? 'entry' : 'entries'}
                    </p>
                  )}
                  <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                    {auditLog.map((entry) => (
                      <li key={entry.id} className="px-4 py-3 bg-white">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-xs font-medium text-gray-500">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-600">{entry.actorUsername}</span>
                        </div>
                        <p className="text-sm text-gray-800 mt-1">{entry.summary}</p>
                      </li>
                    ))}
                  </ul>
                  {auditHasMore && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => fetchAuditLog(false)}
                        disabled={auditLogLoadingMore}
                        className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {auditLogLoadingMore ? 'Loading…' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
      )}

      {confirmModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="enrollment-confirm-title">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200 p-6">
            <h3 id="enrollment-confirm-title" className="text-lg font-semibold text-gray-900 mb-2">
              Confirm changes
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              You are about to apply the following:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-800 space-y-1 mb-4">
              {pendingConfirmReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <p className="text-sm text-gray-700 mb-2">
              Type <span className="font-mono font-semibold text-gray-900">{CONFIRM_PHRASE}</span> to continue:
            </p>
            <input
              type="text"
              value={confirmPhraseInput}
              onChange={(e) => {
                setConfirmPhraseInput(e.target.value);
                setConfirmError(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
              autoFocus
            />
            {confirmError && <p className="mt-2 text-sm text-red-600">{confirmError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleConfirmModalCancel}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModalSubmit}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Confirm and save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default EnrollmentManagement;

