import React, { useState, useEffect, useRef } from "react";


export default function Pomodoro() {
  const WORK_TIME = 25 * 60; 
  const BREAK_TIME = 5 * 60; 

  const [secondsLeft, setSecondsLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkTime, setIsWorkTime] = useState(true);

  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev === 1) {
            clearInterval(intervalRef.current);
            const nextMode = !isWorkTime;
            setIsWorkTime(nextMode);
            setSecondsLeft(nextMode ? BREAK_TIME : WORK_TIME);
            return nextMode ? BREAK_TIME : WORK_TIME;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, isWorkTime]);

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const resetTimer = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsWorkTime(true);
    setSecondsLeft(WORK_TIME);
  };

  const formatTime = (time) => {
    const min = String(Math.floor(time / 60)).padStart(2, "0");
    const sec = String(time % 60).padStart(2, "0");
    return `${min}:${sec}`;
  };

  return (
    <div className="pomodoro-section">
      <div className="pomodoro">
        <h2>🍅 Pomodoro Timer</h2>
        <p className="pomodoro-mode">{isWorkTime ? "Work Time" : "Break Time"}</p>
        <div className="pomodoro-clock">{formatTime(secondsLeft)}</div>
        <div className="pomodoro-buttons">
          <button onClick={toggleTimer}>{isRunning ? "Pause" : "Start"}</button>
          <button onClick={resetTimer}>Reset</button>
        </div>
      </div>
    </div>
  );
}
