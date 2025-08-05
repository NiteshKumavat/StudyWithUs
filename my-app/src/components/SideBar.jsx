import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./sidebar.css"

const Sidebar = ({ items }) => {
  const navigate = useNavigate();

  const handleClick = (label, path) => {
    if (label.toLowerCase() === "logout") {
      localStorage.removeItem("authToken");
    }
    navigate(path);
  };

  return (
    <div className="sidebar">
      <h2 className="sidebar-title">Study With Us</h2>
      <ul className="sidebar-list">
        {Object.keys(items).map((key) => {
          const [label, path] = items[key];
          return (
            <li key={key} className="sidebar-item">
              <button
                onClick={() => handleClick(label, path)}
                className="sidebar-link"
              >
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Sidebar;
