interface RoadEdges {
    left: number;
    right: number;
}

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
    // Movement properties for the dog
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
    message?: {
        text: string;
        timestamp: number;
    };
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


function getRandomRoadX(roadWidth: number): number {
    // Leave some margin on the edges (20% on each side)
    const margin = roadWidth * 0.2;
    return margin + Math.random() * (roadWidth - margin * 2);
}

export function getRoadWidthAtDistance(distance: number, roadLength: number): number {
    const progress = distance / roadLength;
    // Road gets narrower as it goes into the distance
    // At distance 0, width is 400% of base road width
    // At max distance, width is 20% of base road width
    return 100 * (4 - progress * 3.8);
}

export function getRoadEdgesFromDistance(distance: number, roadLength: number, canvas: { width: number }): RoadEdges {
    const width = getRoadWidthAtDistance(distance, roadLength);
    const centerX = canvas.width / 2;
    return {
        left: centerX - width / 2,
        right: centerX + width / 2
    };
}

function generateRandomId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export function spawnNewObjects(gameState: GameState): GameState {
    const newRoadObjects = [...gameState.roadObjects];
    const spawnZ = gameState.road.length;

    // Random chance to spawn each type of object
    if (Math.random() < 0.1) { // 10% chance for pothole
        newRoadObjects.push({
            id: Math.random().toString(36).substring(7),
            type: 'pothole',
            x: 20 + Math.random() * 60, // Random position on road
            z: spawnZ,
            width: 15,
            height: 15
        });
    }

    if (Math.random() < 0.05) { // 5% chance for pedestrian
        newRoadObjects.push({
            id: Math.random().toString(36).substring(7),
            type: 'pedestrian',
            x: 20 + Math.random() * 60,
            z: spawnZ,
            width: 20,
            height: 40
        });
    }

    if (Math.random() < 0.02) { // 2% chance for dog
        newRoadObjects.push({
            id: Math.random().toString(36).substring(7),
            type: 'dog',
            x: 20 + Math.random() * 60,
            z: spawnZ,
            width: 25,
            height: 20,
            movementDirection: 'none',
            movementTimeRemaining: 0,
            movementSpeed: 20
        });
    }

    if (Math.random() < 0.03) { // 3% chance for restaurant
        const isLeft = Math.random() < 0.5;
        const adjective = RESTAURANT_ADJECTIVES[Math.floor(Math.random() * RESTAURANT_ADJECTIVES.length)];
        const type = RESTAURANT_TYPES[Math.floor(Math.random() * RESTAURANT_TYPES.length)];
        newRoadObjects.push({
            id: Math.random().toString(36).substring(7),
            type: 'restaurant',
            x: isLeft ? -60 : 100, // Spawn just outside the road
            z: spawnZ,
            width: 60,
            height: 80,
            name: `${adjective} ${type}`
        });
    }

    if (Math.random() < 0.02) { // 2% chance for dog store
        const isLeft = Math.random() < 0.5;
        newRoadObjects.push({
            id: Math.random().toString(36).substring(7),
            type: 'dogStore',
            x: isLeft ? -60 : 100, // Spawn just outside the road
            z: spawnZ,
            width: 60,
            height: 80
        });
    }

    // Remove objects that are too far behind
    const filteredObjects = newRoadObjects.filter(obj => obj.z > -100);

    return {
        ...gameState,
        roadObjects: filteredObjects
    };
}

export function updateRoadObjects(gameState: GameState, deltaTime: number): GameState {
    const newState = { ...gameState };
    let newScore = gameState.score;
    let message = gameState.message;

    // Update road distance and award points
    const distanceIncrement = 2 * deltaTime * 30;
    const newDistanceMoved = gameState.road.distanceMoved + distanceIncrement;
    const previousTens = Math.floor(gameState.road.distanceMoved / 10);
    const newTens = Math.floor(newDistanceMoved / 10);
    const scoreIncrement = newTens - previousTens; // Will be 1 if we crossed a 10-unit threshold

    if (scoreIncrement > 0) {
        newScore += scoreIncrement * 10;
        message = {
            text: `+${scoreIncrement * 10} points for distance!`,
            timestamp: Date.now()
        };
    }

    newState.road = {
        ...gameState.road,
        distanceMoved: newDistanceMoved
    };

    // Update road objects
    const newRoadObjects = gameState.roadObjects.map(obj => {
        // Update positions
        const speedScale = 1 + (1 - obj.z / gameState.road.length) * 2;
        let newX = obj.x;
        let newZ = obj.z - (2 * speedScale * deltaTime * 30);

        // Handle dog movement
        if (obj.type === 'dog') {
            let newMovementDirection = obj.movementDirection || 'none';
            let newMovementTimeRemaining = obj.movementTimeRemaining || 0;
            let newMovementSpeed = obj.movementSpeed || 20;

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
    const newStats = { ...gameState.stats };

    newRoadObjects.forEach(obj => {
        if (!newCollidedRoadObjectIds.includes(obj.id)) {
            const tolerance = obj.type === 'dog' ? 15 : 20;
            const isColliding = doesBikeIntersectRoadObject(gameState.bike, obj, tolerance);

            if (isColliding) {
                newCollidedRoadObjectIds.push(obj.id);

                switch (obj.type) {
                    case 'restaurant':
                        newScore += 10;
                        const isDuplicateName = newStats.restaurantsVisited.some(
                            r => r.name === obj.name
                        );
                        const totalRestaurants = newRoadObjects.filter(b => b.type === 'restaurant').length;
                        const visitedCount = isDuplicateName ?
                            newStats.restaurantsVisited.length :
                            newStats.restaurantsVisited.length + 1;

                        if (isDuplicateName) {
                            newState.lives = Math.max(0, newState.lives - 1);
                            message = {
                                text: `Went to same restaurant: ${obj.name} (-1 life) [${visitedCount}/${totalRestaurants} visited]`,
                                timestamp: Date.now()
                            };
                        } else {
                            message = {
                                text: `Went to ${obj.name} (+10 points) [${visitedCount}/${totalRestaurants} visited]`,
                                timestamp: Date.now()
                            };
                            if (!newStats.restaurantsVisited.some(r => r.id === obj.id)) {
                                newStats.restaurantsVisited.push({
                                    id: obj.id,
                                    name: obj.name || 'Restaurant'
                                });
                            }
                        }
                        break;
                    case 'dogStore':
                        newScore += 10;
                        newStats.treatsCollected++;
                        message = {
                            text: `Got a treat (+10 points)`,
                            timestamp: Date.now()
                        };
                        break;
                    case 'dog':
                        newScore += 10;
                        message = {
                            text: 'Found Luna (+10 points)',
                            timestamp: Date.now()
                        };
                        break;
                    case 'pedestrian':
                        newStats.pedestriansHit++;
                        newState.lives = Math.max(0, newState.lives - 1);
                        message = {
                            text: 'Hit a pedestrian! (-1 life)',
                            timestamp: Date.now()
                        };
                        break;
                    case 'pothole':
                        newStats.potholesHit++;
                        message = {
                            text: 'Hit a pothole!',
                            timestamp: Date.now()
                        };
                        break;
                }
            }
        }
    });

    return {
        ...newState,
        roadObjects: newRoadObjects,
        score: newScore,
        stats: newStats,
        collidedRoadObjectIds: newCollidedRoadObjectIds,
        message
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

        // Update x position relative to road width (0-100)
        newX = Math.max(0, Math.min(100, newX + netMovement));
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
            width: 30,
            height: 20,
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
            distanceMoved: 0
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
        lastUpdateTime: Date.now()
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

export function doesBikeIntersectRoadObject(bike: BikeState, obj: RoadObject, tolerance: number = 20): boolean {
    const zOverlap = Math.abs(bike.z - obj.z) < (bike.height / 2 + obj.height / 2 + tolerance);

    if (obj.type === 'restaurant' || obj.type === 'dogStore') {
        // Buildings use edge collision
        const isLeftBuilding = obj.x < 50;
        const xCollision = isLeftBuilding ? bike.x < 20 : bike.x > 80;
        return zOverlap && xCollision;
    } else {
        // Road objects use center-based collision
        const xOverlap = Math.abs(bike.x - obj.x) < (bike.width / 2 + obj.width / 2 + tolerance);
        return zOverlap && xOverlap;
    }
}