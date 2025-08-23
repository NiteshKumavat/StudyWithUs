import React, { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import './NotificationBell.css'; 

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("authToken");
  const fetchNotifications = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications || []);
      } else {
        throw new Error(data.error || 'Failed to load notifications');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 300000); // Refresh every 5 mins
    return () => clearInterval(interval);
  }, [token]);

  const getNotificationTypeClass = (type) => {
    switch (type) {
      case 'overdue': return 'notification-overdue';
      case 'due_today': return 'notification-due-today';
      case 'due_tomorrow': return 'notification-due-tomorrow';
      default: return 'notification-default';
    }
  };

  return (
    <div className="notification-bell-container">
      <button
        className="notification-bell-button"
        onClick={() => {
          if (!isOpen) fetchNotifications();
          setIsOpen(!isOpen);
        }}
      >
        <BellIcon className="notification-bell-icon" />
        {notifications.length > 0 && (
          <span className="notification-badge"></span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button 
              className="notification-close-btn"
              onClick={() => setIsOpen(false)}
            >
              &times;
            </button>
          </div>
          
          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">Loading...</div>
            ) : error ? (
              <div className="notification-error">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              notifications.map((notif, index) => (
                <div 
                  key={index}
                  className={`notification-item ${getNotificationTypeClass(notif.type)}`}
                >
                  <div className="notification-item-header">
                    <span className="notification-type-icon">
                      {notif.type === 'overdue' ? '⚠️' : 
                       notif.type === 'due_today' ? '⏰' : 'ℹ️'}
                    </span>
                    <strong className="notification-title">{notif.title}</strong>
                    <span className="notification-date">
                      {new Date(notif.deadline).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="notification-message">{notif.message}</div>
                  {notif.subject && (
                    <div className="notification-subject">Subject: {notif.subject}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export default NotificationBell;