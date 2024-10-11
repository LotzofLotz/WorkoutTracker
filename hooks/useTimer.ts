// hooks/useTimer.ts
import {useEffect, useRef, useState} from 'react';

const useTimer = (isTracking: boolean) => {
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isTracking) {
      const startTime = Date.now() - timeElapsed;

      intervalRef.current = setInterval(() => {
        setTimeElapsed(Date.now() - startTime);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTracking]);

  const resetTimeElapsed = () => {
    setTimeElapsed(0);
  };

  return {timeElapsed, resetTimeElapsed};
};

export default useTimer;
