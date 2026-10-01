import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ requireRole }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && requireRole !== 'any') {
    if (requireRole === 'admin' && user.role !== 'admin' && user.role !== 'superadmin') {
      return <Navigate to="/unauthorized" replace />;
    }
    if (requireRole === 'superadmin' && user.role !== 'superadmin') {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
