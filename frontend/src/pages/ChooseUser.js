
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Paper,
  Box,
  Container,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import { AccountCircle, School, Group, FamilyRestroom } from '@mui/icons-material';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../redux/userRelated/userHandle';
import Popup from '../components/Popup';
import { enableGuestDemo, getGuestDemoFields, GUEST_DEMO_UNAVAILABLE_MESSAGE } from '../utils/guestDemo';

/**
 * Demo accounts are disabled unless REACT_APP_ENABLE_GUEST_DEMO=true.
 *
 * The demo users previously relied on well known credentials shipped in the
 * bundle, which must not be reachable in a production deployment. The real
 * login portals (/Adminlogin, /Studentlogin, ...) are unaffected.
 */

const ChooseUser = ({ visitor }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isGuest = visitor === 'guest' && enableGuestDemo

  const { status, currentRole } = useSelector(state => state.user);

  /**
   * Demo login helper. Demo credentials come from REACT_APP_GUEST_* variables
   * (see src/utils/guestDemo.js) - nothing is hard-coded in the bundle.
   */
  const handleGuestLogin = (user) => {
    const fields = getGuestDemoFields(user);
    if (!fields) {
      setMessage(GUEST_DEMO_UNAVAILABLE_MESSAGE);
      setShowPopup(true);
      return;
    }
    setLoader(true);
    dispatch(loginUser(fields, user));
  };

  const [loader, setLoader] = useState(false)
  const [showPopup, setShowPopup] = useState(false);
  const [message, setMessage] = useState("");

  const navigateHandler = (user) => {
    if (user === "Admin") {
      if (isGuest) {
        handleGuestLogin(user);
      }
      else {
        navigate('/Adminlogin');
      }
    }

    else if (user === "Student") {
      if (isGuest) {
        handleGuestLogin(user);
      }
      else {
        navigate('/Studentlogin');
      }
    }

    else if (user === "Teacher") {
      if (isGuest) {
        handleGuestLogin(user);
      }
      else {
        navigate('/Teacherlogin');
      }
    }
    else if (user === "Accountant") {
      if (isGuest) {
        handleGuestLogin(user);
      } else {
        navigate('/Accountantlogin');
      }
    }
    else if (user === "HR") {
      if (isGuest) {
        handleGuestLogin(user);
      } else {
        navigate('/HRlogin');
      }
    }
    else if (user === "Parent") {
      navigate('/Parent/login');
    }
    else if (user === "SuperAdmin") {
      navigate('/SuperAdminlogin');
    }
  }

  useEffect(() => {
    if (status === 'success') {
      if (currentRole === 'Admin' || currentRole === 'SuperAdmin') {
        navigate(currentRole === 'SuperAdmin' ? '/SuperAdmin/dashboard' : '/Admin/dashboard');
      }
      else if (currentRole === 'Student') {
        navigate('/Student/dashboard');
      } else if (currentRole === 'Accountant') {
        navigate('/Accountant');
      } else if (currentRole === 'HR') {
        navigate('/HR');
      } else if (currentRole?.includes('Teacher')) {
        navigate('/Teacher/dashboard');
      }
    }
    else if (status === 'error') {
      setLoader(false)
      setMessage("Network Error")
      setShowPopup(true)
    }
  }, [status, currentRole, navigate]);

  return (
    <StyledContainer>
      <Container>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <div onClick={() => navigateHandler("Admin")}>
              <StyledPaper elevation={3}>
                <Box mb={2}>
                  <AccountCircle fontSize="large" />
                </Box>
                <StyledTypography>
                  Admin
                </StyledTypography>
                Login as an administrator to access the dashboard to manage app data.
              </StyledPaper>
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StyledPaper elevation={3}>
              <div onClick={() => navigateHandler("Student")}>
                <Box mb={2}>
                  <School fontSize="large" />
                </Box>
                <StyledTypography>
                  Student
                </StyledTypography>
                Login as a student to explore course materials and assignments.
              </div>
            </StyledPaper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StyledPaper elevation={3}>
              <div onClick={() => navigateHandler("Teacher")}> 
                <Box mb={2}>
                  <Group fontSize="large" />
                </Box>
                <StyledTypography>
                  Teacher
                </StyledTypography>
                Login as a teacher to create courses, assignments, and track student progress.
              </div>
            </StyledPaper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StyledPaper elevation={3}>
              <div onClick={() => navigateHandler("Accountant")}> 
                <Box mb={2}>
                  <AccountCircle fontSize="large" />
                </Box>
                <StyledTypography>
                  Accountant
                </StyledTypography>
                Login as an accountant or finance officer to manage student fee payments and reports.
              </div>
            </StyledPaper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StyledPaper elevation={3}>
              <div onClick={() => navigateHandler("HR")}> 
                <Box mb={2}>
                  <AccountCircle fontSize="large" />
                </Box>
                <StyledTypography>
                  HR
                </StyledTypography>
                Manage employee records, leave, attendance, payroll, recruitment, and compliance from one dashboard.
              </div>
            </StyledPaper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StyledPaper elevation={3}>
              <div onClick={() => navigateHandler("Parent")}> 
                <Box mb={2}>
                  <FamilyRestroom fontSize="large" />
                </Box>
                <StyledTypography>
                  Parent/Guardian
                </StyledTypography>
                Login as a parent to pay school fees and track your child's payment status.
              </div>
            </StyledPaper>
          </Grid>
          {visitor !== 'guest' && (
            <>
              <Grid item xs={12} sm={6} md={4}>
                <StyledPaper elevation={3}>
                  <div onClick={() => navigateHandler("SuperAdmin")}> 
                    <Box mb={2}>
                      <AccountCircle fontSize="large" />
                    </Box>
                    <StyledTypography>
                      Super Admin
                    </StyledTypography>
                    Login as a super admin to approve schools and manage system-wide admin onboarding.
                  </div>
                </StyledPaper>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StyledPaper elevation={3}>
                  <div onClick={() => navigate('/SuperAdminregister')}>
                    <Box mb={2}>
                      <AccountCircle fontSize="large" />
                    </Box>
                    <StyledTypography>
                      Create Super Admin
                    </StyledTypography>
                    Register a new Super Admin account for system-level approvals.
                  </div>
                </StyledPaper>
              </Grid>
            </>
          )}
        </Grid>
      </Container>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loader}
      >
        <CircularProgress color="inherit" />
        Please Wait
      </Backdrop>
      <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />
    </StyledContainer>
  );
};

export default ChooseUser;

const StyledContainer = styled.div`
  background: linear-gradient(to bottom, #411d70, #19118b);
  height: 120vh;
  display: flex;
  justify-content: center;
  padding: 2rem;
`;

const StyledPaper = styled(Paper)`
  padding: 20px;
  text-align: center;
  background-color: #1f1f38;
  color:rgba(255, 255, 255, 0.6);
  cursor:pointer;

  &:hover {
    background-color: #2c2c6c;
    color:white;
  }
`;

const StyledTypography = styled.h2`
  margin-bottom: 10px;
`;
