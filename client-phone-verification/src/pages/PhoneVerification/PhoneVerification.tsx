// src/pages/PhoneVerification/PhoneVerification.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useVerification } from '../../contexts/VerificationProvider';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

const PhoneVerification: React.FC = () => {
  const { setIsVerified, phoneNumber, email } = useVerification();
  const navigate = useNavigate();

  const [step, setStep] = useState<'sendCode' | 'enterCode' | 'done'>('sendCode');
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(6).fill(''));
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const [phoneNumberError, setPhoneNumberError] = useState('');
  const [verificationError, setVerificationError] = useState('');

  const [showUsedModal, setShowUsedModal] = useState(false);
  const [resendResult, setResendResult] = useState('');

  const [assignedLink, setAssignedLink] = useState('');

  // Loading indicator state
  const [isLoading, setIsLoading] = useState(false);

  // Add state for notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Timer
  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | undefined;
    if (step === 'enterCode' && !canResend && timeLeft > 0) {
      timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [step, timeLeft, canResend]);

  // If no phoneNumber in context, redirect
  useEffect(() => {
    if (!phoneNumber) {
      navigate('/');
    }
  }, [phoneNumber, navigate]);

  // Format mm:ss
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/survey', { state: { goToContact: true } });
  };

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // ----------------------
  // STEP 1: "Send Code"
  // ----------------------
  const handleSendCode = async () => {
    setPhoneNumberError('');
    setVerificationError('');
    setShowUsedModal(false);
    setResendResult('');
    setIsLoading(true);

    if (!phoneNumber || phoneNumber.length !== 10) {
      setPhoneNumberError('Please enter a valid 10-digit US phone number.');
      setIsLoading(false);
      return;
    }

    try {
      // Start OTP flow - this includes phone validation
      const data = await api.startOtp(phoneNumber);
      
      if (data.ok) {
        setStep('enterCode');
        setTimeLeft(60);
        setCanResend(false);
        setCodeDigits(Array(6).fill(''));
        showNotification('success', 'Verification code sent successfully!');
      } else {
        setPhoneNumberError(
          data.error || 
          'We were unable to send the verification code. Please check your phone number and try again.'
        );
        showNotification('error', 'Failed to send verification code. Please try again.');
      }
    } catch (error: any) {
      console.error('OTP start error:', error);
      setPhoneNumberError('Network error: Please check your connection and try again.');
      showNotification('error', error.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------
  // STEP 2: "Enter Code"
  // ----------------------
  const handleResendCode = async () => {
    setVerificationError('');
    setIsLoading(true);
    
    try {
      const data = await api.startOtp(phoneNumber);
      
      if (data.ok) {
        setTimeLeft(60);
        setCanResend(false);
        setCodeDigits(Array(6).fill(''));
        setVerificationError('A new code has been sent to your phone.');
        showNotification('success', 'New verification code sent!');
      } else {
        setVerificationError(
          data.error || 
          'Unable to send a new code. Please try again in a few minutes.'
        );
        showNotification('error', 'Failed to resend verification code');
      }
    } catch (error: any) {
      console.error('OTP resend error:', error);
      showNotification('error', error.message || 'Failed to resend verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const newCode = [...codeDigits];
    newCode[idx] = val;
    setCodeDigits(newCode);

    if (val && idx < codeDigits.length - 1) {
      const nextInput = document.getElementById(`otp-${idx + 1}`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerify = async () => {
    const code = codeDigits.join('');
    if (code.length < 6) {
      setVerificationError('Please enter all 6 digits.');
      showNotification('error', 'Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    
    try {
      const data = await api.checkOtp(phoneNumber, code, email, undefined);
      
      if (data.verified) {
        setIsVerified(true);
        
        // Send survey invitation
        try {
          const invitationData = await api.sendSurveyInvitation(phoneNumber);
          
          if (invitationData.ok) {
            setAssignedLink(invitationData.linkUrl || '');
            setStep('done');
            showNotification('success', 'Verification successful! Your survey link is ready.');
            
            // Survey link is automatically sent via SMS by the backend
            if (invitationData.linkUrl) {
              showNotification('success', 'Survey link sent via SMS!');
            }
          } else {
            setVerificationError(invitationData.error || 'Could not retrieve survey link.');
            showNotification('error', 'Could not retrieve survey link. Please try again.');
          }
        } catch (invitationError: any) {
          console.error('Survey invitation error:', invitationError);
          setVerificationError(`Error: ${invitationError.message}`);
          showNotification('error', 'Failed to get survey link. Please try again.');
        }
      } else {
        setVerificationError("That code didn't work. Try again or resend.");
        showNotification('error', 'Invalid verification code. Please try again.');
        setCodeDigits(Array(6).fill(''));
        const firstBox = document.getElementById('otp-0') as HTMLInputElement;
        if (firstBox) firstBox.focus();
      }
    } catch (error: any) {
      console.error('OTP check error:', error);
      setVerificationError(`Error: ${error.message}`);
      showNotification('error', error.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setStep('sendCode');
    setVerificationError('');
    setPhoneNumberError('');
    setTimeLeft(60);
    setCanResend(false);
    setCodeDigits(Array(6).fill(''));
  };

  // ----------------------
  // "Already Used" => Resend Link
  // ----------------------
  const handleResendLink = async () => {
    setResendResult('');
    setIsLoading(true);
    
    try {
      console.log('Resending link for phone:', phoneNumber);
      const data = await api.sendSurveyInvitation(phoneNumber);
      console.log('API response:', data);
      setResendResult(data.message || 'Survey link sent successfully!');
      setShowUsedModal(false);
      showNotification('success', 'Survey link sent successfully!');
    } catch (err: any) {
      console.error('Resend link error:', err);
      setResendResult('Server error: ' + (err.message || 'Failed to resend link'));
      showNotification('error', 'Failed to resend survey link');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------
  // RENDER STEPS
  // ----------------------
  if (step === 'sendCode' || step === 'enterCode') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        {/* Notification Toast */}
        {notification && (
          <div 
            className={`fixed top-4 right-4 max-w-md p-4 rounded-lg shadow-lg transform transition-all z-50
              ${notification.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' :
                notification.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
                'bg-blue-50 border-l-4 border-blue-500'}`}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                {notification.type === 'success' ? (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : notification.type === 'error' ? (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm ${
                  notification.type === 'success' ? 'text-green-700' :
                  notification.type === 'error' ? 'text-red-700' :
                  'text-blue-700'
                }`}>
                  {notification.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-md">
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
              <h2 className="text-2xl font-bold text-white text-center">
                Phone Verification
              </h2>
              <p className="text-blue-100 text-center mt-1">
                {step === 'sendCode' 
                  ? "We'll send a 6-digit code to verify your phone number"
                  : "Enter the 6-digit code we sent to your phone"}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8">
              {step === 'sendCode' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4">
                    <span className="text-lg font-medium text-gray-900">
                      +1 {phoneNumber}
                    </span>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          Standard message and data rates may apply. The code will expire in 10 minutes.
                        </p>
                      </div>
                    </div>
                  </div>

                  {phoneNumberError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{phoneNumberError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg 
                        hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] 
                        active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleSendCode}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending...' : 'Send Code'}
                    </button>
                    <button
                      type="button"
                      className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 
                        transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                        font-medium text-sm"
                      onClick={handleBack}
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center text-gray-600 mb-4">
                    <p>We sent a code to</p>
                    <p className="font-medium text-gray-900">+1 {phoneNumber}</p>
                  </div>

                  {/* OTP Input */}
                  <div className="flex justify-center gap-2">
                    {codeDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        id={`otp-${idx}`}
                        value={digit}
                        onChange={(e) => handleCodeChange(e, idx)}
                        maxLength={1}
                        className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg 
                          focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !digit && idx > 0) {
                            const prevInput = document.getElementById(`otp-${idx - 1}`) as HTMLInputElement;
                            if (prevInput) prevInput.focus();
                          }
                        }}
                      />
                    ))}
                  </div>

                  {/* Timer/Resend */}
                  <div className="text-center">
                    {!canResend ? (
                      <p className="text-gray-600">
                        Didn't receive it? You can request a new code in <span className="font-medium">{formatTime(timeLeft)}</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleResendCode}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Sending...' : 'Send a new code'}
                      </button>
                    )}
                  </div>

                  {verificationError && (
                    <div className={`border-l-4 p-4 rounded-md ${
                      verificationError.includes('new code has been sent') 
                        ? 'bg-green-50 border-green-500' 
                        : 'bg-red-50 border-red-500'
                    }`}>
                      <div className="flex">
                        <div className="flex-shrink-0">
                          {verificationError.includes('new code has been sent') ? (
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-3">
                          <p className={`text-sm ${
                            verificationError.includes('new code has been sent') 
                              ? 'text-green-700' 
                              : 'text-red-700'
                          }`}>
                            {verificationError}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg 
                        hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] 
                        active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleVerify}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Verifying...' : 'Verify'}
                    </button>
                    <button
                      type="button"
                      className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 
                        transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                        font-medium text-sm"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Used Modal */}
        {showUsedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md transform transition-all">
              {!resendResult ? (
                <>
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-t-xl px-6 py-4">
                    <h3 className="text-xl font-bold text-white">Number Already Used</h3>
                  </div>
                  <div className="p-6">
                    <div className="bg-yellow-50 rounded-lg p-4 mb-6">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">This phone number has already been used for verification.</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 
                          transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        onClick={() => setShowUsedModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg 
                          hover:from-yellow-600 hover:to-yellow-700 transition-colors focus:outline-none focus:ring-2 
                          focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleResendLink}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Sending...' : 'Resend Link'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-t-xl px-6 py-4">
                    <h3 className="text-xl font-bold text-white">Link Sent Successfully</h3>
                  </div>
                  <div className="p-6">
                    <div className="bg-green-50 rounded-lg p-4 mb-6">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-green-700">{resendResult}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg 
                        hover:from-green-600 hover:to-green-700 transition-colors focus:outline-none focus:ring-2 
                        focus:ring-green-500 focus:ring-offset-2"
                      onClick={() => {
                        setShowUsedModal(false);
                        navigate('/');
                      }}
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-700">Processing...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Final success step
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
            <h2 className="text-2xl font-bold text-white text-center">
              Verification Successful
            </h2>
            <p className="text-green-100 text-center mt-1">
              Your phone number has been verified
            </p>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            <div className="space-y-6">
              {assignedLink ? (
                <>
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-700">
                          {email ? 
                            `We've sent your unique survey link to ${email}` :
                            "Here's your unique survey link:"
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600 mb-2 text-sm font-medium">Your survey link:</p>
                    <a
                      href={assignedLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 break-all text-lg font-medium"
                    >
                      {assignedLink}
                    </a>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          Please note that your survey link is uniquely assigned to you. This personalized link allows you to pause and resume the survey at your convenience, ensuring that your responses are saved and you can continue from where you left off.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Your phone has been verified, but no survey link was available at this time. Please contact support at <a href="mailto:ai@networks.howard.edu" className="underline text-blue-700">ai@networks.howard.edu</a>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg 
                    hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-[1.02] 
                    active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                    font-medium text-sm"
                  onClick={() => navigate('/')}
                >
                  Done
                </button>
                {assignedLink && (
                  <a
                    href={assignedLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg 
                      hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] 
                      active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      font-medium text-sm"
                  >
                    Start Survey
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneVerification;