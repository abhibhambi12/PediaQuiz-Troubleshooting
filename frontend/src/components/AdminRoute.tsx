// src/components/AdminRoute.tsx

import { Navigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import Loader from './Loader';

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user, authLoading } = useData();

  if (authLoading) {
    return <Loader message="Verifying permissions..." />;
  }

  if (!user) {
    // This should ideally not happen due to ProtectedRoute, but as a safeguard
    return <Navigate to="/auth" replace />;
  }

  if (!user.isAdmin) {
    // If user is not an admin, redirect them to the home page
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;