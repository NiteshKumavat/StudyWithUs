import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import GoalManager from "./components/GoalManager";
import Dashboard from "./components/DashBoard";
import Sidebar from "./components/SideBar";
import View from "./components/View";
import Pomodoro from "./components/Pomodoro";
import AuthForm from "./components/login";
import ProtectedRoute from "./components/ProtectedRoute";
import NotificationBell from "./components/NotificationBell";
import QuizApp from "./components/QuizApp";
import "./App.css";

const navItems = {
  0: ["Dashboard", "/dashboard"],
  1: ["View Goal", "/view"],
  2: ["Goal Management", "/setGoals"],
  3: ["Pomodaro", "/timer"],
  4 : ["Quiz", "/quiz"],
  5: ["logout", "/"],
};



function Layout() {
  const location = useLocation();
  const showSidebar = location.pathname !== "/"; 


  return (
    <div className="app-container">
      {showSidebar && <Sidebar items={navItems} />}
      <div className="main-content">
        {showSidebar && (
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "1rem" }}>
            <NotificationBell token={localStorage.getItem("token")} />
          </div>
        )}
        <Routes>
          <Route path="/" element={<AuthForm />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/setGoals"
            element={
              <ProtectedRoute>
                <GoalManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/view"
            element={
              <ProtectedRoute>
                <View />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timer"
            element={
              <ProtectedRoute>
                <Pomodoro />
              </ProtectedRoute>
            }
          />

          <Route
            path="/quiz"
            element={
              <ProtectedRoute>
                <QuizApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;


