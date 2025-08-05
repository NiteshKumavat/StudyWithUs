import React from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";

export default function Calendar({ selectedDate, onDateClick }) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const rows = [];
  let day = startDate;

  while (day <= endDate) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = day;
      const formatted = format(day, "d");
      const isSelected = isSameDay(day, selectedDate);
      const isInMonth = isSameMonth(day, monthStart);

      days.push(
        <div
          key={day}
          className={`calendar-day ${
            isSelected ? "selected" : ""
          } ${isToday(day) ? "today" : ""} ${isInMonth ? "" : "not-current"}`}
          onClick={() => onDateClick(currentDay)}
        >
          {formatted}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="calendar-row" key={day}>
        {days}
      </div>
    );
  }

  return (
    <div className="calendar">
      <h2 className="calendar-header">{format(monthStart, "MMMM yyyy")}</h2>
      <div className="calendar-weekdays">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="weekday">
            {d}
          </div>
        ))}
      </div>
      {rows}
    </div>
  );
}


