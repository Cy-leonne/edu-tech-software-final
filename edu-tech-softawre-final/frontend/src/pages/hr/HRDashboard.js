
import React from 'react';
import { Box, Typography, Paper, Stack, Grid, Card, CardContent, Button, Chip } from '@mui/material';
import {
  DashboardCustomize,
  Badge,
  EventNote,
  AccessTime,
  AccountBalanceWallet,
  Healing,
  WorkOutline,
  HowToReg,
  Assessment,
  School,
  Description,
  SelfImprovement,
  Groups,
  Campaign,
  SupportAgent,
  BarChart,
  FactCheck,
  DevicesOther,
  ReceiptLong,
} from '@mui/icons-material';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authLogout } from '../../redux/userRelated/userSlice';
import DataExportButton from '../../components/DataExportButton';
import EmployeeDashboard from './EmployeeDashboard';
import EmployeeProfilesPage from './EmployeeProfilesPage';
import EmployeePayrollInfo from './EmployeePayrollInfo';
import HRAccountantCommunication from './HRAccountantCommunication';
import LeaveManagement from './LeaveManagement';
import AttendanceTracking from './AttendanceTracking';
import PayrollAccess from './PayrollAccess';
import BenefitsManagement from './BenefitsManagement';
import Recruitment from './Recruitment';
import Onboarding from './Onboarding';
import PerformanceManagement from './PerformanceManagement';
import LearningDevelopment from './LearningDevelopment';
import DocumentManagement from './DocumentManagement';
import EmployeeSelfService from './EmployeeSelfService';
import ManagerSelfService from './ManagerSelfService';
import ExpenseClaims from './ExpenseClaims';
import AssetManagement from './AssetManagement';
import OrganizationDirectory from './OrganizationDirectory';
import InternalCommunication from './InternalCommunication';
import SupportDesk from './SupportDesk';
import ReportsAnalytics from './ReportsAnalytics';
import Compliance from './Compliance';

const moduleDefinitions = [
  { title: 'Employee Dashboard', description: 'Personalized homepage with announcements, tasks, and quick links.', path: 'dashboard', icon: <DashboardCustomize color="primary" /> },
  { title: 'Employee Profiles', description: 'Personal details, emergency contacts, job information, and documents.', path: 'profiles', icon: <Badge color="primary" /> },
  { title: 'Employee Payroll Info', description: 'View employee payroll details, salary information, and payment history.', path: 'payroll-info', icon: <AccountBalanceWallet color="primary" /> },
  { title: 'HR-Accountant Communication', description: 'Send messages, track payments, and collaborate with accounting staff.', path: 'communication', icon: <Campaign color="primary" /> },
  { title: 'Leave Management', description: 'Apply for leave, approvals, balances, and holiday calendars.', path: 'leave', icon: <EventNote color="primary" /> },
  { title: 'Attendance & Time Tracking', description: 'Clock in/out, timesheets, overtime, and attendance reports.', path: 'attendance', icon: <AccessTime color="primary" /> },
  { title: 'Payroll Access', description: 'Payslips, tax forms, salary history, and payment information.', path: 'payroll', icon: <AccountBalanceWallet color="primary" /> },
  { title: 'Benefits Management', description: 'Health insurance, pension, allowances, and benefits enrollment.', path: 'benefits', icon: <Healing color="primary" /> },
  { title: 'Recruitment', description: 'Job postings, applications, interviews, and candidate tracking.', path: 'recruitment', icon: <WorkOutline color="primary" /> },
  { title: 'Onboarding', description: 'New hire checklists, documents, and orientation materials.', path: 'onboarding', icon: <HowToReg color="primary" /> },
  { title: 'Performance Management', description: 'Goals, appraisals, feedback, and evaluations.', path: 'performance', icon: <Assessment color="primary" /> },
  { title: 'Learning & Development', description: 'Training, certifications, and learning progress.', path: 'learning', icon: <School color="primary" /> },
  { title: 'Document Management', description: 'Policies, contracts, handbooks, and forms.', path: 'documents', icon: <Description color="primary" /> },
  { title: 'Employee Self-Service', description: 'Update personal info, bank details, and contacts.', path: 'self-service', icon: <SelfImprovement color="primary" /> },
  { title: 'Manager Self-Service', description: 'Approve requests, manage teams, and review attendance.', path: 'manager-self-service', icon: <Groups color="primary" /> },
  { title: 'Expense Claims', description: 'Submit, approve, and track reimbursements.', path: 'expenses', icon: <ReceiptLong color="primary" /> },
  { title: 'Asset Management', description: 'Track laptops, phones, IDs, and equipment.', path: 'assets', icon: <DevicesOther color="primary" /> },
  { title: 'Organization Directory', description: 'Search employees, departments, roles, and contact details.', path: 'directory', icon: <Groups color="primary" /> },
  { title: 'Internal Communication', description: 'Company news, announcements, and messaging.', path: 'communications', icon: <Campaign color="primary" /> },
  { title: 'Help Desk / HR Support', description: 'Submit support tickets, FAQs, and live support.', path: 'support', icon: <SupportAgent color="primary" /> },
  { title: 'Reports & Analytics', description: 'Workforce statistics, turnover, leave trends, and HR metrics.', path: 'reports', icon: <BarChart color="primary" /> },
  { title: 'Compliance', description: 'Policy acknowledgments, training, and audit logs.', path: 'compliance', icon: <FactCheck color="primary" /> },
];

const ModuleDetail = ({ title, description, bullets }) => (
  <Paper sx={{ p: 3, borderRadius: 3 }}>
    <Typography variant="h5" sx={{ mb: 1 }}>{title}</Typography>
    <Typography color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>
    <Stack spacing={1}>
      {bullets.map((bullet) => (
        <Typography key={bullet} variant="body1">• {bullet}</Typography>
      ))}
    </Stack>
  </Paper>
);

const HRDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(authLogout());
    navigate('/');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" sx={{ mb: 1 }}>HR Portal</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Manage people operations, employee information, leave, attendance, payroll, recruitment, and compliance from one workspace.
      </Typography>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button component={Link} to="" variant="contained">Overview</Button>
          <Button component={Link} to="profiles" variant="outlined">Profiles</Button>
          <Button component={Link} to="payroll-info" variant="outlined">Payroll Info</Button>
          <Button component={Link} to="communication" variant="outlined">Communication</Button>
          <Button component={Link} to="leave" variant="outlined">Leave</Button>
          <Button component={Link} to="attendance" variant="outlined">Attendance</Button>
          <Button component={Link} to="payroll" variant="outlined">Payroll</Button>
          <Button component={Link} to="recruitment" variant="outlined">Recruitment</Button>
          <Button component={Link} to="reports" variant="outlined">Reports</Button>
          <Button variant="contained" color="error" onClick={handleLogout}>Logout</Button>
        </Stack>
      </Paper>

      <DataExportButton endpoint="/Exports/HRData" filename="hr-data.csv" label="Download HR Data" />
      <Routes>
        <Route index element={<AttendanceTracking />} />

        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="profiles" element={<EmployeeProfilesPage />} />
        <Route path="payroll-info" element={<EmployeePayrollInfo />} />
        <Route path="communication" element={<HRAccountantCommunication />} />
        <Route path="leave" element={<LeaveManagement />} />
        <Route path="attendance" element={<AttendanceTracking />} />
        <Route path="payroll" element={<PayrollAccess />} />
        <Route path="benefits" element={<BenefitsManagement />} />
        <Route path="recruitment" element={<Recruitment />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="performance" element={<PerformanceManagement />} />
        <Route path="learning" element={<LearningDevelopment />} />
        <Route path="documents" element={<DocumentManagement />} />
        <Route path="self-service" element={<EmployeeSelfService />} />
        <Route path="manager-self-service" element={<ManagerSelfService />} />
        <Route path="expenses" element={<ExpenseClaims />} />
        <Route path="assets" element={<AssetManagement />} />
        <Route path="directory" element={<OrganizationDirectory />} />
        <Route path="communications" element={<InternalCommunication />} />
        <Route path="support" element={<SupportDesk />} />
        <Route path="reports" element={<ReportsAnalytics />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="*" element={<Navigate to="/HR" replace />} />
      </Routes>
    </Box>
  );
};

export default HRDashboard;
