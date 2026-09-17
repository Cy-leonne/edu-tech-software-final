import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Button, Typography, Card, CardContent, List, ListItem, ListItemText, IconButton, Menu, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import Students from '../assets/students.svg';
import { LightPurpleButton } from '../components/buttonStyles';
import { authLogout } from '../redux/userRelated/userSlice';

/** Demo accounts are only offered when explicitly enabled (never by default). */
const enableGuestDemo = String(process.env.REACT_APP_ENABLE_GUEST_DEMO || '').toLowerCase() === 'true';

const Homepage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [menuAnchor, setMenuAnchor] = React.useState(null);

    const handleNavigate = (path) => {
        setMenuAnchor(null);
        dispatch(authLogout());
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentRole');
        navigate(path);
    };

    return (
        <PageWrapper>
            <Header>
                <Nav>
                    <NavLink href="#home">Home</NavLink>
                    <NavLink href="#about">About</NavLink>
                    <NavLink href="#admissions">Admissions</NavLink>
                    <NavLink href="#academics">Academics</NavLink>
                    <NavLink href="#student-life">Student Life</NavLink>
                    <NavLink href="#news">News & Events</NavLink>
                    <NavLink href="#downloads">Downloads</NavLink>
                    <NavLink href="#contact">Contact</NavLink>
                    <ActionButton onClick={() => handleNavigate('/Parent/login')}>Parent Portal</ActionButton>
                    <ActionButton onClick={() => handleNavigate('/Studentlogin')}>Student Portal</ActionButton>
                </Nav>
                <MobileMenuButton
                    aria-label="Open navigation menu"
                    aria-controls={menuAnchor ? 'mobile-navigation' : undefined}
                    aria-haspopup="true"
                    aria-expanded={menuAnchor ? 'true' : undefined}
                    onClick={(event) => setMenuAnchor(event.currentTarget)}
                >
                    <MenuIcon />
                </MobileMenuButton>
                <Menu
                    id="mobile-navigation"
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => setMenuAnchor(null)}
                    slotProps={{ paper: { sx: { mt: 1, minWidth: 190 } } }}
                >
                    {['home', 'about', 'admissions', 'academics', 'student-life', 'news', 'downloads', 'contact'].map((section) => (
                        <MenuItem key={section} component="a" href={`#${section}`} onClick={() => setMenuAnchor(null)}>
                            {section === 'student-life' ? 'Student Life' : section === 'news' ? 'News & Events' : section.charAt(0).toUpperCase() + section.slice(1)}
                        </MenuItem>
                    ))}
                    <MenuItem onClick={() => handleNavigate('/Parent/login')}>Parent Portal</MenuItem>
                    <MenuItem onClick={() => handleNavigate('/Studentlogin')}>Student Portal</MenuItem>
                    {enableGuestDemo && (
                        <MenuItem onClick={() => handleNavigate('/chooseasguest')}>Demo accounts</MenuItem>
                    )}
                </Menu>
            </Header>

            <Section id="home">
                <Grid container spacing={4} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <Typography variant="h2" component="h1" gutterBottom>
                            Welcome to School Management System
                        </Typography>
                        <Typography variant="h6" paragraph>
                            Manage school operations from one place. Admissions, academics, student life, and parent/student portals are all available in a single dashboard.
                        </Typography>
                        <ButtonRow>
                            {/*
                              Public entry points only. The administrative
                              interface is deliberately not linked anywhere on
                              the public site: staff open it directly at /admin
                              (or the staff chooser at /choose). Hiding the link
                              is not the security control - every administrative
                              API call is authorised server side.
                            */}
                            <LightPurpleButton variant="contained" onClick={() => handleNavigate('/Parent/login')}>
                                Parent Portal
                            </LightPurpleButton>
                            <Button variant="outlined" onClick={() => handleNavigate('/Studentlogin')}>
                                Student Portal
                            </Button>
                        </ButtonRow>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <HeroImage src={Students} alt="students" />
                    </Grid>
                </Grid>
            </Section>

            <Section id="about">
                <SectionHeader>About</SectionHeader>
                <Typography paragraph>
                    Our school website provides a modern online presence, easy admission workflows, strong academic tools, and exclusive portals for parents and students. Built for schools that want organized communication, faster decisions, and better student outcomes.
                </Typography>
            </Section>

            <Section id="admissions">
                <SectionHeader>Admissions</SectionHeader>
                <Typography paragraph>
                    Manage admissions with clear steps, online inquiries, application tracking, and easy follow-up. Keep families informed from the first contact through enrollment.
                </Typography>
                <FeatureGrid>
                    <FeatureCard>
                        <CardContent>
                            <Typography variant="h6">Easy Applications</Typography>
                            <Typography variant="body2">Collect student details, guardian contacts, and supporting documents in one place.</Typography>
                        </CardContent>
                    </FeatureCard>
                    <FeatureCard>
                        <CardContent>
                            <Typography variant="h6">Application Status</Typography>
                            <Typography variant="body2">Allow administrators to review submissions and update families with status changes.</Typography>
                        </CardContent>
                    </FeatureCard>
                </FeatureGrid>
            </Section>

            <Section id="academics">
                <SectionHeader>Academics</SectionHeader>
                <Typography paragraph>
                    Track syllabus progress, assign subjects, monitor attendance, and share exam results. The academic dashboard makes planning and reporting easier for teachers and administrators.
                </Typography>
            </Section>

            <Section id="student-life">
                <SectionHeader>Student Life</SectionHeader>
                <Typography paragraph>
                    Showcase extracurricular activities, sports, clubs, and campus events. Keep students and parents aware of the school experience beyond the classroom.
                </Typography>
            </Section>

            <Section id="news">
                <SectionHeader>News & Events</SectionHeader>
                <Typography paragraph>
                    Publish school news, upcoming events, announcements, and important deadlines. Keep your community connected with timely updates.
                </Typography>
                <NewsList>
                    <ListItem>
                        <ListItemText primary="Open Day Ceremony" secondary="Join our campus open day event for new families." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Exam Results Dashboard" secondary="Access student results and progress reports from one dashboard." />
                    </ListItem>
                </NewsList>
            </Section>

            <Section id="downloads">
                <SectionHeader>Downloads</SectionHeader>
                <Typography paragraph>
                    Provide parents and students with quick access to handbooks, academic calendars, forms, and school policies.
                </Typography>
                <List>
                    <ListItem>
                        <ListItemText primary="Admission Form" secondary="Download the student admission form." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Academic Calendar" secondary="View the full school term calendar." />
                    </ListItem>
                </List>
            </Section>

            <Section id="portal-shortcuts">
                <SectionHeader>Portals</SectionHeader>
                <Typography paragraph>
                    Use dedicated sign-in portals for parents and students. Access fee status, attendance, timetable, and academic progress securely.
                </Typography>
                <ButtonRow>
                    <LightPurpleButton variant="contained" onClick={() => handleNavigate('/Parent/login')}>
                        Parent Portal
                    </LightPurpleButton>
                    <Button variant="outlined" onClick={() => handleNavigate('/Studentlogin')}>
                        Student Portal
                    </Button>
                </ButtonRow>
            </Section>

            <Section id="contact">
                <SectionHeader>Contact</SectionHeader>
                <Typography paragraph>
                    Reach out to the school for admissions, support, or general inquiries. We are ready to help families and students succeed.
                </Typography>
                <ContactCard>
                    <Typography><strong>Email:</strong> jkoilel@nita.go.ke</Typography>
                    <Typography><strong>Phone:</strong> 0714675015</Typography>
                    <Typography><strong>Address:</strong> edutechh school managment system.com</Typography>
                </ContactCard>
            </Section>
        </PageWrapper>
    );
};

export default Homepage;

const PageWrapper = styled.div`
  background: #f7f8fc;
  color: #1f2937;
  min-height: 100vh;
`;

const Header = styled.header`
  width: 100%;
  position: sticky;
  top: 0;
  z-index: 10;
  background: #ffffffee;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
    padding: 14px clamp(16px, 4vw, 48px);
  gap: 20px;
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  cursor: pointer;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;

    @media (max-width: 1050px) {
        display: none;
    }
`;

const MobileMenuButton = styled(IconButton)`
    && {
        display: none;
        color: #374151;

        @media (max-width: 1050px) {
            display: inline-flex;
        }
    }
`;

const NavLink = styled.a`
  font-size: 0.95rem;
  color: #374151;
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: #7c3aed;
  }
`;

const ActionButton = styled(Button)`
  && {
    text-transform: none;
    border-radius: 999px;
    padding: 10px 20px;
    border-color: transparent;
    color: #ffffff;
    background: #7c3aed;
    &:hover {
      background: #5b21b6;
    }
  }
`;

const Section = styled.section`
    padding: clamp(48px, 7vw, 80px) clamp(16px, 5vw, 48px);
  max-width: 1200px;
  margin: 0 auto;

    &:first-of-type {
        padding-top: clamp(56px, 9vw, 104px);
    }
`;

const SectionHeader = styled(Typography)`
  && {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 16px;
  }
`;

const HeroImage = styled.img`
  width: 100%;
  max-width: 540px;
  display: block;
  margin: 0 auto;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 24px;

    @media (max-width: 480px) {
        flex-direction: column;

        & > button {
            width: 100%;
        }
    }
`;

const FeatureGrid = styled.div`
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  margin-top: 24px;
`;

const FeatureCard = styled(Card)`
  min-height: 160px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
`;

const NewsList = styled(List)`
  width: 100%;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
`;

const ContactCard = styled(Card)`
  background: #ffffff;
  padding: 24px;
  border-radius: 20px;
  max-width: 560px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
`;