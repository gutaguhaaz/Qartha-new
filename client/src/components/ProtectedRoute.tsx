
import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'wouter';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Save current location for redirect after login
        sessionStorage.setItem('redirect_to', location);
        setLocation('/login');
      } else if (requireAdmin && !isAdmin) {
        // User is authenticated but not admin
        setLocation('/403');
      }
    }
  }, [user, loading, location, setLocation, requireAdmin, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (requireAdmin && !isAdmin) {
    return null; // Will redirect to 403
  }

  return <>{children}</>;
};

export default ProtectedRoute;
