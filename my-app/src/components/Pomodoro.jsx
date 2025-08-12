import React, { useState, useEffect, useRef } from "react";
import "./Pomodaro.css";

export default function Pomodoro() {
  document.title = "Pomodaro"
  const WORK_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  const [secondsLeft, setSecondsLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkTime, setIsWorkTime] = useState(true);
  const [sessions, setSessions] = useState([]); 

  const intervalRef = useRef(null);
  const token = localStorage.getItem("authToken");

  const saveSession = async (sessionType, duration) => {
    try {
      
      const response = await fetch("/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_type: sessionType,
          duration: duration,
        }),
      });

      const data = await response.json();
      console.log("Session saved:", data);

      fetchSessions();
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch("/sessions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log("Fetched sessions:", data); // Debugging log

      if (Array.isArray(data)) {
        setSessions(data);
      } else {
        console.warn("Expected array but got:", data);
        setSessions([]); 
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setSessions([]); 
    }
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev === 1) {
            clearInterval(intervalRef.current);

            saveSession(
              isWorkTime ? "work" : "break",
              isWorkTime ? WORK_TIME : BREAK_TIME
            );

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

  useEffect(() => {
    fetchSessions();
  }, []);

  const toggleTimer = () => setIsRunning((prev) => !prev);

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
        <p className="pomodoro-mode">
          {isWorkTime ? "Work Time" : "Break Time"}
        </p>
        <div className="pomodoro-clock">{formatTime(secondsLeft)}</div>
        <div className="pomodoro-buttons">
          <button onClick={toggleTimer}>
            {isRunning ? "Pause" : "Start"}
          </button>
          <button onClick={resetTimer}>Reset</button>
        </div>
      </div>


      <div className="pomodoro-history">
        <h3>📜 Session History</h3>
        {sessions.length === 0 ? (
          <p>No sessions yet</p>
        ) : (
          <ul>
            {sessions.map((session) => (
              <li key={session.id}>
                <strong>{session.session_type.toUpperCase()}</strong> -{" "}
                {session.duration } min
                <span style={{ marginLeft: "10px", color: "gray" }}>
                  ({new Date(session.completed_at).toLocaleString()})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

