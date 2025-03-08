import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface StopwatchContextType {
  time: number;
  isRunning: boolean;
  isStopped: boolean;
  handlePlayPause: () => void;
  handleStop: () => void;
  handleReset: () => void;
}

const StopwatchContext = createContext<StopwatchContextType>({
  time: 0,
  isRunning: false,
  isStopped: false,
  handlePlayPause: () => { console.log('Play/Pause clicked'); },
  handleStop: () => { console.log('Stop clicked'); },
  handleReset: () => { console.log('Reset clicked'); }
});

export const useStopwatch = () => useContext(StopwatchContext);

export const StopwatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  const handlePlayPause = useCallback(() => {
    if (isStopped) return;
    setIsRunning(prev => !prev);
  }, [isStopped]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    setIsStopped(true);
  }, []);

  const handleReset = useCallback(() => {
    setTime(0);
    setIsRunning(false);
    setIsStopped(false);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isRunning) {
      const startTime = Date.now() - time;
      intervalId = setInterval(() => {
        setTime(Date.now() - startTime);
      }, 10);
    }

    return () => clearInterval(intervalId);
  }, [isRunning, time]);

  return (
    <StopwatchContext.Provider value={{
      time,
      isRunning,
      isStopped,
      handlePlayPause,
      handleStop,
      handleReset
    }}>
      {children}
    </StopwatchContext.Provider>
  );
};
