import React from 'react';
import { Navigate } from 'react-router-dom';

// Registration is now handled via SSO (Just-In-Time Provisioning)
// We redirect users to the Login page which initiates the SSO flow.
const RegisterPage: React.FC = () => {
  return <Navigate to="/login" replace />;
};

export default RegisterPage;
