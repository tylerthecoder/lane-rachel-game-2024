import type { ClientMessage, ServerMessage } from '../../../server/src/types';

interface GameMessage {
    type: 'connect' | 'startGame' | 'gameState' | 'gameStarted';
    payload?: any;
}

interface GameState {
    players: Array<{
        id: string;
        name: string;
        isReady: boolean;
    }>;
    isStarted: boolean;
}

export class GameSocket {
    private ws: WebSocket | null = null;
    private messageHandlers: ((message: GameMessage) => void)[] = [];

    connect(playerName: string) {
        this.ws = new WebSocket('ws://localhost:3000');

        this.ws.onopen = () => {
            console.log('Connected to game server');
            this.sendMessage({
                type: 'connect',
                payload: playerName
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as GameMessage;
                console.log('Received message:', message);
                this.messageHandlers.forEach(handler => handler(message));
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from game server');
        };
    }

    sendMessage(message: GameMessage) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('Sending message:', message);
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    addMessageHandler(handler: (message: GameMessage) => void) {
        this.messageHandlers.push(handler);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.messageHandlers = [];
    }
}