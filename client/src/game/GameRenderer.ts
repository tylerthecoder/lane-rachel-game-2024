import { GameState, RoadObject, BuildingType, Building } from '@shared/GameState';
import { buildingImages } from './BuildingTypes';

interface RoadDrawingData {
    left: number;
    right: number;
    center: number;
    width: number;
    y: number;
}

interface DrawingCoords {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class GameRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private buildingImageElements: Record<BuildingType, HTMLImageElement> = {} as Record<BuildingType, HTMLImageElement>;
    private showDebugInfo: boolean = true;
    private bikeImage: HTMLImageElement;
    private isImageLoaded: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        this.ctx = ctx;
        this.loadBuildingImages();

        // Load bike image
        this.bikeImage = new Image();
        this.bikeImage.src = '/buildings/bike.png';
        this.bikeImage.onload = () => {
            this.isImageLoaded = true;
        };
    }

    updateCanvas(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        this.ctx = ctx;
    }

    private loadBuildingImages() {
        Object.entries(buildingImages).forEach(([type, url]) => {
            const img = new Image();
            img.src = url;
            this.buildingImageElements[type as BuildingType] = img;
        });
    }

    private getRoadDrawingDataForZ(z: number, state: GameState): RoadDrawingData {
        const progress = z / state.road.length;
        const width = state.road.width * (4 - progress * 3.8); // Same scaling as in GameState
        const centerX = this.canvas.width / 2;
        const y = this.canvas.height - (progress * (this.canvas.height - state.road.topY));

        return {
            left: centerX - width / 2,
            right: centerX + width / 2,
            center: centerX,
            width: width,
            y: y
        };
    }

    private getRoadDrawingCoords(
        x: number | 'left' | 'right',
        z: number,
        width: number,
        height: number,
        state: GameState
    ): DrawingCoords {
        const roadData = this.getRoadDrawingDataForZ(z, state);

        const scaledWidth = width * (roadData.width / state.road.width);
        const scaledHeight = height * (roadData.width / state.road.width);

        let drawX: number;
        if (x === 'left') {
            drawX = roadData.left - scaledWidth;
        } else if (x === 'right') {
            drawX = roadData.right;
        } else {
            // Convert relative x position to screen position
            drawX = roadData.left + (x * (roadData.width / state.road.width)) - scaledWidth / 2;
        }

        return {
            x: drawX,
            y: roadData.y - scaledHeight,
            width: scaledWidth,
            height: scaledHeight
        };
    }

    private drawBuilding(building: Building, state: GameState) {
        const coords = this.getRoadDrawingCoords(
            building.side,
            building.z,
            building.width,
            building.height,
            state
        );

        // Draw the building
        const buildingImage = this.buildingImageElements[building.type];

        // Check if restaurant is visited
        const isVisitedRestaurant = building.type === 'restaurant' &&
            state.stats.restaurantsVisited.some(r => r.id === building.id);

        // Draw building with overlay if it's a visited restaurant
        if (buildingImage.complete) {
            if (isVisitedRestaurant) {
                // Draw a semi-transparent overlay first
                this.ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';  // Green overlay
                this.ctx.fillRect(coords.x, coords.y, coords.width, coords.height);

                // Draw a checkmark
                this.ctx.strokeStyle = '#4CAF50';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                const checkX = coords.x + coords.width - 30;
                const checkY = coords.y + 30;
                this.ctx.moveTo(checkX - 15, checkY);
                this.ctx.lineTo(checkX - 5, checkY + 10);
                this.ctx.lineTo(checkX + 15, checkY - 10);
                this.ctx.stroke();
            }
            this.ctx.drawImage(buildingImage, coords.x, coords.y, coords.width, coords.height);
        } else {
            this.ctx.fillStyle = '#334455';
            this.ctx.fillRect(coords.x, coords.y, coords.width, coords.height);
            if (isVisitedRestaurant) {
                this.ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
                this.ctx.fillRect(coords.x, coords.y, coords.width, coords.height);
            }
        }

        // Draw label
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';

        if (building.type === 'restaurant') {
            // Draw restaurant name with visited indicator
            const restaurantName = building.name || 'Restaurant';
            const displayName = isVisitedRestaurant
                ? `✓ ${restaurantName}`  // Add checkmark to visited restaurants
                : restaurantName;

            // Add shadow to make text more readable
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;

            this.ctx.fillText(
                displayName,
                coords.x + coords.width/2,
                coords.y - 10
            );

            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        }

        // Show debug info if enabled
        if (this.showDebugInfo) {
            const label = building.type.charAt(0).toUpperCase() + building.type.slice(1);
            const z = Math.round(building.z);
            this.ctx.fillText(
                `${label} (${z}m)`,
                coords.x + coords.width/2,
                coords.y - 30
            );
            this.drawHitbox(
                coords.x,
                coords.y,
                coords.width,
                coords.height,
                `${building.type} (${Math.round(building.z)}m)`
            );
        }
    }

    private drawRoadSegment(fromZ: number, toZ: number, state: GameState) {
        const fromRoad = this.getRoadDrawingDataForZ(fromZ, state);
        const toRoad = this.getRoadDrawingDataForZ(toZ, state);

        // Draw road segment
        this.ctx.fillStyle = '#666666';
        this.ctx.beginPath();
        this.ctx.moveTo(fromRoad.left, fromRoad.y);
        this.ctx.lineTo(fromRoad.right, fromRoad.y);
        this.ctx.lineTo(toRoad.right, toRoad.y);
        this.ctx.lineTo(toRoad.left, toRoad.y);
        this.ctx.fill();

        // Draw center line for this segment
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(fromRoad.center, fromRoad.y);
        this.ctx.lineTo(toRoad.center, toRoad.y);
        this.ctx.stroke();
    }

    private drawRoad(state: GameState) {
        // Draw road in segments for better visual quality
        const segments = 10;
        const segmentLength = state.road.length / segments;

        for (let i = 0; i < segments; i++) {
            const fromZ = i * segmentLength;
            const toZ = (i + 1) * segmentLength;
            this.drawRoadSegment(fromZ, toZ, state);
        }
    }

    private drawBike(state: GameState) {
        const coords = this.getRoadDrawingCoords(
            state.bike.x,
            state.bike.z,
            state.bike.width,
            state.bike.height,
            state
        );

        if (this.isImageLoaded) {
            this.ctx.drawImage(this.bikeImage, coords.x, coords.y, coords.width, coords.height);
        } else {
            // Fallback to rectangle if image hasn't loaded
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(coords.x, coords.y, coords.width, coords.height);
        }

        // Draw bike hitbox if debug mode is on
        if (this.showDebugInfo) {
            this.drawHitbox(
                coords.x,
                coords.y,
                coords.width,
                coords.height,
                `Bike`
            );

            // Draw coordinates for debugging
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(
                `x: ${Math.round(state.bike.x)}, z: ${Math.round(state.bike.z)}`,
                coords.x,
                coords.y - 20
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
        // Sort buildings by z (furthest first)
        const sortedBuildings = [...state.buildings].sort((a, b) => b.z - a.z);
        sortedBuildings.forEach(building => this.drawBuilding(building, state));
    }

    private drawRoadObject(object: RoadObject, state: GameState) {
        const coords = this.getRoadDrawingCoords(
            object.x,
            object.z,
            object.width,
            object.height,
            state
        );

        // Draw the road object based on type
        if (object.type === 'pothole') {
            // Draw pothole as a dark circle
            this.ctx.fillStyle = state.collidedRoadObjectIds.includes(object.id) ? '#ff0000' : '#333333';
            this.ctx.beginPath();
            this.ctx.ellipse(
                coords.x + coords.width / 2,
                coords.y + coords.height / 2,
                coords.width / 2,
                coords.height / 2,
                0,
                0,
                2 * Math.PI
            );
            this.ctx.fill();
        } else if (object.type === 'pedestrian') {
            // Draw pedestrian as a stick figure
            this.ctx.strokeStyle = state.collidedRoadObjectIds.includes(object.id) ? '#ff0000' : '#000000';
            this.ctx.lineWidth = 2;

            // Head
            const headRadius = coords.width / 3;
            this.ctx.beginPath();
            this.ctx.arc(
                coords.x + coords.width / 2,
                coords.y + headRadius,
                headRadius,
                0,
                2 * Math.PI
            );
            this.ctx.stroke();

            // Body
            this.ctx.beginPath();
            this.ctx.moveTo(coords.x + coords.width / 2, coords.y + headRadius * 2);
            this.ctx.lineTo(coords.x + coords.width / 2, coords.y + coords.height - headRadius);
            this.ctx.stroke();

            // Arms
            this.ctx.beginPath();
            this.ctx.moveTo(coords.x, coords.y + coords.height / 2);
            this.ctx.lineTo(coords.x + coords.width, coords.y + coords.height / 2);
            this.ctx.stroke();

            // Legs
            this.ctx.beginPath();
            this.ctx.moveTo(coords.x + coords.width / 2, coords.y + coords.height - headRadius);
            this.ctx.lineTo(coords.x, coords.y + coords.height);
            this.ctx.moveTo(coords.x + coords.width / 2, coords.y + coords.height - headRadius);
            this.ctx.lineTo(coords.x + coords.width, coords.y + coords.height);
            this.ctx.stroke();
        }

        // Only show coordinates if debug info is enabled
        if (this.showDebugInfo) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                `${object.type} (${Math.round(object.z)}m)`,
                coords.x + coords.width/2,
                coords.y - 5
            );
            this.drawHitbox(
                coords.x,
                coords.y,
                coords.width,
                coords.height,
                `${object.type} ${object.id}`
            );
        }
    }

    private drawRoadObjects(state: GameState) {
        // Sort road objects by z (furthest first)
        const sortedObjects = [...state.roadObjects].sort((a, b) => b.z - a.z);
        sortedObjects.forEach(object => this.drawRoadObject(object, state));
    }

    public render(state: GameState) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw game elements
        this.drawRoad(state);
        this.drawRoadObjects(state);
        this.drawBuildings(state);
        this.drawBike(state);
    }

    public toggleDebugInfo() {
        this.showDebugInfo = !this.showDebugInfo;
    }
}