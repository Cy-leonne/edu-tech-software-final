import { useState } from 'react';
import axios from 'axios';
import { Button } from '@mui/material';

const DataExportButton = ({ endpoint, filename, label = 'Download Data' }) => {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
    const userId = user?._id || user?.id;
    if (!userId) return;

    setLoading(true);
    try {
      const baseUrl = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        responseType: 'blob',
        headers: { 'x-admin-id': userId, 'x-user-id': userId },
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return <Button variant="outlined" onClick={download} disabled={loading}>{loading ? 'Preparing...' : label}</Button>;
};

export default DataExportButton;