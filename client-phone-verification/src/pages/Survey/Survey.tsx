// src/pages/Survey/Survey.tsx
import React, { useState, useEffect } from 'react';
import { useVerification } from '../../contexts/VerificationProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/api';

const Survey: React.FC = () => {
  const { setIsVerified, phoneNumber, setPhoneNumber, email, setEmail } = useVerification();
  const navigate = useNavigate();
  const location = useLocation();

  // Survey logic states
  const [usedAI, setUsedAI] = useState('');
  const [livesInUS, setLivesInUS] = useState('');
  const [isAdult, setIsAdult] = useState('');

  // Modals
  const [usedModal, setUsedModal] = useState(false);
  const [usedStage, setUsedStage] = useState<'initial' | 'success'>('initial');
  const [usedResendInfo, setUsedResendInfo] = useState('');
  const [showCarrierFailModal, setShowCarrierFailModal] = useState(false);
  const [showSurveyFailModal, setShowSurveyFailModal] = useState(false);
  const [showContactDetailsModal, setShowContactDetailsModal] = useState(false);
  const [showScreeningConfirmModal, setShowScreeningConfirmModal] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState<'screening' | 'contact'>('screening');

  const [phoneInput, setPhoneInput] = useState('');

  // ----------------------
  // Validation helpers
  // ----------------------

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setPhoneInput(value);
      setPhoneNumber(value);
    }
  };

  const isPhoneNumberValid = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10;
  };

  // ----------------------
  // Modal closers
  // ----------------------
  const handleCloseCarrierFail = () => {
    setShowCarrierFailModal(false);
    setPhoneNumber('');
    setPhoneInput('');
    setEmail('');
  };

  const handleCloseSurveyFail = () => {
    setShowSurveyFailModal(false);
    resetSurvey();
  };

  const resetSurvey = () => {
    setUsedAI('');
    setLivesInUS('');
    setIsAdult('');
    setPhoneNumber('');
    setPhoneInput('');
    setEmail('');
    setCurrentPage('screening');
  };

  // Add useEffect to clear email when component mounts
  useEffect(() => {
    setEmail('');
    // If coming from phone verification, go directly to contact info page
    if (location.state?.goToContact) {
      setCurrentPage('contact');
    }
  }, []);

  // ----------------------
  // "Used" modal logic
  // ----------------------
  const handleUsedResendLink = async () => {
    setUsedResendInfo('');
    try {
      // Ensure we have a valid phone number before sending
      if (!phoneNumber || !isPhoneNumberValid(phoneNumber)) {
        setUsedResendInfo('Error: Invalid phone number. Please try again.');
        setUsedStage('success');
        return;
      }
      
      console.log('Resending link for phone:', phoneNumber);
      console.log('Phone number length:', phoneNumber.length);
      console.log('Phone number digits only:', phoneNumber.replace(/\D/g, ''));
      const data = await api.sendSurveyInvitation(phoneNumber);
      console.log('API response:', data);
      setUsedResendInfo(data.message || 'Survey link sent successfully!');
      setUsedStage('success');
    } catch (err: any) {
      console.error('Resend link error:', err);
      setUsedResendInfo('Server error: ' + (err.message || 'Failed to resend link'));
      setUsedStage('success');
    }
  };

  const handleUsedClose = () => {
    setUsedStage('initial');
    setUsedResendInfo('');
    setUsedModal(false);
    resetSurvey();
  };

  // ----------------------
  // Navigation logic
  // ----------------------
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /\S+@\S+\.\S+/;
    return emailRegex.test(email);
  };

  const handleNextStep = async () => {
    setErrorMessage(''); // Clear any previous errors
    if (currentPage === 'screening') {
      // Validate screening answers
      if (!usedAI || !livesInUS || !isAdult) {
        setErrorMessage('Please answer all questions');
        return;
      }
      const answers = [usedAI, livesInUS, isAdult];
      if (answers.includes('no')) {
        setShowSurveyFailModal(true);
        return;
      }
      setCurrentPage('contact');
    } else {
      // Validate contact information
      if (!phoneNumber) {
        setErrorMessage('Phone number is required');
        return;
      }
      
      if (!isPhoneNumberValid(phoneNumber)) {
        setErrorMessage('Please enter a complete 10-digit phone number');
        return;
      }
      if (email && !isValidEmail(email)) {
        setErrorMessage('Please enter a valid email address');
        return;
      }

      // Check if phone number is already verified
      try {
        const verificationData = await api.checkVerification(phoneNumber);
        
        // If already verified, show the "already verified" modal
        if (verificationData.verified) {
          setUsedModal(true);
          return;
        }
      } catch (error: any) {
        // If check fails, continue with the flow
        console.log('Verification check:', error.message);
      }

      // Show confirmation modal before proceeding
      setShowContactDetailsModal(true);
    }
  };

  const handleBack = () => {
    if (currentPage === 'contact') {
      setCurrentPage('screening');
    } else {
      navigate('/');
    }
  };

  // ----------------------
  // Main button logic
  // ----------------------
  const handleScreeningConfirm = () => {
    setShowScreeningConfirmModal(false);
    const isEligible = (usedAI === 'yes' && livesInUS === 'yes' && isAdult === 'yes');
    if (!isEligible) {
      setShowSurveyFailModal(true);
      return;
    }
    setCurrentPage('contact');
  };

  const handleScreeningEdit = () => {
    setShowScreeningConfirmModal(false);
  };

  const handleConfirmContactDetails = () => {
    setShowContactDetailsModal(false);
    setIsVerified(false);
    navigate('/verify');
  };

  // ----------------------
  // Render
  // ----------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 
              ${currentPage === 'screening' 
                ? 'border-blue-600 bg-blue-600 text-white' 
                : 'border-blue-600 bg-white text-blue-600'}`}>
              1
            </div>
            <div className={`w-16 h-0.5 ${currentPage === 'screening' ? 'bg-gray-300' : 'bg-blue-600'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 
              ${currentPage === 'contact' 
                ? 'border-blue-600 bg-blue-600 text-white' 
                : 'border-blue-600 bg-white text-blue-600'}`}>
              2
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          {/* Card header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
            <h2 className="text-2xl font-bold text-white text-center">
              {currentPage === 'screening' ? 'Eligibility Screening' : 'Contact Information'}
            </h2>
            <p className="text-blue-100 text-center mt-1">
              {currentPage === 'screening' 
                ? 'Please answer the following questions to determine your eligibility'
                : 'Almost there! Please provide your contact details'}
            </p>
          </div>

          {/* Card content */}
          <div className="p-6 md:p-8">
            {currentPage === 'screening' ? (
              <div className="space-y-6">
                {/* Question 1 */}
                <div className="bg-gray-50 rounded-lg p-4 transition-all hover:shadow-md">
                  <p className="font-medium text-gray-800 mb-3">
                    Have you used generative AI for health-related queries?
                  </p>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        value="yes"
                        checked={usedAI === 'yes'}
                        onChange={() => setUsedAI('yes')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 group-hover:text-gray-900">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        value="no"
                        checked={usedAI === 'no'}
                        onChange={() => setUsedAI('no')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 group-hover:text-gray-900">No</span>
                    </label>
                  </div>
                </div>

                {/* Question 2 */}
                <div className="bg-gray-50 rounded-lg p-4 transition-all hover:shadow-md">
                  <p className="font-medium text-gray-800 mb-3">
                    Do you live in the US?
                  </p>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        value="yes"
                        checked={livesInUS === 'yes'}
                        onChange={() => setLivesInUS('yes')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 group-hover:text-gray-900">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        value="no"
                        checked={livesInUS === 'no'}
                        onChange={() => setLivesInUS('no')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 group-hover:text-gray-900">No</span>
                    </label>
                  </div>
                </div>

                {/* Question 3 */}
                <div className="bg-gray-50 rounded-lg p-4 transition-all hover:shadow-md">
                  <p className="font-medium text-gray-800 mb-3">
                    Are you 18 years of age or older?
                  </p>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        value="yes"
                        checked={isAdult === 'yes'}
                        onChange={() => setIsAdult('yes')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 group-hover:text-gray-900">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        value="no"
                        checked={isAdult === 'no'}
                        onChange={() => setIsAdult('no')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 group-hover:text-gray-900">No</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 
                      transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg 
                      hover:from-blue-700 hover:to-blue-800 transition-colors focus:outline-none focus:ring-2 
                      focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* New eligibility confirmation message */}
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-green-700">
                        You are eligible to participate in our study. We'd like to send you the survey link by text message and email. Please enter your 10-digit mobile phone number and email address below.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Opt-in message for Twilio compliance */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-4">
                  <p className="text-sm text-blue-800">
                    By providing your phone number, you agree to receive up to 2 text messages from the Healthcare AI Research Study for verification and survey delivery. Message and data rates may apply. Reply STOP to opt-out anytime.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        +1
                      </span>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="(555) 555-5555"
                        value={phoneInput}
                        onChange={handlePhoneNumberChange}
                        className="block w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        maxLength={10}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        required
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      We'll send the survey link to this number via text message.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-gray-500 text-xs">(optional)</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      If provided, we'll also send the survey link to this email address.
                    </p>
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <span className="font-medium">📧 Email Notice:</span> If you haven't received our email, kindly check your spam or junk folder.
                      </p>
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 
                      transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    disabled={!isPhoneNumberValid(phoneNumber)}
                    className={`px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 
                      focus:ring-blue-500 focus:ring-offset-2 ${
                        isPhoneNumberValid(phoneNumber)
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-gray-600 text-sm mt-6">
          Your privacy is important to us. All information will be kept confidential.
        </p>
      </div>

      {/* Enhanced modals */}
      {showScreeningConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md transform transition-all">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-xl px-6 py-4">
              <h3 className="text-xl font-bold text-white">Confirm Your Answers</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Used AI for Health?</span>
                  <span className="font-medium text-gray-900 capitalize">{usedAI}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Lives in US?</span>
                  <span className="font-medium text-gray-900 capitalize">{livesInUS}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">18 or older?</span>
                  <span className="font-medium text-gray-900 capitalize">{isAdult}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Please review your answers carefully. You won't be able to change them after confirmation.
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 
                    transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  onClick={handleScreeningEdit}
                >
                  Edit Answers
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg 
                    hover:from-blue-700 hover:to-blue-800 transition-colors focus:outline-none focus:ring-2 
                    focus:ring-blue-500 focus:ring-offset-2"
                  onClick={handleScreeningConfirm}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Confirmation Modal */}
      {showContactDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md transform transition-all">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-xl px-6 py-4">
              <h3 className="text-xl font-bold text-white">Please Review Your Information</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Mobile Phone Number</span>
                  <span className="font-medium text-gray-900">
                    {phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Email Address</span>
                  <span className="font-medium text-gray-900">{email || 'Not provided'}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Please review the information you provided to make sure it's correct. If you need to make any changes, 
                click "Edit." If everything looks good, click "Confirm" to proceed.
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 
                    transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  onClick={() => setShowContactDetailsModal(false)}
                >
                  Edit
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg 
                    hover:from-blue-700 hover:to-blue-800 transition-colors focus:outline-none focus:ring-2 
                    focus:ring-blue-500 focus:ring-offset-2"
                  onClick={handleConfirmContactDetails}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Already Used Modal */}
      {usedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md transform transition-all">
            {usedStage === 'initial' ? (
              <>
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-t-xl px-6 py-4">
                  <h3 className="text-xl font-bold text-white">Already Verified! 🎉</h3>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <div className="bg-green-50 rounded-lg p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-green-700 font-medium mb-2">
                            Great news! Your phone number is already verified.
                          </p>
                          <p className="text-sm text-green-600">
                            Would you like us to resend your survey link via SMS and email?
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 
                        transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      onClick={handleUsedClose}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg 
                        hover:from-green-600 hover:to-green-700 transition-colors focus:outline-none focus:ring-2 
                        focus:ring-green-500 focus:ring-offset-2"
                      onClick={handleUsedResendLink}
                    >
                      Resend Survey Link
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
                        <p className="text-sm text-green-700">{usedResendInfo}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg 
                      hover:from-green-600 hover:to-green-700 transition-colors focus:outline-none focus:ring-2 
                      focus:ring-green-500 focus:ring-offset-2"
                    onClick={handleUsedClose}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Already Failed Modal */}
      {showSurveyFailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md transform transition-all">
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-t-xl px-6 py-4">
              <h3 className="text-xl font-bold text-white">Not Eligible</h3>
            </div>
            <div className="p-6">
              <div className="bg-red-50 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      Thank you for your interest. Unfortunately, you do not meet the eligibility criteria for this survey.
                      Please contact our research team at <a href="mailto:ai@networks.howard.edu" className="underline text-blue-700">ai@networks.howard.edu</a> for any questions.
                    </p>
                  </div>
                </div>
              </div>
              <button
                className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg 
                  hover:from-red-700 hover:to-red-800 transition-colors focus:outline-none focus:ring-2 
                  focus:ring-red-500 focus:ring-offset-2"
                onClick={handleCloseSurveyFail}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Carrier Fail Modal */}
      {showCarrierFailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md transform transition-all">
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-t-xl px-6 py-4">
              <h3 className="text-xl font-bold text-white">Invalid Phone Number Type</h3>
            </div>
            <div className="p-6">
              <div className="bg-red-50 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      We can only accept mobile phone numbers from standard cellular carriers (such as Verizon, T-Mobile, AT&T, etc.).
                      VOIP and landline numbers are not supported.
                    </p>
                  </div>
                </div>
              </div>
              <button
                className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg 
                  hover:from-red-700 hover:to-red-800 transition-colors focus:outline-none focus:ring-2 
                  focus:ring-red-500 focus:ring-offset-2"
                onClick={handleCloseCarrierFail}
              >
                Try Different Number
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Survey;