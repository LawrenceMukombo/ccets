import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket = null;
let useCount = 0;
let disconnectTimer = null;
const listeners = new Set();
let notificationsList = [];
let globalUnreadCount = 0;

const addListener = (callback) => {
    listeners.add(callback);
};

const removeListener = (callback) => {
    listeners.delete(callback);
};

const notifyAll = () => {
    listeners.forEach(cb => cb({
        notifications: [...notificationsList],
        unreadCount: globalUnreadCount
    }));
};

export const useSocket = (userId) => {
    const [state, setState] = useState({
        notifications: notificationsList,
        unreadCount: globalUnreadCount
    });

    useEffect(() => {
        if (!userId) return;

        if (disconnectTimer) {
            clearTimeout(disconnectTimer);
            disconnectTimer = null;
        }

        useCount++;
        const handleUpdate = (updatedState) => {
            setState(updatedState);
        };
        addListener(handleUpdate);

        if (!socket) {
            // Point to backend port 5050 directly in local dev mode to avoid Vite proxy closed errors
            const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                ? 'http://localhost:5050' 
                : '';
            const tenantCode = localStorage.getItem('tenantCode');

            socket = io(socketUrl, {
                path: '/socket.io',
                transports: ['websocket', 'polling']
            });

            socket.on('connect', () => {
                console.log('Connected to socket server');
                if (tenantCode) {
                    socket.emit('join_user', `${tenantCode}_${userId}`);
                } else {
                    socket.emit('join_user', userId);
                }
            });

            socket.on('notification', (notification) => {
                console.log('New notification:', notification);
                notificationsList = [notification, ...notificationsList];
                globalUnreadCount++;
                notifyAll();

                if (Notification.permission === 'granted') {
                    new Notification('New Ticket Update', { body: notification.message });
                }
            });

            socket.on('integration_sync_alert', (data) => {
                console.log('Integration sync alert received:', data);
                const notification = {
                    id: Date.now(),
                    type: 'integration_sync',
                    message: data.message,
                    timestamp: new Date()
                };
                notificationsList = [notification, ...notificationsList];
                globalUnreadCount++;
                notifyAll();

                // Dispatch a window event for direct component listening (e.g. settings page health tab)
                const event = new CustomEvent('integration_sync_alert', { detail: data });
                window.dispatchEvent(event);
            });

            socket.on('disconnect', () => {
                console.log('Disconnected from socket server');
            });
        }

        return () => {
            removeListener(handleUpdate);
            useCount = Math.max(0, useCount - 1);
            if (useCount === 0 && socket) {
                if (disconnectTimer) clearTimeout(disconnectTimer);
                disconnectTimer = setTimeout(() => {
                    if (useCount === 0 && socket) {
                        socket.disconnect();
                        socket = null;
                    }
                    disconnectTimer = null;
                }, 2000);
            }
        };
    }, [userId]);

    const markAllRead = () => {
        globalUnreadCount = 0;
        notifyAll();
    };

    const clearNotifications = () => {
        notificationsList = [];
        globalUnreadCount = 0;
        notifyAll();
    };

    return { 
        notifications: state.notifications, 
        unreadCount: state.unreadCount, 
        markAllRead, 
        clearNotifications 
    };
};
