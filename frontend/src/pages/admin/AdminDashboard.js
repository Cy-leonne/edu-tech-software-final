import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
    CssBaseline,
    Box,
    Toolbar,
    List,
    Typography,
    Divider,
    IconButton,
    useMediaQuery,
    useTheme,
    Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppBar, Drawer } from '../../components/styles';
import Logout from '../Logout';
import SideBar from './SideBar';
import AdminProfile from './AdminProfile';
import AdminHomePage from './AdminHomePage';
import AdminApprovePage from './AdminApprovePage';
import SuperAdminDashboard from './SuperAdminDashboard';

import AddStudent from './studentRelated/AddStudent';
import SeeComplains from './studentRelated/SeeComplains';
import ShowStudents from './studentRelated/ShowStudents';
import StudentAttendance from './studentRelated/StudentAttendance';
import StudentExamMarks from './studentRelated/StudentExamMarks';
import ViewStudent from './studentRelated/ViewStudent';

import AddNotice from './noticeRelated/AddNotice';
import ShowNotices from './noticeRelated/ShowNotices';

import SendMessage from './messageRelated/SendMessage';
import MessageHistory from './messageRelated/MessageHistory';

import ShowSubjects from './subjectRelated/ShowSubjects';
import SubjectForm from './subjectRelated/SubjectForm';
import ViewSubject from './subjectRelated/ViewSubject';

import AddTeacher from './teacherRelated/AddTeacher';
import ChooseClass from './teacherRelated/ChooseClass';
import ChooseSubject from './teacherRelated/ChooseSubject';
import ShowTeachers from './teacherRelated/ShowTeachers';
import TeacherDetails from './teacherRelated/TeacherDetails';

import AddAccountant from './financeRelated/AddAccountant';
import ShowAccountants from './financeRelated/ShowAccountants';
import SalaryApprovalsPage from './financeRelated/SalaryApprovalsPage';
import AddHR from './hrRelated/AddHR';
import ShowHR from './hrRelated/ShowHR';

import AcademicReport from './reports/AcademicReport';
import FinancialReport from './reports/FinancialReport';
import AddClass from './classRelated/AddClass';
import ClassDetails from './classRelated/ClassDetails';
import ShowClasses from './classRelated/ShowClasses';
import AcademicCalendarPage from './AcademicCalendarPage';
import GradingSettingsPage from './GradingSettingsPage';
import SchoolPoliciesPage from './SchoolPoliciesPage';
import CommunicationLogPage from './CommunicationLogPage';
import AdminSettingsPage from './AdminSettingsPage';
import SettingsDashboard from './settings/SettingsDashboard';
import SettingsCategoryPage from './settings/SettingsCategoryPage';
import SystemLogsPage from './SystemLogsPage';
import MonitoringPage from './MonitoringPage';
import SchoolSubscriptionsPage from './SchoolSubscriptionsPage';
import AccountMenu from '../../components/AccountMenu';

/**
 * Administrative shell.
 *
 * `basePath` lets the portal be served from `/admin` (the documented entry
 * point that is not advertised in the public navigation) while `/Admin/*`
 * continues to work for existing bookmarks, emails and in-app links.
 *
 * IMPORTANT: this is presentation only – all administrative API endpoints
 * enforce authentication, role and school scoping on the server.
 */
const AdminDashboard = ({ basePath = '/Admin' }) => {
    const [open, setOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { currentRole } = useSelector((state) => state.user);
    const isSuperAdmin = currentRole === 'SuperAdmin';
    const canViewSystemLogs = isSuperAdmin || currentRole === 'Admin';

    const toggleDrawer = () => {
        setOpen(!open);
    };

    const closeDrawerOnMobile = () => {
        if (isMobile) setOpen(false);
    };

    return (
        <>
            <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', maxWidth: '100%' }}>
                <CssBaseline />
                <AppBar open={open} position='absolute' sx={{ backgroundColor: isSuperAdmin ? '#b71c1c' : undefined }}>
                    <Toolbar sx={{ gap: 1, pr: { xs: 1, sm: 2 } }}>
                        <Tooltip title={open ? 'Hide navigation' : 'Show navigation'}>
                            <IconButton
                                edge="start"
                                color="inherit"
                                aria-label={open ? 'hide navigation' : 'show navigation'}
                                onClick={toggleDrawer}
                                sx={{
                                    mr: { xs: 1, sm: 2, md: 3 },
                                    ...(open && { display: 'none' }),
                                }}
                            >
                                <MenuIcon />
                            </IconButton>
                        </Tooltip>
                        <Typography
                            component="h1"
                            variant="h6"
                            color="inherit"
                            noWrap
                            sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                            {isSuperAdmin ? 'SuperAdmin Dashboard' : 'Admin Dashboard'}
                        </Typography>
                        <AccountMenu />
                    </Toolbar>
                </AppBar>
                <Drawer variant="permanent" open={open} sx={open ? styles.drawerStyled : styles.hideDrawer}>
                    <Toolbar sx={styles.toolBarStyled}>
                        <IconButton onClick={toggleDrawer} aria-label="Hide navigation">
                            <ChevronLeftIcon />
                        </IconButton>
                    </Toolbar>
                    <Divider />
                    <List component="nav">
                        <SideBar basePath={basePath} onNavigate={closeDrawerOnMobile} />
                    </List>
                </Drawer>
                <Box component="main" sx={styles.boxStyled}>
                    <Toolbar />
                    <Routes>
                        <Route path="/" element={isSuperAdmin ? <SuperAdminDashboard /> : <AdminHomePage />} />
                        <Route path="dashboard" element={isSuperAdmin ? <SuperAdminDashboard /> : <AdminHomePage />} />
                        <Route path="profile" element={<AdminProfile />} />
                        <Route path="complains" element={<SeeComplains />} />

                        {/* Notice */}
                        <Route path="addnotice" element={<AddNotice />} />
                        <Route path="notices" element={<ShowNotices />} />

                        {/* Messages */}
                        <Route path="messages" element={<MessageHistory />} />
                        <Route path="messages/send" element={<SendMessage />} />
                        <Route path="communications" element={<CommunicationLogPage />} />

                        {/* Subject */}
                        <Route path="subjects" element={<ShowSubjects />} />
                        <Route path="subjects/subject/:classID/:subjectID" element={<ViewSubject />} />
                        <Route path="subjects/chooseclass" element={<ChooseClass situation="Subject" />} />

                        <Route path="addsubject/:id" element={<SubjectForm />} />
                        <Route path="class/subject/:classID/:subjectID" element={<ViewSubject />} />

                        <Route path="subject/student/attendance/:studentID/:subjectID" element={<StudentAttendance situation="Subject" />} />
                        <Route path="subject/student/marks/:studentID/:subjectID" element={<StudentExamMarks situation="Subject" />} />

                        {/* Class */}
                        <Route path="addclass" element={<AddClass />} />
                        <Route path="classes" element={<ShowClasses />} />
                        <Route path="classes/class/:id" element={<ClassDetails />} />
                        <Route path="class/addstudents/:id" element={<AddStudent situation="Class" />} />

                        {/* Student */}
                        <Route path="addstudents" element={<AddStudent situation="Student" />} />
                        <Route path="students" element={<ShowStudents />} />
                        <Route path="students/student/:id" element={<ViewStudent />} />
                        <Route path="students/student/:id/edit" element={<ViewStudent />} />
                        <Route path="students/student/attendance/:id" element={<StudentAttendance situation="Student" />} />
                        <Route path="students/student/marks/:id" element={<StudentExamMarks situation="Student" />} />

                        {/* Teacher */}
                        <Route path="teachers" element={<ShowTeachers />} />
                        <Route path="teachers/teacher/:id" element={<TeacherDetails />} />
                        <Route path="teachers/chooseclass" element={<ChooseClass situation="Teacher" />} />
                        <Route path="teachers/choosesubject/:id" element={<ChooseSubject situation="Norm" />} />
                        <Route path="teachers/choosesubject/:classID/:teacherID" element={<ChooseSubject situation="Teacher" />} />
                        <Route path="teachers/addteacher/:id" element={<AddTeacher />} />
                        <Route path="accountants" element={<ShowAccountants />} />
                        <Route path="accountants/add" element={<AddAccountant />} />
                        <Route path="hrs" element={<ShowHR />} />
                        <Route path="hrs/add" element={<AddHR />} />
                        <Route path="calendar" element={<AcademicCalendarPage />} />
                        <Route path="grading" element={<GradingSettingsPage />} />
                        <Route path="policies" element={<SchoolPoliciesPage />} />
                        <Route path="settings" element={<AdminSettingsPage />} />
                        <Route path="settings-categories" element={<SettingsDashboard />} />
                        <Route path="settings-categories/:categorySlug" element={<SettingsCategoryPage />} />
                        <Route path="reports/academic" element={<AcademicReport />} />
                        <Route path="reports/financial" element={<FinancialReport />} />
                        <Route path="salary-approvals" element={<SalaryApprovalsPage />} />
                        {isSuperAdmin && <Route path="approve" element={<AdminApprovePage />} />}
                        {isSuperAdmin && <Route path="school-subscriptions" element={<SchoolSubscriptionsPage />} />}
                        {canViewSystemLogs && <Route path="system-logs" element={<SystemLogsPage />} />}
                        {canViewSystemLogs && <Route path="monitoring" element={<MonitoringPage />} />}
                        <Route path="logout" element={<Logout />} />
                        <Route path="*" element={<Navigate to={`${basePath}/dashboard`} replace />} />
                    </Routes>
                </Box>
            </Box>
        </>
    );
}

export default AdminDashboard

const styles = {
    boxStyled: {
        backgroundColor: (theme) =>
            theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
        flexGrow: 1,
        minWidth: 0,
        width: '100%',
        minHeight: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        p: { xs: 1.5, sm: 2, md: 3 },
        boxSizing: 'border-box',
    },
    toolBarStyled: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        px: [1],
    },
    drawerStyled: {
        display: "flex"
    },
    hideDrawer: {
        display: 'flex',
        '@media (max-width: 600px)': {
            display: 'none',
        },
    },
}
