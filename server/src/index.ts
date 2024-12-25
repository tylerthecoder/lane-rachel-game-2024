import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import {
    GameState,
    ClientMessage,
    ServerMessage,
    createInitialGameState,
    updateBikePosition,
    updateRoadObjects,
    createNewPlayer,
    addPlayer,
    removePlayer,
    finishOperationMinigame,
    spawnNewObjects,
    finishMatchingMinigame
} from '@shared/GameState';

// Track game state
let gameState: GameState = createInitialGameState();

// Store WebSocket connections with their associated player IDs
const connections = new Map<string, { ws: any }>();

let gameLoopInterval: NodeJS.Timeout | null = null;
let lastUpdateTime = Date.now();

// Add this function to handle game over
function handleGameOver(state: GameState) {
    console.log('Game over');
    // Send final game state
    const finalGameStateMessage: ServerMessage = {
        type: 'gameState',
        payload: {
            ...state,
            lastUpdateTime: Date.now()
        }
    };

    // Send game ended message with final score
    const gameEndedMessage: ServerMessage = {
        type: 'gameEnded',
        payload: { finalScore: state.score }
    };

    // Send both messages to all connections
    connections.forEach((conn) => {
        if (conn.ws) {
            conn.ws.send(JSON.stringify(finalGameStateMessage));
            conn.ws.send(JSON.stringify(gameEndedMessage));
            // Close the connection
            setTimeout(() => {
                conn.ws.close();
            }, 2000);
        }
    });

    // Clear all connections
    connections.clear();

    // Stop game loop
    if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
        gameLoopInterval = null;
    }

    // Reset game state
    gameState = createInitialGameState();
}

// Modify the updateGame function to check for game over condition
function updateGame(state: GameState): GameState {
    const now = Date.now();
    const deltaTime = (now - lastUpdateTime) / 1000;
    lastUpdateTime = now;

    state = updateBikePosition(state, deltaTime);
    state = updateRoadObjects(state, deltaTime);
    state = spawnNewObjects(state);

    // Update last update time
    state = {
        ...state,
        lastUpdateTime: now
    };

    return state;
}

// Update the game loop to handle game over condition
function startGameLoop() {
    console.log('Starting game loop...');
    if (gameLoopInterval) {
        console.log('Clearing existing game loop');
        clearInterval(gameLoopInterval);
    }

    let lastBroadcastTime = Date.now();
    lastUpdateTime = Date.now();

    // Start game loop at 30fps with broadcast
    gameLoopInterval = setInterval(() => {
        // Update game state
        gameState = updateGame(gameState);

        // Check if game is over (lives <= 0)
        if (gameState.lives <= 0) {
            handleGameOver(gameState);
            return;
        }

        // Broadcast state every second
        if (Date.now() - lastBroadcastTime > 500) {
            broadcastGameState();
            lastBroadcastTime = Date.now();
        }

        // Check for active connections
        let hasActiveConnections = false;
        connections.forEach((conn) => {
            if (conn.ws) {
                hasActiveConnections = true;
            }
        });

        if (!hasActiveConnections && gameLoopInterval) {
            console.log('No active connections, stopping game loop');
            clearInterval(gameLoopInterval);
            gameLoopInterval = null;
        }
    }, 1000 / 30); // Update at 30fps

    console.log('Game loop started');
}

function broadcastGameState() {
    const gameStateMessage: ServerMessage = {
        type: 'gameState',
        payload: {
            ...gameState,
            lastUpdateTime: Date.now()
        }
    };

    const messageStr = JSON.stringify(gameStateMessage);
    connections.forEach((conn) => {
        if (conn.ws) {
            conn.ws.send(messageStr);
        }
    });
}

// Create Elysia app with WebSocket support
const app = new Elysia()
    .use(staticPlugin({
        assets: '../client/dist',
        prefix: '/'
    }))
    .ws('/ws', {
        message: (ws, message) => {
            try {
                const parsedMessage = message as ClientMessage;
                console.log('Received message:', parsedMessage);

                switch (parsedMessage.type) {
                    case 'connect': {
                        const newPlayer = createNewPlayer(parsedMessage.payload);
                        console.log('New player connected:', { id: newPlayer.id, name: newPlayer.name });
                        gameState = addPlayer(gameState, newPlayer);
                        connections.set(newPlayer.id, { ws });
                        broadcastGameState();
                        break;
                    }

                    case 'startGame':
                        if (gameState.players.length >= 1) {
                            gameState = {
                                ...gameState,
                                isGameStarted: true
                            };
                            startGameLoop();

                            const startMessage: ServerMessage = { type: 'gameStarted' };
                            connections.forEach((conn) => {
                                if (conn.ws) {
                                    conn.ws.send(JSON.stringify(startMessage));
                                }
                            });
                        }
                        break;

                    case 'moveLeft':
                    case 'moveRight':
                    case 'moveUp':
                    case 'moveDown':
                        if (gameState.isGameStarted) {
                            const pressCount = parsedMessage.pressed ? 1 : -1;
                            gameState = {
                                ...gameState,
                                bike: {
                                    ...gameState.bike,
                                    leftPressCount: parsedMessage.type === 'moveLeft' ?
                                        Math.max(0, gameState.bike.leftPressCount + pressCount) :
                                        gameState.bike.leftPressCount,
                                    rightPressCount: parsedMessage.type === 'moveRight' ?
                                        Math.max(0, gameState.bike.rightPressCount + pressCount) :
                                        gameState.bike.rightPressCount,
                                    upPressCount: parsedMessage.type === 'moveUp' ?
                                        Math.max(0, gameState.bike.upPressCount + pressCount) :
                                        gameState.bike.upPressCount,
                                    downPressCount: parsedMessage.type === 'moveDown' ?
                                        Math.max(0, gameState.bike.downPressCount + pressCount) :
                                        gameState.bike.downPressCount
                                }
                            };
                        }
                        broadcastGameState();
                        break;

                    case 'finishOperation':
                        // Find the player who sent the message
                        console.log('Finished operation minigame for player ID:', parsedMessage.playerId);

                        if (parsedMessage.playerId) {
                            gameState = finishOperationMinigame(gameState, parsedMessage.playerId, {
                                score: parsedMessage.score
                            });
                            broadcastGameState();
                        }
                        break;

                    case 'finishMatching':
                        console.log('Finished matching minigame for player ID:', parsedMessage.playerId);

                        if (parsedMessage.playerId) {
                            gameState = finishMatchingMinigame(gameState, parsedMessage.playerId, {
                                score: parsedMessage.score
                            });
                            broadcastGameState();
                        }
                        break;
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        },
        open: (ws) => {
            console.log('WebSocket connection opened');
        },
        close: (ws) => {
            // Find and remove the disconnected player
            let disconnectedPlayerId: string | undefined;
            connections.forEach((conn, playerId) => {
                if (conn.ws.id === ws.id) {
                    disconnectedPlayerId = playerId;
                }
            });

            console.log('Disconnected player:', disconnectedPlayerId);

            if (disconnectedPlayerId) {
                gameState = removePlayer(gameState, disconnectedPlayerId);
                connections.delete(disconnectedPlayerId);
                broadcastGameState();

                if (connections.size === 0) {
                    if (gameLoopInterval) {
                        clearInterval(gameLoopInterval);
                        gameLoopInterval = null;
                    }
                    gameState = {
                        ...gameState,
                        isGameStarted: false
                    };
                }
            }
        }
    })
    .listen(3000);

console.log('WebSocket server is running on port 3000');
