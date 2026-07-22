import React from 'react';
import { Card, Box, Typography, Avatar } from '@mui/material';

export default function StatCard({ title, value, subtitle, Icon, accentColor }) {
  return (
    <Card
      sx={{
        p: { xs: 1.5, sm: 2 }, // Compact padding for mobile screens
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}bf 100%)`,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 0.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              fontSize: { xs: '0.75rem', sm: '0.875rem' }, 
              lineHeight: 1.2, 
              fontWeight: 600,
              mb: 0.5
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="h5" 
            fontWeight="bold" 
            sx={{ 
             fontSize: { xs: '0.75rem', md: '0.875rem' },
              my: 0.5 
            }}
          >
            {value}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              display: 'block', 
              fontSize: { xs: '0.65rem', md: '0.75rem' }, 
              lineHeight: 1.1 
            }}
          >
            {subtitle}
          </Typography>
        </Box>
        <Avatar
          sx={{
            bgcolor: accentColor,
            color: 'white',
            width: { xs: 32, sm: 40 },
            height: { xs: 32, sm: 40 },
            flexShrink: 0,
          }}
        >
          {Icon && <Icon sx={{ fontSize: { xs: 18, sm: 24 } }} />}
        </Avatar>
      </Box>
    </Card>
  );
}