import { WebSocket, WebSocketServer } from 'ws';
import {
    GameState,
    ServerGameState,
    Player,
    ClientMessage,
    ServerMessage,
    createInitialGameState
} from '@shared/types/GameState';
import { updateBikePosition } from '@shared/utils/bikePhysics';

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
let lastBroadcastTime = 0;
const NORMAL_BROADCAST_INTERVAL = 1000; // Normal state updates every 1 second
const FAST_BROADCAST_INTERVAL = 50;     // Fast updates every 50ms
const FAST_MODE_DURATION = 500;         // Stay in fast mode for 500ms after input
let currentBroadcastInterval = NORMAL_BROADCAST_INTERVAL;
let fastModeTimeout: NodeJS.Timeout | null = null;
let lastUpdateTime = Date.now();

function updateGame(state: GameState): GameState {
    const now = Date.now();
    const deltaTime = (now - lastUpdateTime) / 1000;
    lastUpdateTime = now;

    // Update building positions
    state = {
        ...state,
        buildings: state.buildings.map(building => {
            const speedScale = 1 + (1 - building.distance / state.ROAD_LENGTH) * 2;
            building.distance -= 2 * speedScale;

            if (building.distance < 0) {
                building.distance = state.ROAD_LENGTH;
                building.id = `building_${Math.random().toString(36).substr(2, 9)}`;
                const types = ['restaurant', 'pokemon', 'dogStore', 'park', 'house'] as const;
                building.type = types[Math.floor(Math.random() * types.length)];
            }
            return building;
        })
    };

    // Update bike position using shared function with deltaTime
    state = updateBikePosition(state, deltaTime);

    return state;
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

    console.log('Game state initialized:', {
        playerCount: gameState.players.length,
        isStarted: gameState.isStarted
    });

    lastBroadcastTime = Date.now();

    // Start game loop at 30fps
    gameLoopInterval = setInterval(() => {
        if (gameState.gameState) {
            gameState.gameState = updateGame(gameState.gameState);
            gameState.gameState.players = gameState.players; // Keep players in sync

            const now = Date.now();
            if (now - lastBroadcastTime >= currentBroadcastInterval) {
                // Broadcast updated game state to all clients
                const gameStateMessage: ServerMessage = {
                    type: 'gameState',
                    payload: {
                        ...gameState.gameState,
                        lastUpdateTime: now // Add timestamp for client interpolation
                    }
                };

                const messageStr = JSON.stringify(gameStateMessage);
                let activeConnections = 0;
                connections.forEach((clientWs) => {
                    if (clientWs.readyState === WebSocket.OPEN) {
                        try {
                            clientWs.send(messageStr);
                            activeConnections++;
                        } catch (error) {
                            console.error('Error sending game state:', error);
                        }
                    }
                });

                if (activeConnections === 0) {
                    console.log('No active connections, stopping game loop');
                    clearInterval(gameLoopInterval);
                    gameLoopInterval = null;
                }

                lastBroadcastTime = now;
            }
        }
    }, 1000 / 30); // Internal updates still at 30fps

    console.log('Game loop started');
}

function handlePlayerInput() {
    // Enter fast mode
    currentBroadcastInterval = FAST_BROADCAST_INTERVAL;

    // Clear existing timeout if there is one
    if (fastModeTimeout) {
        clearTimeout(fastModeTimeout);
    }

    // Set timeout to return to normal mode
    fastModeTimeout = setTimeout(() => {
        currentBroadcastInterval = NORMAL_BROADCAST_INTERVAL;
        fastModeTimeout = null;
    }, FAST_MODE_DURATION);
}

wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection established');
    let playerId: string;

    ws.on('message', (data: string) => {
        try {
            const message = JSON.parse(data) as ClientMessage;
            console.log('Received message:', { type: message.type, playerId });

            switch (message.type) {
                case 'connect':
                    // Handle player connection
                    playerId = Math.random().toString(36).substring(7);
                    const newPlayer: Player = {
                        id: playerId,
                        name: message.payload,
                        isReady: false
                    };

                    console.log('New player connected:', { playerId, name: message.payload });
                    gameState.players.push(newPlayer);
                    connections.set(playerId, ws);

                    // Initialize game state if not exists
                    if (!gameState.gameState) {
                        gameState.gameState = createInitialGameState();
                    }
                    gameState.gameState.players = gameState.players;

                    // Broadcast updated game state to all clients
                    broadcastGameState();
                    break;

                case 'startGame':
                    console.log('Start game requested by player:', playerId);
                    // Handle game start - now allows single player
                    if (gameState.players.length >= 1) {
                        console.log('Starting game with players:', gameState.players);
                        gameState.isStarted = true;
                        if (gameState.gameState) {
                            gameState.gameState.isGameStarted = true;
                        }
                        startGameLoop();

                        // Broadcast game started message to all clients
                        const startMessage: ServerMessage = {
                            type: 'gameStarted'
                        };

                        const messageStr = JSON.stringify(startMessage);
                        connections.forEach((clientWs) => {
                            if (clientWs.readyState === WebSocket.OPEN) {
                                try {
                                    clientWs.send(messageStr);
                                } catch (error) {
                                    console.error('Error sending start message:', error);
                                }
                            }
                        });
                    }
                    break;

                case 'moveLeft':
                    if (gameState.gameState) {
                        gameState.gameState.bike.leftPressCount += message.pressed ? 1 : -1;
                        // Ensure count doesn't go below 0
                        gameState.gameState.bike.leftPressCount = Math.max(0, gameState.gameState.bike.leftPressCount);

                        // Immediate broadcast
                        broadcastGameState();
                    }
                    break;
                case 'moveRight':
                    if (gameState.gameState) {
                        gameState.gameState.bike.rightPressCount += message.pressed ? 1 : -1;
                        // Ensure count doesn't go below 0
                        gameState.gameState.bike.rightPressCount = Math.max(0, gameState.gameState.bike.rightPressCount);

                        // Immediate broadcast
                        broadcastGameState();
                    }
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ws.on('close', (code, reason) => {
        console.log('WebSocket closed:', { playerId, code, reason: reason.toString() });
        if (playerId) {
            // Remove player from game state
            gameState.players = gameState.players.filter(p => p.id !== playerId);
            if (gameState.gameState) {
                gameState.gameState.players = gameState.players;
            }
            connections.delete(playerId);
            console.log('Player removed:', { playerId, remainingPlayers: gameState.players.length });

            // Reset game state if game hasn't started and broadcast update
            if (!gameState.isStarted) {
                broadcastGameState();
            }
        }
    });

    function broadcastGameState() {
        if (!gameState.gameState) {
            gameState.gameState = createInitialGameState();
        }

        // Update the game state with current players and game status
        gameState.gameState.players = gameState.players;
        gameState.gameState.isGameStarted = gameState.isStarted;

        // Send the complete game state
        const gameStateMessage: ServerMessage = {
            type: 'gameState',
            payload: gameState.gameState
        };

        console.log('Broadcasting game state:', {
            playerCount: gameState.players.length,
            isStarted: gameState.isStarted,
            connectionCount: connections.size
        });

        const messageStr = JSON.stringify(gameStateMessage);
        let sentCount = 0;
        connections.forEach((clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
                try {
                    clientWs.send(messageStr);
                    sentCount++;
                } catch (error) {
                    console.error('Error broadcasting game state:', error);
                }
            }
        });
        console.log(`Game state broadcast complete: ${sentCount}/${connections.size} clients received`);
    }
});

console.log('WebSocket server is running on port 3000');
