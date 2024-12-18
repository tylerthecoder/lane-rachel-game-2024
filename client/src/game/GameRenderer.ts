import { Building, BuildingType, buildingImages } from './BuildingTypes';
import { GameState } from './GameState';

export class GameRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private buildingImageElements: Record<BuildingType, HTMLImageElement> = {} as Record<BuildingType, HTMLImageElement>;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        this.ctx = ctx;
        this.loadBuildingImages();
    }

    private loadBuildingImages() {
        Object.entries(buildingImages).forEach(([type, url]) => {
            const img = new Image();
            img.src = url;
            this.buildingImageElements[type as BuildingType] = img;
        });
    }

    private getRoadWidthFromDistance(distance: number, state: GameState): number {
        const progress = distance / state.ROAD_LENGTH;
        return state.road.bottomWidth - progress * (state.road.bottomWidth - state.road.topWidth);
    }

    private getRoadYValueFromDistance(distance: number, state: GameState): number {
        const progress = distance / state.ROAD_LENGTH;
        return this.canvas.height - (progress * (this.canvas.height - state.road.topY));
    }

    private getRoadEdgesFromDistance(distance: number, state: GameState): { left: number; right: number } {
        const width = this.getRoadWidthFromDistance(distance, state);
        const centerX = this.canvas.width / 2;
        return {
            left: centerX - width / 2,
            right: centerX + width / 2
        };
    }

    private drawBuildingAtDistance(building: Building, state: GameState) {
        // Calculate perspective scale based on distance
        const progress = building.distance / state.ROAD_LENGTH;
        const scale = 1 - progress;

        // Calculate dimensions with perspective
        const dimensions = {
            width: building.width * scale,
            height: building.height * scale
        };

        const scaledDistance = ((building.distance / state.ROAD_LENGTH) ** .5) * state.ROAD_LENGTH;

        // Get road position at this distance
        const roadY = this.getRoadYValueFromDistance(scaledDistance, state);
        const edges = this.getRoadEdgesFromDistance(scaledDistance, state);

        // Calculate final position
        const position = {
            x: building.side === 'left'
                ? edges.left - dimensions.width
                : edges.right,
            y: roadY - dimensions.height
        };

        // Draw the building
        const buildingImage = this.buildingImageElements[building.type];
        if (buildingImage.complete) {
            this.ctx.drawImage(buildingImage, position.x, position.y, dimensions.width, dimensions.height);
        } else {
            this.ctx.fillStyle = '#334455';
            this.ctx.fillRect(position.x, position.y, dimensions.width, dimensions.height);
        }

        // Draw label
        const label = building.type.charAt(0).toUpperCase() + building.type.slice(1);
        const distance = Math.round(building.distance);
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${label} (${distance}m)`, position.x + dimensions.width/2, position.y - 10);

        // Draw building hitbox
        if (state.showDebugHitboxes) {
            this.drawHitbox(
                position.x,
                position.y,
                dimensions.width,
                dimensions.height,
                `${building.type} (${Math.round(building.distance)}m)`
            );
        }

        return { position, dimensions }; // Return for collision detection
    }

    private drawRoadSegment(fromDistance: number, toDistance: number, state: GameState) {
        const fromY = this.getRoadYValueFromDistance(fromDistance, state);
        const toY = this.getRoadYValueFromDistance(toDistance, state);
        const fromEdges = this.getRoadEdgesFromDistance(fromDistance, state);
        const toEdges = this.getRoadEdgesFromDistance(toDistance, state);

        // Draw road segment
        this.ctx.fillStyle = '#666666';
        this.ctx.beginPath();
        this.ctx.moveTo(fromEdges.left, fromY);
        this.ctx.lineTo(fromEdges.right, fromY);
        this.ctx.lineTo(toEdges.right, toY);
        this.ctx.lineTo(toEdges.left, toY);
        this.ctx.fill();

        // Draw center line for this segment
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, fromY);
        this.ctx.lineTo(this.canvas.width / 2, toY);
        this.ctx.stroke();
    }

    private drawRoad(state: GameState) {
        // Draw road in segments for better visual quality
        const segments = 10;
        const segmentLength = state.ROAD_LENGTH / segments;

        for (let i = 0; i < segments; i++) {
            const fromDistance = i * segmentLength;
            const toDistance = (i + 1) * segmentLength;
            this.drawRoadSegment(fromDistance, toDistance, state);
        }
    }

    private drawBike(state: GameState) {
        this.ctx.fillStyle = state.bike.isColliding ? '#0000ff' : '#ff0000';
        this.ctx.fillRect(
            state.bike.x,
            state.bike.y - state.bike.height,
            state.bike.width,
            state.bike.height
        );

        // Draw bike hitbox
        if (state.showDebugHitboxes) {
            this.drawHitbox(
                state.bike.x,
                state.bike.y - state.bike.height,
                state.bike.width,
                state.bike.height,
                'Bike'
            );
        }
    }

    private drawHitbox(x: number, y: number, width: number, height: number, label?: string) {
        // Draw actual object hitbox
        this.ctx.strokeStyle = '#ff00ff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // Draw buffer zone with smaller buffer
        const buffer = 5;
        this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            x - buffer,
            y - buffer,
            width + buffer * 2,
            height + buffer * 2
        );

        if (label) {
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(label, x, y - 5);
        }
    }

    private drawBuildings(state: GameState) {
        // Sort buildings by distance (furthest first)
        const sortedBuildings = [...state.buildings].sort((a, b) => b.distance - a.distance);

        sortedBuildings.forEach(building => {
            this.drawBuildingAtDistance(building, state);
        });
    }

    public render(state: GameState) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw game elements
        this.drawRoad(state);
        this.drawBuildings(state);
        this.drawBike(state);
    }
}