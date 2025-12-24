import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (userId) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const socketRef = useRef();

    useEffect(() => {
        if (!userId) return;

        // Connect to the server defined in proxy or absolute URL
        // Using "" connects to window.location.host, which is proxied by Vite
        socketRef.current = io('', {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to socket server');
            socket.emit('join_user', userId);
        });

        socket.on('notification', (notification) => {
            console.log('New notification:', notification);
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Optional: Request browser notification permission and show
            if (Notification.permission === 'granted') {
                new Notification('New Ticket Update', { body: notification.message });
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from socket server');
        });

        return () => {
            socket.disconnect();
        };
    }, [userId]);

    const markAllRead = () => {
        setUnreadCount(0);
    };

    const clearNotifications = () => {
        setNotifications([]);
        setUnreadCount(0);
    };

    return { notifications, unreadCount, markAllRead, clearNotifications };
};
