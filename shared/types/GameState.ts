export interface BikeState {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    maxSpeed: number;
    turnSpeed: number;
    isColliding: boolean;
    leftPressCount: number;
    rightPressCount: number;
}

export interface RoadDimensions {
    bottomWidth: number;
    topWidth: number;
    topY: number;
}

export interface GameGoals {
    treatsCollected: number;
    pokemonCaught: number;
    restaurantsVisited: Set<string>;
    isComplete: boolean;
}

export type BuildingType = 'restaurant' | 'pokemon' | 'dogStore' | 'park' | 'house';

export interface Building {
    id: string;
    side: 'left' | 'right';
    y: number;
    width: number;
    height: number;
    distance: number;
    type: BuildingType;
}

export interface Player {
    id: string;
    name: string;
    isReady: boolean;
}

export interface GameState {
    bike: BikeState;
    road: RoadDimensions;
    buildings: Building[];
    goals: GameGoals;
    collidedBuildingIds: Set<string>;
    showDebugHitboxes: boolean;
    readonly ROAD_LENGTH: number;
    players: Player[];
    isGameStarted: boolean;
    lives: number;
    score: number;
    lastUpdateTime?: number;
}

export interface ServerGameState {
    players: Player[];
    isStarted: boolean;
    gameState: GameState | null;
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
    | { type: 'ready' };

export const createInitialGameState = (): GameState => ({
    bike: {
        x: 350,
        y: 500,
        width: 100,
        height: 60,
        speed: 0,
        maxSpeed: 5,
        turnSpeed: 4,
        isColliding: false,
        leftPressCount: 0,
        rightPressCount: 0
    },
    road: {
        bottomWidth: 400,
        topWidth: 50,
        topY: 100
    },
    buildings: [
        { id: 'building_0', side: 'left', y: 100, width: 100, height: 200, distance: 500, type: 'restaurant' },
        { id: 'building_1', side: 'left', y: 100, width: 150, height: 250, distance: 1000, type: 'pokemon' },
        { id: 'building_2', side: 'right', y: 100, width: 120, height: 180, distance: 700, type: 'dogStore' },
        { id: 'building_3', side: 'right', y: 100, width: 140, height: 220, distance: 1200, type: 'park' }
    ],
    goals: {
        treatsCollected: 0,
        pokemonCaught: 0,
        restaurantsVisited: new Set<string>(),
        isComplete: false
    },
    collidedBuildingIds: new Set<string>(),
    showDebugHitboxes: false,
    ROAD_LENGTH: 2000,
    players: [],
    isGameStarted: false,
    lives: 3,
    score: 0,
    lastUpdateTime: Date.now()
});