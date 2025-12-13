"use client";
import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

type Severity = 'success' | 'info' | 'warning' | 'error';

type NotificationProps = {
  open: boolean;
  onClose: () => void;
  severity?: Severity;
  message?: React.ReactNode;
  autoHideDuration?: number;
};

export default function Notification({ open, onClose, severity = 'info', message = '', autoHideDuration = 4000 }: NotificationProps) {
  return (
    <Snackbar open={open} onClose={onClose} autoHideDuration={autoHideDuration} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
