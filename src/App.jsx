import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import WelcomeBanner from './components/WelcomeBanner';
import Footer from './components/Footer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import Repairs from './pages/Repairs';
import Map from './pages/Map';
import Reports from './pages/Reports';
import Facilities from './pages/Facilities';
import Equipment from './pages/Equipment';
import Audit from './pages/Audit';
import TechnicianWorkspace from './pages/TechnicianWorkspace';
import UserManagement from './pages/UserManagement';
import Notifications from './pages/Notifications';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return !!localStorage.getItem('token');
    });

    const [currentUser, setCurrentUser] = useState(() => {
        // Load user from localStorage immediately to avoid showing "User"
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    // Theme Management
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.body.className = theme;
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    useEffect(() => {
        if (isAuthenticated) {
            // Fetch fresh current user details from API
            fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    setCurrentUser(data);
                    // Update localStorage with fresh data
                    localStorage.setItem('user', JSON.stringify(data));
                })
                .catch(err => console.error('Error fetching user:', err));
        }
    }, [isAuthenticated]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setCurrentUser(null);
    };

    // Auto Logout Logic (10 minutes)
    useEffect(() => {
        let timeout;
        const resetTimer = () => {
            if (isAuthenticated) {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    console.log('Auto-logging out due to inactivity');
                    handleLogout();
                }, 10 * 60 * 1000); // 10 minutes
            }
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        if (isAuthenticated) {
            events.forEach(event => window.addEventListener(event, resetTimer));
            resetTimer(); // Init timer
        }

        return () => {
            if (timeout) clearTimeout(timeout);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [isAuthenticated]);

    const AuthenticatedLayout = ({ children }) => (
        <>
            <Navigation user={currentUser} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            <WelcomeBanner user={currentUser} />
            {children}
            <Footer />
        </>
    );

    const ProtectedRoute = ({ children, allowedRoles, requiredPermission }) => {
        if (!currentUser) return null; // Wait for user to load

        // Normalize role check (handle potential case sensitivity or missing roles)
        const userRole = currentUser.role_name;

        let authorized = true;
        // If restrictions exist, assume unauthorized unless a condition is met
        if (allowedRoles || requiredPermission) {
            authorized = false;
            if (allowedRoles && allowedRoles.includes(userRole)) authorized = true;
            if (requiredPermission && currentUser.permissions?.includes(requiredPermission)) authorized = true;
        }

        if (!authorized) {
            return <Navigate to="/dashboard" replace />;
        }
        return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
    };

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
                <Route
                    path="/dashboard"
                    element={isAuthenticated ? <AuthenticatedLayout><Dashboard /></AuthenticatedLayout> : <Navigate to="/login" />}
                />
                <Route
                    path="/tickets"
                    element={isAuthenticated ? <AuthenticatedLayout><Tickets /></AuthenticatedLayout> : <Navigate to="/login" />}
                />
                <Route
                    path="/repairs"
                    element={isAuthenticated ? <AuthenticatedLayout><Repairs /></AuthenticatedLayout> : <Navigate to="/login" />}
                />
                <Route
                    path="/map"
                    element={isAuthenticated ? <AuthenticatedLayout><Map /></AuthenticatedLayout> : <Navigate to="/login" />}
                />
                <Route
                    path="/reports"
                    element={isAuthenticated ? <AuthenticatedLayout><Reports /></AuthenticatedLayout> : <Navigate to="/login" />}
                />
                <Route
                    path="/facilities"
                    element={isAuthenticated ? <AuthenticatedLayout><Facilities /></AuthenticatedLayout> : <Navigate to="/login" />}
                />
                <Route
                    path="/equipment"
                    element={isAuthenticated ? <AuthenticatedLayout><Equipment /></AuthenticatedLayout> : <Navigate to="/login" />}
                />
                <Route
                    path="/audit"
                    element={isAuthenticated ?
                        <ProtectedRoute allowedRoles={['Administrator', 'National Manager']}>
                            <Audit />
                        </ProtectedRoute> : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/workspace"
                    element={isAuthenticated ? <AuthenticatedLayout><TechnicianWorkspace /></AuthenticatedLayout> : <Navigate to="/login" />}
                />
                <Route
                    path="/user-management"
                    element={isAuthenticated ?
                        <ProtectedRoute allowedRoles={['Administrator', 'National Manager']} requiredPermission="manage_users">
                            <UserManagement />
                        </ProtectedRoute> : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/notifications"
                    element={isAuthenticated ? <AuthenticatedLayout><Notifications /></AuthenticatedLayout> : <Navigate to="/login" />}
                />
                <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
}

export default App;
