
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Paper, Box, Checkbox, Typography
} from '@mui/material';
import { getAllComplains } from '../../../redux/complainRelated/complainHandle';
import TableTemplate from '../../../components/TableTemplate';

const SeeComplains = () => {

  const label = { inputProps: { 'aria-label': 'Checkbox demo' } };
  const dispatch = useDispatch();
  const { complainsList, loading, error, response } = useSelector((state) => state.complain);
  const { currentUser } = useSelector(state => state.user)

  useEffect(() => {
    if (!currentUser?._id) return;
    dispatch(getAllComplains(currentUser._id, "Complain"));
  }, [currentUser?._id, dispatch]);

  if (error) {
    console.log(error);
  }

  const hasComplaints = Array.isArray(complainsList) && complainsList.length > 0;

  const complainColumns = [
    { id: 'user', label: 'User', minWidth: 170 },
    { id: 'complaint', label: 'Complaint', minWidth: 100 },
    { id: 'date', label: 'Date', minWidth: 170 },
  ];

  const complainRows = hasComplaints ? complainsList.map((complain) => {
    const date = new Date(complain.date);
    const dateString = date.toString() !== "Invalid Date" ? date.toISOString().substring(0, 10) : "Invalid Date";
    return {
      user: complain.user?.name || 'Unknown',
      complaint: complain.complaint,
      date: dateString,
      id: complain._id,
    };
  }) : [];

  const ComplainButtonHaver = ({ row }) => {
    return (
      <>
        <Checkbox {...label} />
      </>
    );
  };

  return (
    <>
      {loading ?
        <div>Loading...</div>
        :
        <Paper sx={{ width: '100%', overflow: 'hidden', p: 2 }}>
          {response || !hasComplaints ?
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '180px' }}>
              <Typography variant="h6">
                {response || 'No Complaints Right Now'}
              </Typography>
            </Box>
            :
            <TableTemplate buttonHaver={ComplainButtonHaver} columns={complainColumns} rows={complainRows} />
          }
        </Paper>
      }
    </>
  );
};

export default SeeComplains;
