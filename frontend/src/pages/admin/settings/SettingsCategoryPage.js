import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { adminSettingsCategories } from './settingsData';
import SystemSettingsPage from './SystemSettingsPage';
import SecuritySettingsPage from './SecuritySettingsPage';
import GeneralSettings from './GeneralSettings';
import SchoolManagementSettings from './SchoolManagementSettings';
import AcademicSettings from './AcademicSettings';
import UserRoleManagementSettings from './UserRoleManagementSettings';
import CommunicationSettings from './CommunicationSettings';
import FinanceSettings from './FinanceSettings';
import AttendanceSettings from './AttendanceSettings';
import SystemCustomizationSettings from './SystemCustomizationSettings';
import IntegrationsSettings from './IntegrationsSettings';
import BackupRecoverySettings from './BackupRecoverySettings';
import AuditLogsSettings from './AuditLogsSettings';
import ReportsAnalyticsSettings from './ReportsAnalyticsSettings';
import SubscriptionLicenseSettings from './SubscriptionLicenseSettings';

const SettingsCategoryPage = () => {
  const { categorySlug } = useParams();
  const category = useMemo(
    () => adminSettingsCategories.find((item) => item.slug === categorySlug),
    [categorySlug]
  );

  if (!category) {
    return (
      <Box sx={{ p: 2, maxWidth: 900, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          Settings category not found
        </Typography>
        <Typography color="text.secondary">
          Please select a valid settings category from the settings dashboard.
        </Typography>
      </Box>
    );
  }

  const renderCategory = () => {
    switch (categorySlug) {
      case 'general-settings':
        return <GeneralSettings />;
      case 'school-management':
        return <SchoolManagementSettings />;
      case 'academic-settings':
        return <AcademicSettings />;
      case 'user-role-management':
        return <UserRoleManagementSettings />;
      case 'security-settings':
        return <SecuritySettingsPage />;
      case 'communication-settings':
        return <CommunicationSettings />;
      case 'finance-settings':
        return <FinanceSettings />;
      case 'attendance-settings':
        return <AttendanceSettings />;
      case 'system-customization':
        return <SystemCustomizationSettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'backup-recovery':
        return <BackupRecoverySettings />;
      case 'audit-logs':
        return <AuditLogsSettings />;
      case 'reports-analytics':
        return <ReportsAnalyticsSettings />;
      case 'subscription-license':
        return <SubscriptionLicenseSettings />;
      default:
        return (
          <Box sx={{ p: 3, backgroundColor: 'background.paper', borderRadius: 2 }}> 
            <Typography variant="body1" sx={{ mb: 2 }}>
              The <strong>{category.label}</strong> settings module is not implemented yet.
            </Typography>
            <Typography color="text.secondary">
              You can add detailed configuration fields and controls for this category in <code>frontend/src/pages/admin/settings</code>.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        {category.label}
      </Typography>
      <Typography sx={{ mb: 3, color: 'text.secondary' }}>{category.description}</Typography>
      {renderCategory()}
    </Box>
  );
};

export default SettingsCategoryPage;