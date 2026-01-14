import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import howardLogo from '../../assets/howard-logo.png';
import { api } from '../../utils/api';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [consentChecked, setConsentChecked] = useState(false);
  const [enrollmentFull, setEnrollmentFull] = useState(false);
  const [loadingEnrollment, setLoadingEnrollment] = useState(true);

  // Checkpoint 1: Check enrollment status on page load
  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        setLoadingEnrollment(true);
        const status = await api.getEnrollmentStatus();
        // Enrollment is blocked if it's full OR if enrollment is disabled
        setEnrollmentFull(status.isFull || !status.isEnrollmentActive);
      } catch (error) {
        console.error('Failed to check enrollment status:', error);
        // On error, allow enrollment (fail open)
        setEnrollmentFull(false);
      } finally {
        setLoadingEnrollment(false);
      }
    };
    checkEnrollment();
  }, []);

  const handleGetStarted = () => {
    if (consentChecked && !enrollmentFull) {
      navigate('/survey');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Centered Header with Howard Logo - Only show when enrollment is open */}
      {!loadingEnrollment && !enrollmentFull && (
        <div className="flex flex-col items-center gap-2 pt-10 pb-2">
          <img src={howardLogo} alt="Howard University" className="h-32 w-auto" />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Enrollment Full Message - Show only when enrollment is full/disabled */}
        {!loadingEnrollment && enrollmentFull ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden w-full max-w-2xl">
              <div className="p-8 md:p-10">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    Enrollment Currently Full
                  </h2>
                </div>
                <div className="space-y-4 text-center">
                  <p className="text-gray-700 text-lg leading-relaxed">
                    Thank you for your interest in participating in our research study. 
                    Unfortunately, we have reached our maximum number of participants for this study.
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    We appreciate your interest and encourage you to check back in the future.
                  </p>
                  <div className="pt-4 border-t border-gray-200 mt-6">
                    <p className="text-gray-600 text-sm">
                      If you have any questions, please contact us at{' '}
                      <a href="tel:+12404288442" className="text-blue-600 hover:text-blue-800 font-medium">
                        (240) 428-8442
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : loadingEnrollment ? (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 md:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Checking enrollment status...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Welcome Section */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8">
            <h1 className="text-3xl font-bold text-white text-center mb-4">
              Welcome to Our Research Study
            </h1>
            <p className="text-blue-100 text-center text-lg">
              Exploring AI in Healthcare Decision Making
            </p>
          </div>
          <div className="p-6 md:p-8">
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 mb-6">
                We are conducting an academic research study on how individuals use generative AI tools—such as ChatGPT—to seek and explore health-related information. Your input will contribute to ongoing research focused on improving how AI technologies support users in making informed health decisions.
              </p>
              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Study Leadership</h3>
                <p className="text-blue-800">
                  This study is led by researchers at Howard University.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Process Section */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-6">
            <h2 className="text-2xl font-bold text-white text-center">
              How It Works
            </h2>
          </div>
          <div className="p-6 md:p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-indigo-600 text-xl font-bold">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Complete Eligibility Questions</h3>
                <p className="text-gray-600">Just three short, simple questions to determine if you qualify</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-indigo-600 text-xl font-bold">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Verify Your Phone Number</h3>
                <p className="text-gray-600">Receive a one-time verification code via SMS</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-indigo-600 text-xl font-bold">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Take the Survey</h3>
                <p className="text-gray-600">Receive your unique survey link via SMS or email</p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-6">
            <h2 className="text-2xl font-bold text-white text-center">
              Your Privacy is Our Priority
            </h2>
          </div>
          <div className="p-6 md:p-8">
            <div className="space-y-4">
              <p className="text-gray-700 font-medium mb-4">
                Your phone number will only be used to:
              </p>
              <div className="space-y-3 ml-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-gray-700">
                    Send you a one-time verification code
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-gray-700">
                    Send you your personalized survey link
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-gray-700">
                    Send you your gift card reward upon survey completion
                  </p>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 mt-6">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-2 text-green-700">Your phone number will NOT be used for marketing or spam</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

            {/* Consent Section */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-6">
                <h2 className="text-2xl font-bold text-white text-center">
                  Consent to Receive Messages
                </h2>
              </div>
              <div className="p-6 md:p-8">
                <div className="space-y-4">
                  <p className="text-gray-700">
                    By submitting your phone number and checking the consent box below, you agree to receive SMS messages from the Healthcare AI Research Study for the following limited purposes:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-purple-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="ml-2 text-gray-700">A one-time verification code to confirm your number</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-purple-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="ml-2 text-gray-700">A unique link to your survey</span>
                    </li>
                  </ul>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-purple-800">
                      <span className="font-medium">📩</span> You will receive a verification code, survey link, and gift card information.
                    </p>
                    <p className="text-purple-800 mt-2">
                      <span className="font-medium">📴</span> You can opt out at any time by replying STOP to any message.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Consent Checkbox and Button */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 md:p-8">
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="consent"
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="consent" className="text-gray-700">
                        I consent to receive SMS messages from the Healthcare AI Research Study for the sole purposes of verifying my phone number and receiving a personalized survey link. I understand I can reply STOP to unsubscribe at any time. Msg & data rates may apply.
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleGetStarted}
                    disabled={!consentChecked}
                    className={`w-full px-6 py-3 rounded-lg text-white font-medium text-lg
                      ${consentChecked 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' 
                        : 'bg-gray-400 cursor-not-allowed'
                      } transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Support Section - Only show when enrollment is open */}
        {!loadingEnrollment && !enrollmentFull && (
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Need help? Contact our research support team at{' '}
              <a href="mailto:ai@networks.howard.edu" className="text-blue-600 hover:text-blue-800">
                ai@networks.howard.edu
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Landing; 