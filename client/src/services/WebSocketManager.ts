import { GameState, ServerMessage, ClientMessage } from '@shared/GameState';

type ConnectionCallback = (isConnected: boolean) => void;
type ConnectingCallback = () => void;
type DisconnectCallback = () => void;
type GameStateCallback = (gameState: GameState) => void;
type GameStartCallback = () => void;

export class WebSocketManager {
    private static instance: WebSocketManager;
    private ws: WebSocket | null = null;
    private connectionCallbacks: Set<ConnectionCallback> = new Set();
    private connectingCallbacks: Set<ConnectingCallback> = new Set();
    private disconnectCallbacks: Set<DisconnectCallback> = new Set();
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

        if (this.isConnecting()) {
            console.log('Skipping, Already connecting to WebSocket');
            return;
        }

        console.log('Connecting to WebSocket');
        this.notifyConnectingCallbacks();

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.host === 'localhost:5173' ? 'localhost:3000' : window.location.host;
        const wsUrl = `${protocol}//${hostname}/ws`;

        this.ws = new WebSocket(wsUrl);

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
            this.notifyDisconnectCallbacks();
            this.ws = null;
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    public disconnect() {
        console.log('Manually disconnecting from WebSocket');
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

    public onConnecting(callback: ConnectingCallback) {
        this.connectingCallbacks.add(callback);
        return () => this.connectingCallbacks.delete(callback);
    }

    public onDisconnect(callback: DisconnectCallback) {
        this.disconnectCallbacks.add(callback);
        return () => this.disconnectCallbacks.delete(callback);
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

    private notifyConnectingCallbacks() {
        this.connectingCallbacks.forEach(callback => callback());
    }

    private notifyDisconnectCallbacks() {
        this.disconnectCallbacks.forEach(callback => callback());
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

    public isConnecting(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.CONNECTING;
    }
}
