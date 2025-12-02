// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { VerificationProvider } from './contexts/VerificationProvider';

// Pages
import Survey from './pages/Survey/Survey';
import PhoneVerification from './pages/PhoneVerification/PhoneVerification';
import Landing from './pages/Landing/Landing';

// Admin pages
import AdminLogin from './pages/AdminLogin/AdminLogin';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import AdminDBOps from './pages/AdminDBOps/AdminDBOps';
import GiftCardManagement from './pages/GiftCardManagement/GiftCardManagement';

// Protected Routes
import { ProtectedRoute } from './routes/ProtectedRoute';

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-800">
      <VerificationProvider>
        <Router>
          <div className="flex-1">
            <Routes>
              {/* Public user flow */}
              <Route path="/" element={<Landing />} />
              <Route path="/survey" element={<Survey />} />
              <Route path="/verify" element={<PhoneVerification />} />

              {/* Admin flow */}
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route 
                path="/admin-dashboard" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin-ops" 
                element={
                  <ProtectedRoute>
                    <AdminDBOps />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin-gift-cards" 
                element={
                  <ProtectedRoute>
                    <GiftCardManagement />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </Router>
      </VerificationProvider>
    </div>
  );
}

export default App;
