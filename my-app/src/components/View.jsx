import React, { useState } from "react";
import Calendar from "./goals/Calendar";
import TaskViewer from "./goals/TaskViewer";

export default function View() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <div className="app">
      <h1>📅 Task Calendar</h1>
      <div className="container">
        <Calendar 
          selectedDate={selectedDate} 
          onDateClick={setSelectedDate} 
        />
        <TaskViewer selectedDate={selectedDate} />
      </div>
    </div>
  );
}