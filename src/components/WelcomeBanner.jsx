import React, { useState, useEffect } from 'react';
import './WelcomeBanner.css';

const WelcomeBanner = ({ user }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000); // Update every second

        return () => clearInterval(timer);
    }, []);

    const formatDateTime = (date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const month = months[date.getMonth()];

        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;

        return `${day} ${month} ${hours}:${minutes}:${seconds} ${ampm}`;
    };

    // Get user's first name, or fallback to username, or "User"
    const getUserName = () => {
        if (!user) {
            return 'User';
        }

        // Try first_name, firstName, or username
        if (user.first_name) return user.first_name;
        if (user.firstName) return user.firstName;
        if (user.username) return user.username;

        return 'User';
    };

    const userName = getUserName();

    return (
        <div className="welcome-banner">
            <div className="welcome-message">
                <span className="welcome-emoji">👋</span>
                <span className="welcome-text">
                    Welcome back, <strong>{userName}</strong>!
                    {user?.role_name && (
                        <span className="user-role"> • {user.role_name}</span>
                    )}
                    {user?.location && (
                        <span className="user-location"> • 📍 {user.location}</span>
                    )}
                </span>
            </div>
            <div className="welcome-datetime">
                <span className="datetime-icon">📅</span>
                <span className="datetime-text">{formatDateTime(currentTime)}</span>
            </div>
        </div>
    );
};

export default WelcomeBanner;
