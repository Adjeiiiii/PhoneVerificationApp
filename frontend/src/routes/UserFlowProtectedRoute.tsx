import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useVerification } from '../contexts/VerificationProvider';

interface UserFlowProtectedRouteProps {
  children: React.ReactNode;
  requiredStep: 'screening' | 'contact' | 'verification';
}

export function UserFlowProtectedRoute({ children, requiredStep }: UserFlowProtectedRouteProps) {
  const { phoneNumber, email } = useVerification();
  const location = useLocation();

  // Define the flow order
  const flowOrder = {
    screening: 1,
    contact: 2,
    verification: 3
  };

  // Get the current step based on the URL
  const getCurrentStep = () => {
    if (location.pathname === '/') return 'screening';
    if (location.pathname === '/verify') return 'verification';
    return 'contact';
  };

  const currentStep = getCurrentStep();

  // Check if the user has completed the required steps
  const hasCompletedRequiredSteps = () => {
    if (requiredStep === 'screening') return true; // Screening is always accessible
    if (requiredStep === 'contact') return phoneNumber !== ''; // Contact requires screening
    if (requiredStep === 'verification') return phoneNumber !== '' && email !== ''; // Verification requires contact
    return false;
  };

  // Check if the user is trying to access a step out of order
  const isAccessingOutOfOrder = flowOrder[currentStep] > flowOrder[requiredStep];

  if (!hasCompletedRequiredSteps() || isAccessingOutOfOrder) {
    // Redirect to the appropriate step
    if (!phoneNumber) {
      return <Navigate to="/" replace />;
    }
    if (!email && requiredStep === 'verification') {
      return <Navigate to="/" replace state={{ from: location }} />;
    }
  }

  return children;
} 