
import React, { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
const Homepage = lazy(() => import('./pages/Homepage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminRegisterPage = lazy(() => import('./pages/admin/AdminRegisterPage'));
const ChooseUser = lazy(() => import('./pages/ChooseUser'));
const ParentLogin = lazy(() => import('./pages/parent/ParentLogin'));
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'));
const ParentTimetable = lazy(() => import('./pages/parent/ParentTimetable'));
const PayFee = lazy(() => import('./pages/parent/PayFee'));
const PaymentHistory = lazy(() => import('./pages/parent/PaymentHistory'));
const AccountantDashboard = lazy(() => import('./pages/accountant/AccountantDashboard'));
const HRDashboard = lazy(() => import('./pages/hr/HRDashboard'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const AcceptancePage = lazy(() => import('./pages/AcceptancePage'));
const DpaPage = lazy(() => import('./pages/DpaPage'));
const EulaPage = lazy(() => import('./pages/EulaPage'));

const App = () => {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/choose" element={<ChooseUser visitor="normal" />} />
        <Route path="/chooseasguest" element={<ChooseUser visitor="guest" />} />

        <Route path="/Adminlogin" element={<LoginPage role="Admin" />} />
        <Route path="/Accountantlogin" element={<LoginPage role="Accountant" />} />
        <Route path="/HRlogin" element={<LoginPage role="HR" />} />
        <Route path="/SuperAdminlogin" element={<LoginPage role="SuperAdmin" />} />
        <Route path="/Studentlogin" element={<LoginPage role="Student" />} />
        <Route path="/Teacherlogin" element={<LoginPage role="Teacher" />} />
        <Route path="/Parent/login" element={<ParentLogin />} />
        
        <Route path="/Admin/forgot-password" element={<ForgotPasswordPage role="Admin" />} />
        <Route path="/SuperAdmin/forgot-password" element={<ForgotPasswordPage role="SuperAdmin" />} />
        <Route path="/Accountant/forgot-password" element={<ForgotPasswordPage role="Accountant" />} />
        <Route path="/HR/forgot-password" element={<ForgotPasswordPage role="HR" />} />
        <Route path="/Student/forgot-password" element={<ForgotPasswordPage role="Student" />} />
        <Route path="/Teacher/forgot-password" element={<ForgotPasswordPage role="Teacher" />} />
        <Route path="/Admin/reset-password/:token" element={<ResetPasswordPage role="Admin" />} />
        <Route path="/SuperAdmin/reset-password/:token" element={<ResetPasswordPage role="SuperAdmin" />} />
        <Route path="/Accountant/reset-password/:token" element={<ResetPasswordPage role="Accountant" />} />
        <Route path="/HR/reset-password/:token" element={<ResetPasswordPage role="HR" />} />
        <Route path="/Student/reset-password/:token" element={<ResetPasswordPage role="Student" />} />
        <Route path="/Teacher/reset-password/:token" element={<ResetPasswordPage role="Teacher" />} />
        
        <Route path="/Adminregister" element={<AdminRegisterPage role="Admin" />} />
        <Route path="/SuperAdminregister" element={<AdminRegisterPage role="SuperAdmin" />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/dpa" element={<DpaPage />} />
        <Route path="/eula" element={<EulaPage />} />
        <Route path="/acceptance" element={<AcceptancePage />} />

        <Route path="/Parent/dashboard" element={<ParentDashboard />} />
        <Route path="/Parent/pay-fee" element={<PayFee />} />
        <Route path="/Parent/payment-history" element={<PaymentHistory />} />
        <Route path="/Parent/timetable" element={<ParentTimetable />} />

        <Route path="/Admin/*" element={<AdminDashboard />} />
        <Route path="/Accountant/*" element={<AccountantDashboard />} />
        <Route path="/HR/*" element={<HRDashboard />} />
        <Route path="/Student/*" element={<StudentDashboard />} />
        <Route path="/Teacher/*" element={<TeacherDashboard />} />

        <Route path='*' element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
