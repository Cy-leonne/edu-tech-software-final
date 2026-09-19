
import * as React from 'react';
import { Divider, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

import HomeIcon from '@mui/icons-material/Home';
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import AnnouncementOutlinedIcon from '@mui/icons-material/AnnouncementOutlined';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import { useSelector } from 'react-redux';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GradeIcon from '@mui/icons-material/Grade';
import ScheduleIcon from '@mui/icons-material/CalendarToday';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import QuizIcon from '@mui/icons-material/Quiz';

const TeacherSideBar = ({ open = true }) => {
    const { currentUser } = useSelector((state) => state.user);
    const sclassName = currentUser?.teachSclass

    const location = useLocation();
    return (
        <>
            <React.Fragment>
                <ListItemButton component={Link} to="/">
                    <ListItemIcon>
                        <HomeIcon color={location.pathname === ("/" || "/Teacher/dashboard") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Home" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Teacher/class">
                    <ListItemIcon>
                        <ClassOutlinedIcon color={location.pathname.startsWith("/Teacher/class") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    {open && <ListItemText primary={`Class ${sclassName?.sclassName || ''}`} />}
                </ListItemButton>
                <ListItemButton component={Link} to="/Teacher/timetable">
                    <ListItemIcon>
                        <ScheduleIcon color={location.pathname.startsWith("/Teacher/timetable") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    {open && <ListItemText primary="Timetable" />}
                </ListItemButton>
                <ListItemButton component={Link} to="/Teacher/complain">
                    <ListItemIcon>
                        <AnnouncementOutlinedIcon color={location.pathname.startsWith("/Teacher/complain") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Complain" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Teacher/upload-assignment">
                    <ListItemIcon>
                        <AssignmentIcon color={location.pathname.startsWith("/Teacher/upload-assignment") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Upload Assignment" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Teacher/upload-results">
                    <ListItemIcon>
                        <GradeIcon color={location.pathname.startsWith("/Teacher/upload-results") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Upload Results" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Teacher/upload-materials">
                    <ListItemIcon>
                        <AssignmentIcon color={location.pathname.startsWith("/Teacher/upload-materials") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Upload Notes/Videos" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Teacher/schedule-live-class">
                    <ListItemIcon>
                        <VideoLibraryIcon color={location.pathname.startsWith("/Teacher/schedule-live-class") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Schedule Live Class" />
                </ListItemButton>
                <ListItemButton component={Link} to="/Teacher/create-quiz">
                    <ListItemIcon>
                        <QuizIcon color={location.pathname.startsWith("/Teacher/create-quiz") ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Create Quiz" />
                </ListItemButton>
            </React.Fragment>
            <Divider sx={{ my: 1 }} />
            <React.Fragment>
                <ListSubheader component="div" inset>
                    User
                </ListSubheader>
                <ListItemButton component={Link} to="/Teacher/profile">
                    <ListItemIcon>
                        <AccountCircleOutlinedIcon color={location.pathname.startsWith("/Teacher/profile") ? 'primary' : 'inherit'} />
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

export default TeacherSideBar
