// src/routes/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem('adminToken');
  
  // If no token exists, redirect to login
  if (!token) {
    return <Navigate to="/admin-login" replace />;
  }

  // Verify token format (basic check)
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      localStorage.removeItem('adminToken');
      return <Navigate to="/admin-login?expired=true" replace />;
    }

    // Check token expiration if it's a JWT
    const payload = JSON.parse(atob(tokenParts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('adminToken');
      return <Navigate to="/admin-login?expired=true" replace />;
    }
  } catch (error) {
    // If token is malformed or can't be decoded
    localStorage.removeItem('adminToken');
    return <Navigate to="/admin-login?expired=true" replace />;
  }

  return children;
}
