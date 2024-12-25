export interface BikeState {
    x: number;
    z: number;
    width: number;
    height: number;
    speed: number;
    maxSpeed: number;
    turnSpeed: number;
    isColliding: boolean;
    leftPressCount: number;
    rightPressCount: number;
    upPressCount: number;
    downPressCount: number;
}

export interface RoadDimensions {
    readonly width: number;
    readonly length: number;
    topY: number;
    distanceMoved: number;
    lastDistance: number;
}

export const RESTAURANT_ADJECTIVES = [
    'Hungry', 'Sleepy', 'Happy',
    'Dancing', 'Flying', 'Magical'
];

export const RESTAURANT_TYPES = [
    'Diner', 'Cafe', 'Bistro', 'Kitchen'
];

export type PlayerLocation = 'bike' | 'operation-minigame';

export interface Player {
    id: string;
    name: string;
    isReady: boolean;
    location: PlayerLocation;
}

export type RoadObjectType = 'pothole' | 'pedestrian' | 'dog' | 'restaurant' | 'dogStore';

export interface RoadObject {
    id: string;
    type: RoadObjectType;
    x: number;
    width: number;
    height: number;
    z: number;
    name?: string;
    // Movement properties for moving objects
    movementDirection?: 'left' | 'right' | 'none';
    movementTimeRemaining?: number;
    movementSpeed?: number;
}

export interface OperationMinigameEndState {
    score: number;
}

export interface GameStats {
    restaurantsVisited: { id: string; name: string }[];
    treatsCollected: number;
    pedestriansHit: number;
    potholesHit: number;
}

export interface GameState {
    bike: BikeState;
    road: RoadDimensions;
    roadObjects: RoadObject[];
    stats: GameStats;
    collidedRoadObjectIds: string[];
    showDebugHitboxes: boolean;
    players: Player[];
    isGameStarted: boolean;
    lives: number;
    health: number;
    maxHealth: number;
    score: number;
    lastUpdateTime?: number;
    distanceSinceLastSpawn: number;
    message?: {
        text: string;
        timestamp: number;
    };
    speed: number;  // Game speed in units per second
    level: number;  // Current game level (1-5)
}

export type ServerMessage =
    | { type: 'gameState'; payload: GameState }
    | { type: 'playerJoined'; payload: Player }
    | { type: 'playerLeft'; payload: string }  // player id
    | { type: 'gameStarted' }
    | { type: 'gameEnded'; payload: { finalScore: number } };

export type ClientMessage =
    | { type: 'connect'; payload: string }
    | { type: 'startGame' }
    | { type: 'moveLeft'; pressed: boolean }
    | { type: 'moveRight'; pressed: boolean }
    | { type: 'moveUp'; pressed: boolean }
    | { type: 'moveDown'; pressed: boolean }
    | { type: 'ready' }
    | { type: 'finishOperation'; score: number, playerId: string };

function generateRandomId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export function spawnNewObjects(gameState: GameState): GameState {
    const newRoadObjects = [...gameState.roadObjects];
    const spawnZ = gameState.road.length;
    let newDistanceSinceLastSpawn = gameState.distanceSinceLastSpawn;

    // Spawn interval decreases as level increases
    const spawnInterval = Math.max(5, 35 - (gameState.level * 5));

    // Check if we've moved enough distance since last spawn
    if (newDistanceSinceLastSpawn <= spawnInterval) {
        return gameState;
    }

    // Increase spawn chances based on level
    const levelMultiplier = 1 + (gameState.level - 1) * 0.2; // 20% increase per level

    // Random chance to spawn each type of object
    if (Math.random() < 0.1 * levelMultiplier) { // Pothole chance increases with level
        newRoadObjects.push({
            id: generateRandomId('pothole'),
            type: 'pothole',
            x: Math.random() * 100,
            z: spawnZ,
            width: 15,
            height: 15
        });
    }

    if (Math.random() < 0.05 * levelMultiplier) { // Pedestrian chance increases with level
        const startOnLeft = Math.random() < 0.5;
        newRoadObjects.push({
            id: generateRandomId('pedestrian'),
            type: 'pedestrian',
            x: startOnLeft ? -20 : 120, // Start off-road
            z: spawnZ,
            width: 20,
            height: 40,
            movementDirection: startOnLeft ? 'right' : 'left',
            movementSpeed: 30 + Math.random() * 20 // Speed between 30-50 units per second
        });
    }

    if (Math.random() < 0.02 * levelMultiplier) { // Dog chance increases with level
        newRoadObjects.push({
            id: generateRandomId('dog'),
            type: 'dog',
            x: Math.random() * 100,
            z: spawnZ,
            width: 25,
            height: 20,
            movementDirection: 'none',
            movementTimeRemaining: 0,
            movementSpeed: 20
        });
    }

    if (Math.random() < 0.03) { // Restaurant chance stays constant
        const isLeft = Math.random() < 0.5;
        const adjective = RESTAURANT_ADJECTIVES[Math.floor(Math.random() * RESTAURANT_ADJECTIVES.length)];
        const type = RESTAURANT_TYPES[Math.floor(Math.random() * RESTAURANT_TYPES.length)];
        newRoadObjects.push({
            id: generateRandomId('restaurant'),
            type: 'restaurant',
            x: isLeft ? -60 : 100,
            z: spawnZ,
            width: 60,
            height: 80,
            name: `${adjective} ${type}`
        });
    }

    if (Math.random() < 0.02) { // Dog store chance stays constant
        const isLeft = Math.random() < 0.5;
        newRoadObjects.push({
            id: generateRandomId('dogStore'),
            type: 'dogStore',
            x: isLeft ? -60 : 160,
            z: spawnZ,
            width: 60,
            height: 80
        });
    }

    // Remove objects that are too far behind
    const filteredObjects = newRoadObjects.filter(obj => obj.z > -100);

    return {
        ...gameState,
        roadObjects: filteredObjects,
        distanceSinceLastSpawn: 0
    };
}

export function updateRoadObjects(gameState: GameState, deltaTime: number): GameState {
    const newState = { ...gameState };

    // Update road distance and award points based on game speed
    const distanceIncrement = gameState.speed * deltaTime;
    const newDistanceMoved = gameState.road.distanceMoved + distanceIncrement;
    const lastTens = Math.floor(gameState.road.lastDistance / 100);
    const newTens = Math.floor(newDistanceMoved / 100);

    if (newTens > lastTens) {
        newState.score += 10;
    }

    // Check for level progression
    const levelThresholds = [2000, 4000, 6000, 8000, 10000];
    const currentLevel = gameState.level;
    const newLevel = Math.min(5, levelThresholds.findIndex(threshold => newDistanceMoved < threshold) + 1);

    if (newLevel > currentLevel) {
        newState.level = newLevel;
        newState.message = {
            text: `Level ${newLevel}! Speed increased!`,
            timestamp: Date.now()
        };
        newState.speed = 60 + (newLevel - 1) * 10; // Speed increases by 10 each level
    }

    // Update distance tracking
    newState.road = {
        ...gameState.road,
        distanceMoved: newDistanceMoved,
        lastDistance: newDistanceMoved
    };
    newState.distanceSinceLastSpawn = gameState.distanceSinceLastSpawn + distanceIncrement;

    // Update road objects
    const newRoadObjects = gameState.roadObjects.map(obj => {
        // Update positions based on game speed
        const speedScale = 1 + (1 - obj.z / gameState.road.length) * 2;
        let newX = obj.x;
        let newZ = obj.z - (speedScale * deltaTime * gameState.speed);

        // Handle moving objects (dogs and pedestrians)
        if (obj.type === 'dog' || obj.type === 'pedestrian') {
            let newMovementDirection = obj.movementDirection || 'none';
            let newMovementTimeRemaining = obj.movementTimeRemaining || 0;
            let newMovementSpeed = obj.movementSpeed || 20;

            if (obj.type === 'pedestrian') {
                // Pedestrians move continuously
                if (newMovementDirection === 'left') {
                    newX = obj.x - (newMovementSpeed * deltaTime);
                    if (newX < -20) {
                        newMovementDirection = 'right';
                    }
                } else {
                    newX = obj.x + (newMovementSpeed * deltaTime);
                    if (newX > 120) {
                        newMovementDirection = 'left';
                    }
                }
            } else {
                // Dog movement logic remains the same
                if (newMovementTimeRemaining > 0) {
                    newMovementTimeRemaining -= deltaTime;
                }

                if (newMovementTimeRemaining <= 0) {
                    if (Math.random() < 0.3) {
                        newMovementDirection = Math.random() < 0.5 ? 'left' : 'right';
                        newMovementTimeRemaining = 0.5 + Math.random() * 1.5;
                    } else {
                        newMovementDirection = 'none';
                        newMovementTimeRemaining = 0.2 + Math.random() * 0.3;
                    }
                }

                if (newMovementDirection === 'left') {
                    newX = Math.max(10, obj.x - (newMovementSpeed * deltaTime));
                } else if (newMovementDirection === 'right') {
                    newX = Math.min(90, obj.x + (newMovementSpeed * deltaTime));
                }
            }

            return {
                ...obj,
                x: newX,
                z: newZ,
                movementDirection: newMovementDirection,
                movementTimeRemaining: newMovementTimeRemaining,
                movementSpeed: newMovementSpeed
            };
        }

        return { ...obj, x: newX, z: newZ };
    });

    // Check for collisions
    const newCollidedRoadObjectIds = [...gameState.collidedRoadObjectIds];
    let updatedState = newState;

    // Filter out hit objects and handle collisions
    const activeRoadObjects = newRoadObjects.filter(obj => {
        // Remove hit pedestrians, dogs, and potholes
        if (newCollidedRoadObjectIds.includes(obj.id)) {
            return obj.type === 'restaurant' || obj.type === 'dogStore'; // Keep only buildings
        }
        return true;
    });

    activeRoadObjects.forEach(obj => {
        if (!newCollidedRoadObjectIds.includes(obj.id)) {
            const isColliding = doesBikeIntersectRoadObject(gameState.bike, obj);

            if (isColliding) {
                newCollidedRoadObjectIds.push(obj.id);

                switch (obj.type) {
                    case 'restaurant':
                        updatedState = hitRestaurant(updatedState, obj);
                        break;
                    case 'dogStore':
                        updatedState = {
                            ...updatedState,
                            score: updatedState.score + 10,
                            stats: {
                                ...updatedState.stats,
                                treatsCollected: updatedState.stats.treatsCollected + 1
                            },
                            message: {
                                text: 'Got a treat (+10 points)',
                                timestamp: Date.now()
                            }
                        };
                        break;
                    case 'dog':
                        updatedState = {
                            ...updatedState,
                            score: updatedState.score + 10,
                            message: {
                                text: 'Found Luna (+10 points)',
                                timestamp: Date.now()
                            }
                        };
                        break;
                    case 'pedestrian':
                        updatedState = hitPedestrian(updatedState);
                        break;
                    case 'pothole':
                        updatedState = {
                            ...updatedState,
                            stats: {
                                ...updatedState.stats,
                                potholesHit: updatedState.stats.potholesHit + 1
                            },
                            message: {
                                text: 'Hit a pothole! (-1 life)',
                                timestamp: Date.now()
                            },
                            lives: Math.max(0, updatedState.lives - 1)
                        };
                        break;
                }
            }
        }
    });

    return {
        ...updatedState,
        roadObjects: activeRoadObjects,
        score: updatedState.score,
        collidedRoadObjectIds: newCollidedRoadObjectIds
    };
}

export function updateBikePosition(gameState: GameState, deltaTime: number): GameState {
    // Calculate X movement based on press counts
    let newX = gameState.bike.x;
    if (gameState.bike.leftPressCount > 0 || gameState.bike.rightPressCount > 0) {
        const baseSpeed = gameState.bike.turnSpeed;
        const leftSpeed = gameState.bike.leftPressCount * baseSpeed * deltaTime * 30;
        const rightSpeed = gameState.bike.rightPressCount * baseSpeed * deltaTime * 30;
        const netMovement = rightSpeed - leftSpeed;

        // Update x position allowing bike to move half its width off the road
        newX = Math.max(-gameState.bike.width/2, Math.min(gameState.road.width - gameState.bike.width/2, newX + netMovement));
    }

    // Calculate forward/backward movement
    let newSpeed = gameState.bike.speed;
    const acceleration = 5.0;
    const deceleration = 3.0;
    const accDiff = acceleration * deltaTime * 30;

    if (gameState.bike.upPressCount > 0) {
        newSpeed = Math.min(gameState.bike.maxSpeed, newSpeed + accDiff);
    } else if (gameState.bike.downPressCount > 0) {
        newSpeed = Math.max(-gameState.bike.maxSpeed / 2, newSpeed - accDiff);
    } else {
        // Apply deceleration when no keys are pressed
        if (Math.abs(newSpeed) < deceleration * deltaTime * 30) {
            newSpeed = 0;
        } else {
            newSpeed -= Math.sign(newSpeed) * deceleration * deltaTime * 30;
        }
    }

    // Calculate bike's z position (20% of road length)
    const bikeZ = gameState.road.length * 0.2;

    return {
        ...gameState,
        bike: {
            ...gameState.bike,
            x: newX,
            z: bikeZ,
            speed: newSpeed
        }
    };
}

export function createInitialGameState(): GameState {
    return {
        bike: {
            x: 50,
            z: 0,
            width: 20,
            height: 15,
            speed: 0,
            maxSpeed: 100,
            turnSpeed: 2,
            isColliding: false,
            leftPressCount: 0,
            rightPressCount: 0,
            upPressCount: 0,
            downPressCount: 0
        },
        road: {
            width: 100,
            length: 2000,
            topY: 100,
            distanceMoved: 0,
            lastDistance: 0
        },
        roadObjects: [],
        stats: {
            restaurantsVisited: [],
            treatsCollected: 0,
            pedestriansHit: 0,
            potholesHit: 0
        },
        collidedRoadObjectIds: [],
        showDebugHitboxes: false,
        players: [],
        isGameStarted: false,
        lives: 5,
        health: 100,
        maxHealth: 100,
        score: 0,
        lastUpdateTime: Date.now(),
        distanceSinceLastSpawn: 0,
        speed: 60,  // Default speed: 60 units per second
        level: 1    // Start at level 1
    };
}

export function finishOperationMinigame(gameState: GameState, playerId: string, endState: OperationMinigameEndState): GameState {
    const newPlayers = gameState.players.map(player => {
        if (player.id === playerId && player.location === 'operation-minigame') {
            return {
                ...player,
                location: 'bike' as PlayerLocation
            };
        }
        return player;
    });

    return {
        ...gameState,
        players: newPlayers,
        score: gameState.score + endState.score,
        message: {
            text: `Finished operation (+${endState.score} points)`,
            timestamp: Date.now()
        }
    };
}

export function addPlayer(gameState: GameState, player: Player): GameState {
    return {
        ...gameState,
        players: [...gameState.players, player]
    };
}

export function removePlayer(gameState: GameState, playerId: string): GameState {
    return {
        ...gameState,
        players: gameState.players.filter(p => p.id !== playerId)
    };
}

export function createNewPlayer(name: string): Player {
    return {
        id: Math.random().toString(36).substring(7),
        name,
        isReady: false,
        location: 'bike'
    };
}

export function doesBikeIntersectRoadObject(bike: BikeState, obj: RoadObject): boolean {
    const bikeXCenter = bike.x + bike.width / 2;
    const objXCenter = obj.x + obj.width / 2;
    const bikeZCenter = bike.z + bike.height / 2;
    const objZCenter = obj.z + obj.height / 2;
    const zOverlap = Math.abs(bikeZCenter - objZCenter) < (bike.height / 2 + obj.height / 2);
    const xOverlap = Math.abs(bikeXCenter - objXCenter) < (bike.width / 2 + obj.width / 2);
    return zOverlap && xOverlap;
}

export function hitPedestrian(gameState: GameState): GameState {
    // Only move a player to operation minigame if no one is already there
    const someoneInOperation = gameState.players.some(p => p.location === 'operation-minigame');
    if (!someoneInOperation && gameState.players.length > 0) {
        // Get all players on bikes
        const bikePlayers = gameState.players.filter(p => p.location === 'bike');
        if (bikePlayers.length > 0) {
            // Select random player to move to operation
            const randomIndex = Math.floor(Math.random() * bikePlayers.length);
            const selectedPlayer = bikePlayers[randomIndex];

            // Update the player's location
            const newPlayers = gameState.players.map(p =>
                p.id === selectedPlayer.id
                    ? { ...p, location: 'operation-minigame' as PlayerLocation }
                    : p
            );

            return {
                ...gameState,
                players: newPlayers,
                stats: {
                    ...gameState.stats,
                    pedestriansHit: gameState.stats.pedestriansHit + 1
                },
                lives: Math.max(0, gameState.lives - 1),
                message: {
                    text: `Hit a pedestrian! ${selectedPlayer.name} must operate! (-1 life)`,
                    timestamp: Date.now()
                }
            };
        }
    }

    // If no player was moved to operation, just update stats
    return {
        ...gameState,
        stats: {
            ...gameState.stats,
            pedestriansHit: gameState.stats.pedestriansHit + 1
        },
        lives: Math.max(0, gameState.lives - 1),
        message: {
            text: 'Hit a pedestrian! (-1 life)',
            timestamp: Date.now()
        }
    };
}

export function hitRestaurant(gameState: GameState, restaurant: RoadObject): GameState {
    if (!restaurant.name) return gameState;

    const isDuplicateName = gameState.stats.restaurantsVisited.some(
        r => r.name === restaurant.name
    );
    const totalRestaurants = gameState.roadObjects.filter(b => b.type === 'restaurant').length;
    const visitedCount = isDuplicateName ?
        gameState.stats.restaurantsVisited.length :
        gameState.stats.restaurantsVisited.length + 1;

    if (isDuplicateName) {
        return {
            ...gameState,
            lives: Math.max(0, gameState.lives - 1),
            message: {
                text: `Went to same restaurant: ${restaurant.name} (-1 life) [${visitedCount}/${totalRestaurants} visited]`,
                timestamp: Date.now()
            }
        };
    }

    // New restaurant visit
    return {
        ...gameState,
        score: gameState.score + 10,
        stats: {
            ...gameState.stats,
            restaurantsVisited: [
                ...gameState.stats.restaurantsVisited,
                { id: restaurant.id, name: restaurant.name }
            ]
        },
        message: {
            text: `Went to ${restaurant.name} (+10 points) [${visitedCount}/${totalRestaurants} visited]`,
            timestamp: Date.now()
        }
    };
}