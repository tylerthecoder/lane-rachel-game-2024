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
}

export interface GameStats {
    restaurantsVisited: string[];  // Array of restaurant IDs
    treatsCollected: number;
    pedestriansHit: number;
    potholesHit: number;
}

export type BuildingType = 'restaurant' | 'pokemon' | 'dogStore' | 'park' | 'house';

export interface Building {
    id: string;
    side: 'left' | 'right';
    width: number;
    height: number;
    z: number;
    type: BuildingType;
}

export type PlayerLocation = 'bike' | 'operation-minigame';

export interface Player {
    id: string;
    name: string;
    isReady: boolean;
    location: PlayerLocation;
}

export type RoadObjectType = 'pothole' | 'pedestrian';

export interface RoadObject {
    id: string;
    type: RoadObjectType;
    x: number;
    width: number;
    height: number;
    z: number;
}

export interface OperationMinigameEndState {
    score: number;
}


export interface GameState {
    bike: BikeState;
    road: RoadDimensions;
    buildings: Building[];
    roadObjects: RoadObject[];
    stats: GameStats;  // Replace goals with stats
    collidedBuildingIds: string[];
    collidedRoadObjectIds: string[];
    showDebugHitboxes: boolean;
    players: Player[];
    isGameStarted: boolean;
    lives: number;
    health: number;
    maxHealth: number;
    score: number;
    lastUpdateTime?: number;
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

function getRandomZ(roadLength: number, minPercent: number = 0, maxPercent: number = 1): number {
    return roadLength * (minPercent + Math.random() * (maxPercent - minPercent));
}

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

export function spawnNewObjects(state: GameState): GameState {
    const newState = { ...state };
    const spawnChance = 0.05;

    if (Math.random() < spawnChance) {
        // Decide what to spawn
        const spawnType = Math.random();

        if (spawnType < 0.4) { // 40% chance for building
            const types: BuildingType[] = ['restaurant', 'pokemon', 'dogStore', 'park', 'house'];
            const type = types[Math.floor(Math.random() * types.length)];
            const side = Math.random() < 0.5 ? 'left' : 'right';
            const width = 100 + Math.random() * 50;
            const height = 180 + Math.random() * 70;

            const newBuilding: Building = {
                id: generateRandomId('building'),
                side,
                width,
                height,
                z: state.road.length,
                type
            };

            newState.buildings = [...state.buildings, newBuilding];
        } else if (spawnType < 0.7) { // 30% chance for pothole
            const newPothole: RoadObject = {
                id: generateRandomId('pothole'),
                type: 'pothole',
                x: getRandomRoadX(100),
                width: 40,
                height: 40,
                z: state.road.length
            };

            newState.roadObjects = [...state.roadObjects, newPothole];
        } else { // 30% chance for pedestrian
            const newPedestrian: RoadObject = {
                id: generateRandomId('pedestrian'),
                type: 'pedestrian',
                x: getRandomRoadX(100),
                width: 30,
                height: 60,
                z: state.road.length
            };

            newState.roadObjects = [...state.roadObjects, newPedestrian];
        }
    }

    // Clean up objects that are too far behind
    newState.buildings = newState.buildings.filter(building => building.z > -50);
    newState.roadObjects = newState.roadObjects.filter(object => object.z > -50);

    return newState;
}

export function updateBuildings(gameState: GameState, deltaTime: number): GameState {
    const newState = { ...gameState };
    const newBuildings = gameState.buildings.map(building => {
        // Move building closer with increasing speed as it gets closer
        const speedScale = 1 + (1 - building.z / gameState.road.length) * 2;
        const newZ = building.z - (2 * speedScale * deltaTime * 30);
        return { ...building, z: newZ };
    });

    // Check for building collisions
    const bikeZ = gameState.bike.z;
    const bikeX = gameState.bike.x;
    let newScore = gameState.score;
    const newCollidedBuildingIds = [...gameState.collidedBuildingIds];
    const newStats = { ...gameState.stats };

    newBuildings.forEach(building => {
        if (!newCollidedBuildingIds.includes(building.id)) {
            const tolerance = 20;
            const isColliding =
                Math.abs(bikeZ - building.z) < tolerance &&
                ((building.side === 'left' && bikeX < 20) ||
                 (building.side === 'right' && bikeX > 80));

            if (isColliding) {
                newCollidedBuildingIds.push(building.id);

                // Update stats based on building type
                switch (building.type) {
                    case 'restaurant':
                        if (!newStats.restaurantsVisited.includes(building.id)) {
                            newStats.restaurantsVisited.push(building.id);
                        }
                        break;
                    case 'dogStore':
                        newStats.treatsCollected++;
                        break;
                }
            }
        }
    });

    return {
        ...newState,
        buildings: newBuildings,
        score: newScore,
        stats: newStats,
        collidedBuildingIds: newCollidedBuildingIds
    };
}

export function updateRoadObjects(gameState: GameState, deltaTime: number): GameState {
    const newState = { ...gameState };
    const newRoadObjects = gameState.roadObjects.map(object => {
        const speedScale = 1 + (1 - object.z / gameState.road.length) * 2;
        const newZ = object.z - (2 * speedScale * deltaTime * 30);
        return { ...object, z: newZ };
    });

    // Check for collisions
    const bikeZ = gameState.bike.z;
    const bikeX = gameState.bike.x;
    let newHealth = gameState.health;
    const newCollidedRoadObjectIds = [...gameState.collidedRoadObjectIds];
    const newPlayers = [...gameState.players];
    const healthLossPerHit = 20;
    const newStats = { ...gameState.stats };

    newRoadObjects.forEach(object => {
        if (!newCollidedRoadObjectIds.includes(object.id)) {
            const tolerance = 20;
            const isColliding =
                Math.abs(bikeZ - object.z) < tolerance &&
                Math.abs(bikeX - object.x) < tolerance;

            if (isColliding) {
                newCollidedRoadObjectIds.push(object.id);

                if (object.type === 'pothole') {
                    newStats.potholesHit++;
                    newHealth = Math.max(0, newHealth - healthLossPerHit);
                } else if (object.type === 'pedestrian') {
                    newStats.pedestriansHit++;
                    const anyoneInOperation = newPlayers.some(p => p.location === 'operation-minigame');

                    if (!anyoneInOperation) {
                        const bikePlayers = newPlayers.filter(p => p.location === 'bike');
                        if (bikePlayers.length > 0) {
                            const randomIndex = Math.floor(Math.random() * bikePlayers.length);
                            const selectedPlayer = bikePlayers[randomIndex];
                            const playerIndex = newPlayers.findIndex(p => p.id === selectedPlayer.id);
                            newPlayers[playerIndex] = {
                                ...selectedPlayer,
                                location: 'operation-minigame'
                            };
                        }
                    }
                }
            }
        }
    });

    return {
        ...newState,
        roadObjects: newRoadObjects,
        health: newHealth,
        collidedRoadObjectIds: newCollidedRoadObjectIds,
        players: newPlayers,
        stats: newStats
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

export const createInitialGameState = (): GameState => ({
    bike: {
        x: 50,
        z: 0,
        width: 10,
        height: 6,
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
        topY: 100
    },
    buildings: [
        { id: 'building_0', side: 'left', width: 100, height: 200, z: 400, type: 'restaurant' },
        { id: 'building_1', side: 'right', width: 150, height: 250, z: 800, type: 'pokemon' },
        { id: 'building_2', side: 'left', width: 120, height: 180, z: 1200, type: 'dogStore' },
        { id: 'building_3', side: 'right', width: 140, height: 220, z: 1600, type: 'park' }
    ],
    roadObjects: [
        { id: 'pothole_0', type: 'pothole', x: getRandomRoadX(100), width: 40, height: 40, z: getRandomZ(2000, 0.1, 0.2) },
        { id: 'pothole_1', type: 'pothole', x: getRandomRoadX(100), width: 40, height: 40, z: getRandomZ(2000, 0.3, 0.4) },
        { id: 'pothole_2', type: 'pothole', x: getRandomRoadX(100), width: 40, height: 40, z: getRandomZ(2000, 0.5, 0.6) },
        { id: 'pedestrian_0', type: 'pedestrian', x: getRandomRoadX(100), width: 30, height: 60, z: getRandomZ(2000, 0.7, 0.8) },
        { id: 'pedestrian_1', type: 'pedestrian', x: getRandomRoadX(100), width: 30, height: 60, z: getRandomZ(2000, 0.9, 1.0) }
    ],
    stats: {
        restaurantsVisited: [],
        treatsCollected: 0,
        pedestriansHit: 0,
        potholesHit: 0
    },
    collidedBuildingIds: [],
    collidedRoadObjectIds: [],
    showDebugHitboxes: false,
    players: [],
    isGameStarted: false,
    lives: 3,
    health: 100,
    maxHealth: 100,
    score: 0,
    lastUpdateTime: Date.now(),
});

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
        score: gameState.score + endState.score
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