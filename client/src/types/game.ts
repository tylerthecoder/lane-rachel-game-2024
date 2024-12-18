export interface Player {
    id: string;
    name: string;
    isReady: boolean;
}

export interface GameState {
    players: Player[];
    isGameStarted: boolean;
    lives: number;
    score: number;
}

export type ServerMessage =
    | { type: 'gameState'; payload: GameState }
    | { type: 'playerJoined'; payload: Player }
    | { type: 'playerLeft'; payload: string }  // player id
    | { type: 'gameStarted' }
    | { type: 'gameEnded'; payload: { finalScore: number } };

export type ClientMessage =
    | { type: 'joinGame'; payload: { name: string } }
    | { type: 'ready' }
    | { type: 'moveLeft' }
    | { type: 'moveRight' }
    | { type: 'startMinigame'; payload: { buildingType: string } };