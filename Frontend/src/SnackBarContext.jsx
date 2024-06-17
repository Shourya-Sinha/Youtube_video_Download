import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const SnackbarQueueContext = createContext();

export const SnackbarProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);
  const [currentSnackbar, setCurrentSnackbar] = useState(null);

  const enqueueSnackbar = (message, severity) => {
    setQueue((prevQueue) => [...prevQueue, { message, severity }]);
  };

  const handleClose = () => {
    setCurrentSnackbar(null);
    setTimeout(() => {
      if (queue.length > 0) {
        setCurrentSnackbar(queue[0]);
        setQueue((prevQueue) => prevQueue.slice(1));
      }
    }, 300);
  };

  React.useEffect(() => {
    if (!currentSnackbar && queue.length > 0) {
      setCurrentSnackbar(queue[0]);
      setQueue((prevQueue) => prevQueue.slice(1));
    }
  }, [queue, currentSnackbar]);

  return (
    <SnackbarQueueContext.Provider value={enqueueSnackbar}>
      {children}
      {currentSnackbar && (
        <Snackbar
          open={Boolean(currentSnackbar)}
          autoHideDuration={6000}
          onClose={handleClose}
        >
          <Alert
            onClose={handleClose}
            severity={currentSnackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {currentSnackbar.message}
          </Alert>
        </Snackbar>
      )}
    </SnackbarQueueContext.Provider>
  );
};

export const useSnackbar = () => {
  return useContext(SnackbarQueueContext);
};
