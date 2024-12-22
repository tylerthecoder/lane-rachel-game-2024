import React, { useEffect, useState } from 'react';
import { WebSocketManager } from '../services/WebSocketManager';
import './ConnectionStatus.css';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export const ConnectionStatus: React.FC = () => {
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const wsManager = WebSocketManager.getInstance();

    useEffect(() => {
        // Set initial state
        if (wsManager.isConnected()) {
            setConnectionState('connected');
        } else if (wsManager.isConnecting()) {
            setConnectionState('connecting');
        } else {
            setConnectionState('disconnected');
        }

        // Subscribe to connection state updates
        const unsubscribeConnect = wsManager.onConnection(() => {
            setConnectionState('connected');
        });

        const unsubscribeConnecting = wsManager.onConnecting(() => {
            setConnectionState('connecting');
        });

        const unsubscribeDisconnect = wsManager.onDisconnect(() => {
            setConnectionState('disconnected');
        });

        return () => {
            unsubscribeConnect();
            unsubscribeConnecting();
            unsubscribeDisconnect();
        };
    }, []);

    const getStatusIcon = () => {
        switch (connectionState) {
            case 'connected':
                return '🟢';
            case 'connecting':
                return '🟡';
            case 'disconnected':
                return '🔴';
        }
    };

    const getStatusText = () => {
        switch (connectionState) {
            case 'connected':
                return 'Connected';
            case 'connecting':
                return 'Connecting...';
            case 'disconnected':
                return 'Disconnected';
        }
    };

    return (
        <div className={`connection-status ${connectionState}`}>
            {getStatusIcon()} {getStatusText()}
        </div>
    );
};