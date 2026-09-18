
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
import HistoryIcon from '@mui/icons-material/History';
import TimelineIcon from '@mui/icons-material/Timeline';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';

/**
 * Administrative sidebar.
 *
 * `basePath` allows the same navigation to work when the portal is opened
 * through either `/admin` or the legacy `/Admin` prefix. Icons, labels and
 * colours are unchanged.
 */
const SideBar = ({ basePath = '/Admin', onNavigate = () => {} }) => {
    const location = useLocation();
    const { currentRole } = useSelector((state) => state.user);
    const isSuperAdmin = currentRole === 'SuperAdmin';
    const canViewSystemLogs = isSuperAdmin || currentRole === 'Admin';

    const isActive = (suffix) => location.pathname.startsWith(`${basePath}${suffix}`);
    const linkProps = (suffix) => ({
        component: Link,
        to: `${basePath}${suffix}`,
        onClick: () => onNavigate(),
    });

    return (
        <>
            <React.Fragment>
                <ListItemButton component={Link} to="/" onClick={() => onNavigate()}>
                    <ListItemIcon>
                        <HomeIcon color={location.pathname === "/" ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Home" />
                </ListItemButton>
                <ListItemButton {...linkProps("/classes")}>
                    <ListItemIcon>
                        <ClassOutlinedIcon color={isActive('/classes') ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Classes" />
                </ListItemButton>
                <ListItemButton {...linkProps("/subjects")}>
                    <ListItemIcon>
                        <AssignmentIcon color={isActive("/subjects") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Subjects" />
                </ListItemButton>
                <ListItemButton {...linkProps("/teachers")}>
                    <ListItemIcon>
                        <SupervisorAccountOutlinedIcon color={isActive("/teachers") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Teachers" />
                </ListItemButton>
                <ListItemButton {...linkProps("/accountants")}>
                    <ListItemIcon>
                        <AccountBalanceIcon color={isActive("/accountants") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Accountants" />
                </ListItemButton>
                <ListItemButton {...linkProps("/hrs")}>
                    <ListItemIcon>
                        <PeopleAltOutlinedIcon color={isActive("/hrs") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="HR Staff" />
                </ListItemButton>
                <ListItemButton {...linkProps("/students")}>
                    <ListItemIcon>
                        <PersonOutlineIcon color={isActive("/students") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Students" />
                </ListItemButton>
                <ListItemButton {...linkProps("/notices")}>
                    <ListItemIcon>
                        <AnnouncementOutlinedIcon color={isActive("/notices") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Notices" />
                </ListItemButton>
                <ListItemButton {...linkProps("/messages")}>
                    <ListItemIcon>
                        <MailIcon color={isActive("/messages") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Messages" />
                </ListItemButton>
                <ListItemButton {...linkProps("/communications")}>
                    <ListItemIcon>
                        <HistoryIcon color={isActive("/communications") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Communication Log" />
                </ListItemButton>
                <ListItemButton {...linkProps("/settings")}>
                    <ListItemIcon>
                        <ReportIcon color={isActive("/settings") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
                </ListItemButton>
                <ListItemButton {...linkProps("/settings-categories/attendance-settings")}>
                    <ListItemIcon>
                        <EventAvailableIcon color={isActive('/settings-categories/attendance-settings') ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Biometric Attendance" />
                </ListItemButton>
                <ListItemButton {...linkProps("/complains")}>
                    <ListItemIcon>
                        <ReportIcon color={isActive("/complains") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Complains" />
                </ListItemButton>
                <ListSubheader component="div" inset>
                    School
                </ListSubheader>
                <ListItemButton {...linkProps("/profile")}>
                    <ListItemIcon>
                        <SchoolIcon color={isActive("/profile") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="School Profile" />
                </ListItemButton>
                <ListItemButton {...linkProps("/calendar")}>
                    <ListItemIcon>
                        <EventAvailableIcon color={isActive("/calendar") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Academic Calendar" />
                </ListItemButton>
                <ListItemButton {...linkProps("/grading")}>
                    <ListItemIcon>
                        <GradeIcon color={isActive("/grading") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Grading Settings" />
                </ListItemButton>
                <ListItemButton {...linkProps("/policies")}>
                    <ListItemIcon>
                        <GavelIcon color={isActive("/policies") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="School Policies" />
                </ListItemButton>
                <ListItemButton {...linkProps("/reports/academic")}>
                    <ListItemIcon>
                        <ReportIcon color={isActive("/reports/academic") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Academic Report" />
                </ListItemButton>
                <ListItemButton {...linkProps("/reports/financial")}>
                    <ListItemIcon>
                        <AccountBalanceIcon color={isActive("/reports/financial") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Financial Report" />
                </ListItemButton>
                <ListItemButton {...linkProps("/salary-approvals")}>
                    <ListItemIcon>
                        <AccountBalanceIcon color={isActive("/salary-approvals") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Salary Approvals" />
                </ListItemButton>
                {canViewSystemLogs && (
                    <>
                        <ListItemButton {...linkProps("/monitoring")}>
                            <ListItemIcon>
                                <TimelineIcon color={isActive('/monitoring') ? 'primary' : 'inherit'} />
                            </ListItemIcon>
                            <ListItemText primary="Monitoring" />
                        </ListItemButton>
                        <ListItemButton {...linkProps("/system-logs")}>
                            <ListItemIcon>
                                <TimelineIcon color={isActive('/system-logs') ? 'primary' : 'inherit'} />
                            </ListItemIcon>
                            <ListItemText primary="System Logs" />
                        </ListItemButton>
                    </>
                )}
                {isSuperAdmin && (
                    <>
                        <ListItemButton {...linkProps("/school-subscriptions")}>
                            <ListItemIcon>
                                <CardMembershipOutlinedIcon color={isActive('/school-subscriptions') ? 'primary' : 'inherit'} />
                            </ListItemIcon>
                            <ListItemText primary="School Subscriptions" />
                        </ListItemButton>
                        <ListItemButton {...linkProps("/approve")}>
                            <ListItemIcon>
                                <AdminPanelSettingsOutlinedIcon color={isActive('/approve') ? 'error' : 'inherit'} />
                            </ListItemIcon>
                            <ListItemText primary="Approve Admins" sx={{ color: isActive('/approve') ? '#b71c1c' : undefined }} />
                        </ListItemButton>
                    </>
                )}
            </React.Fragment>
            <Divider sx={{ my: 1 }} />
            <React.Fragment>
                <ListSubheader component="div" inset>
                    User
                </ListSubheader>
                <ListItemButton {...linkProps("/profile")}>
                    <ListItemIcon>
                        <AccountCircleOutlinedIcon color={isActive("/profile") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Profile" />
                </ListItemButton>
                <ListItemButton {...linkProps("/logout")}>
                    <ListItemIcon>
                        <ExitToAppIcon color={isActive("/logout") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Logout" />
                </ListItemButton>
            </React.Fragment>
        </>
    )
}

export default SideBar
