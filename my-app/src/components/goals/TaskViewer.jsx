import React, { useState, useEffect } from "react";
import { format, isAfter, parseISO } from "date-fns";
import "./task.css";

export default function TaskViewer({ selectedDate }) {
  const [tasks, setTasks] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const dateKey = format(selectedDate, "yyyy-MM-dd");
        const res = await fetch(`/task/${dateKey}`, {
          headers: {
            Authorization: token
          }
        });
        const data = await res.json();
        if (res.ok) {
          setTasks(prev => ({ ...prev, [dateKey]: data.tasks }));
        } else {
          console.error(data.error);
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [selectedDate]);

  const handleComplete = async (taskId) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/task/${taskId}/complete`, {
        method: "PUT",
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        }
      });
      
      if (res.ok) {
        setTasks(prev => {
          const updatedTasks = { ...prev };
          Object.keys(updatedTasks).forEach(date => {
            updatedTasks[date] = updatedTasks[date].map(task => 
              task.id === taskId ? { ...task, completed: true } : task
            );
          });
          return updatedTasks;
        });
      } else {
        console.error("Failed to complete task");
      }
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const handleDelete = async (taskId, deadline) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/task/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: token
        }
      });
      
      if (res.ok) {
        setTasks(prev => {
          const updatedTasks = { ...prev };
          Object.keys(updatedTasks).forEach(date => {
            updatedTasks[date] = updatedTasks[date].filter(task => task.id !== taskId);
          });
          return updatedTasks;
        });
      } else {
        console.error("Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const dayTasks = tasks[dateKey] || [];

  if (isLoading) return <div className="task-viewer">Loading tasks...</div>;

  return (
    <div className="task-viewer">
      <h2>Tasks for {format(selectedDate, "PPP")}</h2>
      
      {dayTasks.length > 0 ? (
        <ul className="task-list">
          {dayTasks.map(task => {
            const deadlineDate = parseISO(task.deadline);
            const isPastDeadline = isAfter(new Date(), deadlineDate);
            const canDelete = !isPastDeadline && !task.completed;
            
            return (
              <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                <span className="task-text">
                  {task.completed ? '✓ ' : '○ '}{task.text}
                  {isPastDeadline && !task.completed && (
                    <span className="overdue-badge">OVERDUE</span>
                  )}
                </span>
                
                <div className="task-actions">
                  {!task.completed && (
                    <button 
                      onClick={() => handleComplete(task.id)}
                      className="complete-btn"
                    >
                      Complete
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleDelete(task.id, task.deadline)}
                    className={`delete-btn ${canDelete ? '' : 'disabled'}`}
                    disabled={!canDelete}
                    title={canDelete ? '' : "Cannot delete completed or past deadline tasks"}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No tasks for this day.</p>
      )}
    </div>
  );
}