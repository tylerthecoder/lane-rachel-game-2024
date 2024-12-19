import React, { useEffect, useState } from 'react';
import { WebSocketManager } from '../services/WebSocketManager';
import './ConnectionStatus.css';

export const ConnectionStatus: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const wsManager = WebSocketManager.getInstance();

    useEffect(() => {
        const unsubscribe = wsManager.onConnection((isConnected) => {
            setIsConnected(isConnected);
        });
        return unsubscribe;
    }, []);

    return (
        <div className={`connection-status ${isConnected ? 'connected' : 'connecting'}`}>
            {isConnected ? '🟢 Connected' : '🟡 Connecting...'}
        </div>
    );
};