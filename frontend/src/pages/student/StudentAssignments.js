import { API_BASE_URL } from '../../utils/apiConfig';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress } from '@mui/material';


const StudentAssignments = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      setError(null);

      const classValue = currentUser?.sclassName;
      const classId = typeof classValue === 'object'
        ? classValue?._id || classValue?.id
        : classValue;
      const schoolValue = currentUser?.school;
      const schoolId = typeof schoolValue === 'object'
        ? schoolValue?._id || schoolValue?.id
        : schoolValue || currentUser?.schoolId;

      if (!classId) {
        setError('Student class not available. Cannot load assignments.');
        setLoading(false);
        return;
      }

      try {
        const headers = schoolId ? { 'x-admin-id': schoolId } : {};
        const res = await fetch(`${API_BASE_URL}/Assignments/Class/${classId}`, { headers });
        const data = await res.json();
        if (res.ok) {
          setAssignments(Array.isArray(data) ? data : data.assignments || []);
        } else {
          setError(data.message || 'Failed to load assignments');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [currentUser]);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Assignments</Typography>
        {loading ? <CircularProgress /> : error ? <Typography color="error">{error}</Typography> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Teacher</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a._id}>
                    <TableCell>{a.title}</TableCell>
                    <TableCell>{a.description}</TableCell>
                    <TableCell>{a.dueDate ? a.dueDate.substring(0,10) : ''}</TableCell>
                    <TableCell>{a.subject?.subName || ''}</TableCell>
                    <TableCell>{a.teacher?.name || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default StudentAssignments;
