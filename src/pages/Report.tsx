import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const Report: React.FC = () => {
  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Report
        </Typography>
        {/* Add your report content here */}
      </Box>
    </Container>
  );
};

export default Report;
