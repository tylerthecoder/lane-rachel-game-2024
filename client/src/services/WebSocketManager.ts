import { GameState, ServerMessage, ClientMessage } from '@shared/types/GameState';

type ConnectionCallback = (isConnected: boolean) => void;
type GameStateCallback = (gameState: GameState) => void;
type GameStartCallback = () => void;

export class WebSocketManager {
    private static instance: WebSocketManager;
    private ws: WebSocket | null = null;
    private connectionCallbacks: Set<ConnectionCallback> = new Set();
    private gameStateCallbacks: Set<GameStateCallback> = new Set();
    private gameStartCallbacks: Set<GameStartCallback> = new Set();

    private constructor() {}

    public static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    public connect() {
        if (this.ws) return;

        this.ws = new WebSocket('ws://localhost:3000');

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.notifyConnectionCallbacks(true);
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data) as ServerMessage;
            switch (message.type) {
                case 'gameState':
                    this.notifyGameStateCallbacks(message.payload);
                    break;
                case 'gameStarted':
                    this.notifyGameStartCallbacks();
                    break;
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.notifyConnectionCallbacks(false);
            this.ws = null;
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    public sendMessage(message: ClientMessage) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    public onConnection(callback: ConnectionCallback) {
        this.connectionCallbacks.add(callback);
        return () => this.connectionCallbacks.delete(callback);
    }

    public onGameState(callback: GameStateCallback) {
        this.gameStateCallbacks.add(callback);
        return () => this.gameStateCallbacks.delete(callback);
    }

    public onGameStart(callback: GameStartCallback) {
        this.gameStartCallbacks.add(callback);
        return () => this.gameStartCallbacks.delete(callback);
    }

    private notifyConnectionCallbacks(isConnected: boolean) {
        this.connectionCallbacks.forEach(callback => callback(isConnected));
    }

    private notifyGameStateCallbacks(gameState: GameState) {
        this.gameStateCallbacks.forEach(callback => callback(gameState));
    }

    private notifyGameStartCallbacks() {
        this.gameStartCallbacks.forEach(callback => callback());
    }

    public isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}