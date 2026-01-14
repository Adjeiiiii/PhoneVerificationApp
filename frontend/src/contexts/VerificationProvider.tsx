import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

type VerificationContextType = {
  isVerified: boolean;
  setIsVerified: React.Dispatch<React.SetStateAction<boolean>>;
  phoneNumber: string;
  setPhoneNumber: React.Dispatch<React.SetStateAction<string>>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  // Step tracking
  hasConsented: boolean;
  setHasConsented: React.Dispatch<React.SetStateAction<boolean>>;
  hasCompletedSurvey: boolean;
  setHasCompletedSurvey: React.Dispatch<React.SetStateAction<boolean>>;
  hasProvidedContact: boolean;
  setHasProvidedContact: React.Dispatch<React.SetStateAction<boolean>>;
  resetProgress: () => void;
};

const VerificationContext = createContext<VerificationContextType | undefined>(undefined);

// Session storage keys
const STORAGE_KEYS = {
  CONSENTED: 'survey_consented',
  COMPLETED_SURVEY: 'survey_completed',
  PROVIDED_CONTACT: 'survey_contact_provided',
  PHONE: 'survey_phone',
  EMAIL: 'survey_email',
};

export function VerificationProvider({ children }: { children: ReactNode }) {
  // Load from sessionStorage on mount
  const [isVerified, setIsVerified] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEYS.PHONE) || '';
  });
  const [email, setEmail] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEYS.EMAIL) || '';
  });
  const [hasConsented, setHasConsented] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEYS.CONSENTED) === 'true';
  });
  const [hasCompletedSurvey, setHasCompletedSurvey] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEYS.COMPLETED_SURVEY) === 'true';
  });
  const [hasProvidedContact, setHasProvidedContact] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEYS.PROVIDED_CONTACT) === 'true';
  });

  // Sync to sessionStorage
  useEffect(() => {
    if (phoneNumber) {
      sessionStorage.setItem(STORAGE_KEYS.PHONE, phoneNumber);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.PHONE);
    }
  }, [phoneNumber]);

  useEffect(() => {
    if (email) {
      sessionStorage.setItem(STORAGE_KEYS.EMAIL, email);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.EMAIL);
    }
  }, [email]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.CONSENTED, hasConsented ? 'true' : 'false');
  }, [hasConsented]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.COMPLETED_SURVEY, hasCompletedSurvey ? 'true' : 'false');
  }, [hasCompletedSurvey]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.PROVIDED_CONTACT, hasProvidedContact ? 'true' : 'false');
  }, [hasProvidedContact]);

  const resetProgress = () => {
    setIsVerified(false);
    setPhoneNumber('');
    setEmail('');
    setHasConsented(false);
    setHasCompletedSurvey(false);
    setHasProvidedContact(false);
    // Clear sessionStorage
    Object.values(STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
  };

  return (
    <VerificationContext.Provider
      value={{
        isVerified,
        setIsVerified,
        phoneNumber,
        setPhoneNumber,
        email,
        setEmail,
        hasConsented,
        setHasConsented,
        hasCompletedSurvey,
        setHasCompletedSurvey,
        hasProvidedContact,
        setHasProvidedContact,
        resetProgress,
      }}
    >
      {children}
    </VerificationContext.Provider>
  );
}

export function useVerification() {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error('useVerification must be used within a VerificationProvider');
  }
  return context;
}
