import React, { useEffect, useState } from 'react';
import GradesBarChart from './charts/GradesBarChart';

const Dashboard = () => {
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("authToken");

      if (!token) {
        setErrorMsg("User not authenticated.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:8000/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();

        const formattedSubjects = data.subjects.map(([subject, completed, title]) => ({
          subject,
          completed,
          title,
        }));

        setSubjects(formattedSubjects);
        

        const subjectCount = {};
        formattedSubjects.forEach(({ subject, completed }) => {
          if (!subjectCount[subject]) {
            subjectCount[subject] = { completed: 0, total: 0 };
          }
          subjectCount[subject].total += 1;
          if (completed) {
            subjectCount[subject].completed += 1;
          }
        });

        const chartFormatted = Object.entries(subjectCount).map(([subject, counts]) => ({
          subject,
          completed: counts.completed,
          pending: counts.total - counts.completed,
        }));
        setChartData(chartFormatted);

        const uniqueSubjects = Array.from(new Set(formattedSubjects.map(item => item.subject)));


        const defaultTimes = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM", "05:30 PM"]; // More if needed
        let selectedSubjects = [];

        if (uniqueSubjects.length <= 3) {
          selectedSubjects = uniqueSubjects;
        } else {
          while (selectedSubjects.length < 3) {
            const random = uniqueSubjects[Math.floor(Math.random() * uniqueSubjects.length)];
            if (!selectedSubjects.includes(random)) {
              selectedSubjects.push(random);
            }
          }
        }

        // 🧠 Step 4: Assign default time (looping if more subjects than times)
        const finalTimetable = selectedSubjects.map((subject, index) => ({
          subject,
          time: defaultTimes[index % defaultTimes.length]
        }));

        setTimetable(finalTimetable);



      } catch (error) {
        setErrorMsg(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="dashboard">
      <div className="grades-section">
        <h2>Academic Tasks</h2>
        {subjects.length > 0 ? (
          <div className="grades-container">
            {subjects.map((task, index) => (
              <div key={index} className="grade-card">
                <h3>{task.subject}</h3>
                <div className="grade-details">
                  <span>{task.title}</span>
                  <span
                    className="percentage"
                    style={{ color: task.completed ? "green" : "red" }}
                  >
                    {task.completed ? "✅ Completed" : "❌ Not Completed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ paddingLeft: "20px" }}>
            {isLoading ? "Loading tasks..." : "No academic tasks available."}
          </p>
        )}
      </div>

      <div style={{ padding: "20px" }} className="performance-chart">
        <h2>Performance Chart</h2>
        {chartData.length > 0 ? (
          <GradesBarChart data={chartData} />
        ) : (
          <p style={{ paddingLeft: "20px" }}>
            {isLoading ? "Loading chart..." : "No chart data available."}
          </p>
        )}
      </div>

      <div className="timetable-section">
        <h2>Today's Timetable</h2>
        {timetable.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Subject</th>
              </tr>
            </thead>
            <tbody>
              {timetable.map((entry, index) => (
                <tr key={index}>
                  <td>{entry.time}</td>
                  <td>{entry.subject}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ paddingLeft: "20px" }}>
            {isLoading ? "Loading timetable..." : "No timetable data available."}
          </p>
        )}
      </div>

      {errorMsg && <p style={{ color: "red", padding: "20px" }}>{errorMsg}</p>}
    </div>
  );
};

export default Dashboard;
