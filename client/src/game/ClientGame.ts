import { GameState, updateBikePosition, updateRoadObjects } from '@shared/GameState';

export class ClientGame {
    private gameState: GameState;
    private isStarted: boolean = false;
    private updateInterval: NodeJS.Timeout | null = null;

    constructor(initialState: GameState) {
        this.gameState = initialState;
    }

    public updateGameState(newState: GameState) {
        this.gameState = newState;
    }

    public getGameState(): GameState {
        return this.gameState;
    }

    private update(deltaTime: number) {
        if (!this.gameState || !this.gameState.lastUpdateTime) return;

        // Update game state
        this.gameState = updateBikePosition(this.gameState, deltaTime);
        this.gameState = updateRoadObjects(this.gameState, deltaTime);

        // Update last update time
        this.gameState = {
            ...this.gameState,
            lastUpdateTime: Date.now()
        };

    }

    public start() {
        if (this.isStarted) return;
        this.isStarted = true;

        // Update game state at 30fps
        this.updateInterval = setInterval(() => {
            this.update(1/30); // Fixed time step
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