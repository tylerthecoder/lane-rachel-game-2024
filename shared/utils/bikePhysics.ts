import { GameState } from '../types/GameState';

interface RoadEdges {
    left: number;
    right: number;
}

export function getRoadEdgesFromDistance(distance: number, roadLength: number, canvas: { width: number }, road: { bottomWidth: number; topWidth: number }): RoadEdges {
    const progress = distance / roadLength;
    const width = road.bottomWidth - progress * (road.bottomWidth - road.topWidth);
    const centerX = canvas.width / 2;
    return {
        left: centerX - width / 2,
        right: centerX + width / 2
    };
}

export function updateBikePosition(gameState: GameState, deltaTime: number): GameState {
    // Calculate road boundaries at bike's position
    const bikeDistance = gameState.ROAD_LENGTH * 0.2;
    const edges = getRoadEdgesFromDistance(bikeDistance, gameState.ROAD_LENGTH,
        { width: 800 },
        { bottomWidth: gameState.road.bottomWidth, topWidth: gameState.road.topWidth }
    );

    // Calculate movement bounds with padding
    const padding = 0;
    const leftBound = edges.left + padding;
    const rightBound = edges.right - gameState.bike.width - padding;

    // Calculate X movement based on press counts
    let newX = gameState.bike.x;
    if (gameState.bike.leftPressCount > 0 || gameState.bike.rightPressCount > 0) {
        const baseSpeed = gameState.bike.turnSpeed;
        const leftSpeed = gameState.bike.leftPressCount * baseSpeed * deltaTime * 30;
        const rightSpeed = gameState.bike.rightPressCount * baseSpeed * deltaTime * 30;
        const netMovement = rightSpeed - leftSpeed;
        newX = Math.max(leftBound, Math.min(rightBound, gameState.bike.x + netMovement));
    }

    // Calculate Y position based on road perspective
    const newBikeY = 500 - (bikeDistance / gameState.ROAD_LENGTH) * 400;

    return {
        ...gameState,
        bike: {
            ...gameState.bike,
            x: newX,
            y: newBikeY
        }
    };
}