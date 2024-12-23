import { GameState, updateBikePosition, updateBuildings, updateRoadObjects } from '@shared/GameState';
import { WebSocketManager } from '../services/WebSocketManager';

export class ClientGame {
    private gameState: GameState;
    private wsManager: WebSocketManager;
    private isStarted: boolean = false;
    private updateInterval: NodeJS.Timeout | null = null;

    constructor(initialState: GameState, wsManager: WebSocketManager) {
        this.gameState = initialState;
        this.wsManager = wsManager;
    }

    public updateGameState(newState: GameState) {
        this.gameState = newState;
    }

    public getGameState(): GameState {
        return this.gameState;
    }

    private updateState(deltaTime: number) {
        // Chain the update functions
        this.gameState = updateRoadObjects(
            updateBuildings(
                updateBikePosition(this.gameState, deltaTime),
                deltaTime
            ),
            deltaTime
        );
    }

    public start() {
        if (this.isStarted) return;
        this.isStarted = true;

        // Update game state at 30fps
        this.updateInterval = setInterval(() => {
            this.updateState(1/30); // Fixed time step
        }, 1000 / 30);
    }

    public stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.isStarted = false;
    }

    public isGameStarted(): boolean {
        return this.isStarted;
    }
}