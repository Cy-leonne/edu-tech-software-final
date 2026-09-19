
import * as React from 'react';
import { useSelector } from 'react-redux';
import { Divider, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

import HomeIcon from "@mui/icons-material/Home";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import AnnouncementOutlinedIcon from '@mui/icons-material/AnnouncementOutlined';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ReportIcon from '@mui/icons-material/Report';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MailIcon from '@mui/icons-material/Mail';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GradeIcon from '@mui/icons-material/Grade';
import GavelIcon from '@mui/icons-material/Gavel';
import SchoolIcon from '@mui/icons-material/School';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import HistoryIcon from '@mui/icons-material/History';
import TimelineIcon from '@mui/icons-material/Timeline';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';

const SideBar = () => {
    const location = useLocation();
    const { currentRole } = useSelector((state) => state.user);
    const isSuperAdmin = currentRole === 'SuperAdmin';
    const canViewSystemLogs = isSuperAdmin || currentRole === 'Admin';
    return (
        <>
            <React.Fragment>
                <ListItemButton component={Link} to="/">
                    <ListItemIcon>
                        <HomeIcon color={location.pathname === ("/" || "/Admin/dashboard") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Home" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/classes">
                    <ListItemIcon>
                        <ClassOutlinedIcon color={location.pathname.startsWith('/Admin/classes') ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Classes" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/subjects">
                    <ListItemIcon>
                        <AssignmentIcon color={location.pathname.startsWith("/Admin/subjects") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Subjects" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/teachers">
                    <ListItemIcon>
                        <SupervisorAccountOutlinedIcon color={location.pathname.startsWith("/Admin/teachers") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Teachers" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/accountants">
                    <ListItemIcon>
                        <AccountBalanceIcon color={location.pathname.startsWith("/Admin/accountants") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Accountants" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/hrs">
                    <ListItemIcon>
                        <PeopleAltOutlinedIcon color={location.pathname.startsWith("/Admin/hrs") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="HR Staff" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/students">
                    <ListItemIcon>
                        <PersonOutlineIcon color={location.pathname.startsWith("/Admin/students") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Students" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/notices">
                    <ListItemIcon>
                        <AnnouncementOutlinedIcon color={location.pathname.startsWith("/Admin/notices") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Notices" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/messages">
                    <ListItemIcon>
                        <MailIcon color={location.pathname.startsWith("/Admin/messages") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Messages" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/communications">
                    <ListItemIcon>
                        <HistoryIcon color={location.pathname.startsWith("/Admin/communications") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Communication Log" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/settings">
                    <ListItemIcon>
                        <ReportIcon color={location.pathname.startsWith("/Admin/settings") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/settings-categories/attendance-settings">
                    <ListItemIcon>
                        <EventAvailableIcon color={location.pathname.startsWith('/Admin/settings-categories/attendance-settings') ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Biometric Attendance" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/complains">
                    <ListItemIcon>
                        <ReportIcon color={location.pathname.startsWith("/Admin/complains") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Complains" />
                </ListItemButton>
                <ListSubheader component="div" inset>
                    School
                </ListSubheader>
                <ListItemButton component={Link} to="/Admin/profile">
                    <ListItemIcon>
                        <SchoolIcon color={location.pathname.startsWith("/Admin/profile") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="School Profile" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/calendar">
                    <ListItemIcon>
                        <EventAvailableIcon color={location.pathname.startsWith("/Admin/calendar") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Academic Calendar" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/grading">
                    <ListItemIcon>
                        <GradeIcon color={location.pathname.startsWith("/Admin/grading") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Grading Settings" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/policies">
                    <ListItemIcon>
                        <GavelIcon color={location.pathname.startsWith("/Admin/policies") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="School Policies" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/reports/academic">
                    <ListItemIcon>
                        <ReportIcon color={location.pathname.startsWith("/Admin/reports/academic") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Academic Report" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/reports/financial">
                    <ListItemIcon>
                        <AccountBalanceIcon color={location.pathname.startsWith("/Admin/reports/financial") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Financial Report" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Admin/salary-approvals">
                    <ListItemIcon>
                        <AccountBalanceIcon color={location.pathname.startsWith("/Admin/salary-approvals") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Salary Approvals" />
                </ListItemButton>
                {canViewSystemLogs && (
                    <>
                        <ListItemButton component={Link} to="/Admin/monitoring">
                            <ListItemIcon>
                                <TimelineIcon color={location.pathname.startsWith('/Admin/monitoring') ? 'primary' : 'inherit'} />
                            </ListItemIcon>
                            <ListItemText primary="Monitoring" sx={{ color: location.pathname.startsWith('/Admin/monitoring') ? '#b71c1c' : undefined }} />
                        </ListItemButton>
                        <ListItemButton component={Link} to="/Admin/system-logs">
                            <ListItemIcon>
                                <TimelineIcon color={location.pathname.startsWith('/Admin/system-logs') ? 'primary' : 'inherit'} />
                            </ListItemIcon>
                            <ListItemText primary="System Logs" sx={{ color: location.pathname.startsWith('/Admin/system-logs') ? '#b71c1c' : undefined }} />
                        </ListItemButton>
                    </>
                )}
                {isSuperAdmin && (
                    <>
                        <ListItemButton component={Link} to="/Admin/school-subscriptions">
                            <ListItemIcon>
                                <CardMembershipOutlinedIcon color={location.pathname.startsWith('/Admin/school-subscriptions') ? 'primary' : 'inherit'} />
                            </ListItemIcon>
                            <ListItemText primary="School Subscriptions" />
                        </ListItemButton>
                        <ListItemButton component={Link} to="/Admin/approve">
                            <ListItemIcon>
                                <AdminPanelSettingsOutlinedIcon color={location.pathname.startsWith('/Admin/approve') ? 'error' : 'inherit'} />
                            </ListItemIcon>
                            <ListItemText primary="Approve Admins" sx={{ color: location.pathname.startsWith('/Admin/approve') ? '#b71c1c' : undefined }} />
                        </ListItemButton>
                    </>
                )}
            </React.Fragment>
            <Divider sx={{ my: 1 }} />
            <React.Fragment>
                <ListSubheader component="div" inset>
                    User
                </ListSubheader>
                <ListItemButton component={Link} to="/Admin/profile">
                    <ListItemIcon>
                        <AccountCircleOutlinedIcon color={location.pathname.startsWith("/Admin/profile") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Profile" />
                </ListItemButton>
                <ListItemButton component={Link} to="/logout">
                    <ListItemIcon>
                        <ExitToAppIcon color={location.pathname.startsWith("/logout") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Logout" />
                </ListItemButton>
            </React.Fragment>
        </>
    )
}

export default SideBar
