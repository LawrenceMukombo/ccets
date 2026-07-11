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
import Settings from './pages/Settings';
import TenantPicker from './pages/TenantPicker';
import { useTenant } from './context/TenantContext';

// Clears tenant + auth state and redirects to the picker
const SwitchTenant = ({ onLogout, setTenantFn }) => {
    useEffect(() => {
        // Clear everything so the picker is shown fresh
        localStorage.removeItem('tenantCode');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (onLogout) onLogout();
        if (setTenantFn) setTenantFn(null);
    }, []);
    return <Navigate to="/" replace />;
};


function App() {
    const { tenantCode } = useTenant();

    
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
        if (isAuthenticated && tenantCode) {
            // Fetch fresh current user details from API
            fetch(`/api/${tenantCode}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
                .then(res => {
                    if (res.status === 401 || res.status === 403) {
                        throw new Error('Unauthorized');
                    }
                    return res.json();
                })
                .then(data => {
                    setCurrentUser(data);
                    // Update localStorage with fresh data
                    localStorage.setItem('user', JSON.stringify(data));
                })
                .catch(err => {
                    console.error('Error fetching user:', err);
                    if (err.message === 'Unauthorized') {
                        handleLogout();
                    }
                });
        }
    }, [isAuthenticated, tenantCode]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setCurrentUser(null);
    };

    const { setTenant } = useTenant();

    const handleSwitchCountry = () => {
        // Full reset — clears tenant, auth state, and user
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tenantCode');
        setIsAuthenticated(false);
        setCurrentUser(null);
        setTenant(null);
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
            <Navigation user={currentUser} onLogout={handleLogout} onSwitchCountry={handleSwitchCountry} theme={theme} toggleTheme={toggleTheme} />
            <WelcomeBanner user={currentUser} />
            {children}
            <Footer />
        </>
    );

    const ProtectedRoute = ({ children, allowedRoles, requiredPermission }) => {
        if (!tenantCode) return <Navigate to="/" replace />;
        if (!isAuthenticated) return <Navigate to="/login" replace />;
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
    
    // Require Tenant for public pages too
    const RequireTenant = ({ children }) => {
        if (!tenantCode) return <Navigate to="/" replace />;
        return children;
    };

    return (
        <Router>
            <Routes>
                {/* Root URL now always shows the picker if not logged in, preventing "sticky" defaults */}
                <Route path="/" element={isAuthenticated && tenantCode ? <Navigate to="/dashboard" /> : <TenantPicker />} />
                {/* /switch — always clears tenant+auth and returns to picker */}
                <Route path="/switch" element={<SwitchTenant onLogout={handleLogout} setTenantFn={setTenant} />} />
                <Route path="/login" element={<RequireTenant><Login onLogin={() => setIsAuthenticated(true)} /></RequireTenant>} />
                <Route
                    path="/dashboard"
                    element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
                />
                <Route
                    path="/tickets"
                    element={<ProtectedRoute><Tickets /></ProtectedRoute>}
                />
                <Route
                    path="/repairs"
                    element={<ProtectedRoute><Repairs /></ProtectedRoute>}
                />
                <Route
                    path="/map"
                    element={<ProtectedRoute><Map /></ProtectedRoute>}
                />
                <Route
                    path="/reports"
                    element={<ProtectedRoute><Reports /></ProtectedRoute>}
                />
                <Route
                    path="/facilities"
                    element={<ProtectedRoute><Facilities /></ProtectedRoute>}
                />
                <Route
                    path="/equipment"
                    element={<ProtectedRoute><Equipment /></ProtectedRoute>}
                />
                <Route
                    path="/audit"
                    element={
                        <ProtectedRoute allowedRoles={['Administrator', 'National Manager']}>
                            <Audit />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/workspace"
                    element={<ProtectedRoute><TechnicianWorkspace /></ProtectedRoute>}
                />
                <Route
                    path="/user-management"
                    element={
                        <ProtectedRoute allowedRoles={['Administrator', 'National Manager']} requiredPermission="manage_users">
                            <UserManagement />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/notifications"
                    element={<ProtectedRoute><Notifications /></ProtectedRoute>}
                />
                <Route
                    path="/settings"
                    element={<ProtectedRoute><Settings /></ProtectedRoute>}
                />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
