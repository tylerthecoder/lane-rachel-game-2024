import { WebSocket, WebSocketServer } from 'ws';
import {
    GameState,
    ServerGameState,
    Player,
    ClientMessage,
    ServerMessage,
    createInitialGameState,
    updateBikePosition,
    updateBuildings,
    updatePotholes
} from '@shared/GameState';

const wss = new WebSocketServer({ port: 3000 });

// Track game state
const gameState: ServerGameState = {
    players: [],
    isStarted: false,
    gameState: createInitialGameState()
};

// Store WebSocket connections with their associated player IDs
const connections = new Map<string, WebSocket>();

let gameLoopInterval: NodeJS.Timeout | null = null;
let lastUpdateTime = Date.now();

function updateGame(state: GameState): GameState {
    const now = Date.now();
    const deltaTime = (now - lastUpdateTime) / 1000;
    lastUpdateTime = now;

    // Update bike position
    const newBike = updateBikePosition(state, deltaTime);

    // Update buildings and handle collisions
    const buildingUpdates = updateBuildings(state.buildings, state, deltaTime);

    // Update potholes and handle collisions
    const potholeUpdates = updatePotholes(state.potholes, state, deltaTime);

    // Return updated state
    return {
        ...state,
        bike: newBike,
        buildings: buildingUpdates.buildings,
        potholes: potholeUpdates.potholes,
        score: buildingUpdates.score,
        goals: buildingUpdates.goals,
        health: potholeUpdates.health,
        collidedBuildingIds: buildingUpdates.collidedBuildingIds,
        collidedPotholeIds: potholeUpdates.collidedPotholeIds
    };
}

function startGameLoop() {
    console.log('Starting game loop...');
    if (gameLoopInterval) {
        console.log('Clearing existing game loop');
        clearInterval(gameLoopInterval);
    }

    // Initialize game state
    if (!gameState.gameState) {
        console.log('Initializing new game state');
        gameState.gameState = createInitialGameState();
    }
    gameState.gameState.players = gameState.players;
    gameState.gameState.isGameStarted = gameState.isStarted;

    // Start game loop at 30fps with broadcast
    gameLoopInterval = setInterval(() => {
        if (gameState.gameState) {
            // Update game state
            gameState.gameState = updateGame(gameState.gameState);
            gameState.gameState.players = gameState.players; // Keep players in sync

            // Broadcast state
            broadcastGameState();

            // Check for active connections
            let hasActiveConnections = false;
            connections.forEach((clientWs) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                    hasActiveConnections = true;
                }
            });

            if (!hasActiveConnections && gameLoopInterval) {
                console.log('No active connections, stopping game loop');
                clearInterval(gameLoopInterval);
                gameLoopInterval = null;
            }
        }
    }, 1000 / 30); // Update and broadcast at 30fps

    console.log('Game loop started');
}

function broadcastGameState() {
    if (!gameState.gameState) return;

    const gameStateMessage: ServerMessage = {
        type: 'gameState',
        payload: {
            ...gameState.gameState,
            lastUpdateTime: Date.now()
        }
    };

    const messageStr = JSON.stringify(gameStateMessage);
    connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(messageStr);
        }
    });
}

wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection established');
    let playerId: string;

    ws.on('message', (data: string) => {
        try {
            const message = JSON.parse(data) as ClientMessage;
            console.log('Received message:', message);

            // Initialize game state if not exists
            if (!gameState.gameState) {
                gameState.gameState = createInitialGameState();
            }

            switch (message.type) {
                case 'connect':
                    playerId = Math.random().toString(36).substring(7);
                    const newPlayer: Player = {
                        id: playerId,
                        name: message.payload,
                        isReady: false
                    };

                    console.log('New player connected:', { playerId, name: message.payload });
                    gameState.players.push(newPlayer);
                    connections.set(playerId, ws);
                    gameState.gameState.players = gameState.players;

                    broadcastGameState();
                    break;

                case 'startGame':
                    if (gameState.players.length >= 1) {
                        gameState.isStarted = true;
                        if (gameState.gameState) {
                            gameState.gameState.isGameStarted = true;
                        }
                        startGameLoop();

                        const startMessage: ServerMessage = { type: 'gameStarted' };
                        connections.forEach((clientWs) => {
                            if (clientWs.readyState === WebSocket.OPEN) {
                                clientWs.send(JSON.stringify(startMessage));
                            }
                        });
                    }
                    break;

                case 'moveLeft':
                case 'moveRight':
                case 'moveUp':
                case 'moveDown':
                    if (gameState.gameState && gameState.isStarted) {
                        const pressCount = message.pressed ? 1 : -1;
                        switch (message.type) {
                            case 'moveLeft':
                                gameState.gameState.bike.leftPressCount = Math.max(0, gameState.gameState.bike.leftPressCount + pressCount);
                                break;
                            case 'moveRight':
                                gameState.gameState.bike.rightPressCount = Math.max(0, gameState.gameState.bike.rightPressCount + pressCount);
                                break;
                            case 'moveUp':
                                gameState.gameState.bike.upPressCount = Math.max(0, gameState.gameState.bike.upPressCount + pressCount);
                                break;
                            case 'moveDown':
                                gameState.gameState.bike.downPressCount = Math.max(0, gameState.gameState.bike.downPressCount + pressCount);
                                break;
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        if (playerId) {
            gameState.players = gameState.players.filter(p => p.id !== playerId);
            if (gameState.gameState) {
                gameState.gameState.players = gameState.players;
            }
            connections.delete(playerId);
            broadcastGameState();

            if (connections.size === 0) {
                if (gameLoopInterval) {
                    clearInterval(gameLoopInterval);
                    gameLoopInterval = null;
                }
                gameState.isStarted = false;
                if (gameState.gameState) {
                    gameState.gameState.isGameStarted = false;
                }
            }
        }
    });
});

console.log('WebSocket server is running on port 3000');
