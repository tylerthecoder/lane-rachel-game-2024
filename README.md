# Lane & Rachel's Tandem Bike Adventure

A multiplayer game where two players control a tandem bike together and complete various missions around the city.

## Game Overview

### Core Gameplay
- Players control a tandem bike together in the middle of the screen
- Both players control the same bike simultaneously, requiring coordination
- The bike moves forward automatically through a city environment
- Players must work together to steer and complete objectives

### Game Objectives
1. Get treats for Luna
   - Find and visit pet stores
   - Collect dog treats

2. Capture 3 Pokemon
   - Find Pokemon locations in the city
   - Special Pokemon encounters with Luna and Miso
   - Simple Pokemon-style catching mechanic

3. Visit 3 Different Restaurants
   - Each restaurant visit counts towards the goal
   - Visiting the same restaurant twice will result in a loss
   - Must strategically choose different restaurants

## Technical Implementation

### Client (React + Canvas)
- React application with Canvas-based rendering
- Real-time game loop for smooth animations
- Perspective rendering for buildings and road
- Asset management for building images and sprites
- Collision detection system
- State management for game objectives

### Server (Express + WebSocket)
- Express server handling WebSocket connections
- Limited to exactly two players (Lane and Rachel)
- Real-time state synchronization
- Game state management
  - Bike position and movement
  - Building/Pokemon locations
  - Traffic positions
  - Objective progress

### Game State
- Bike position and speed
- Building locations and types
- Pokemon spawn points
- Traffic positions and patterns
- Objective completion status
- Player connection status

## Todo List

### Phase 1: Basic Game Setup ✅
- [x] Initial project setup with React and Canvas
- [x] Basic road and perspective rendering
- [x] Simple bike movement controls
- [x] Building placement system
- [x] Add building types and images

### Phase 2: Game UI and Start Screen (Current)
- [ ] Create title screen with game logo
- [ ] Add start game button and player connection status
- [ ] Implement objectives display panel
- [ ] Add score/progress tracking UI
- [ ] Create end game screen (win/lose conditions)

### Phase 3: Multiplayer Implementation
- [ ] Set up Express server with WebSocket support
- [ ] Implement player connection management
- [ ] Add real-time bike position synchronization
- [ ] Handle simultaneous control inputs from both players
- [ ] Add player ready/start game synchronization

### Phase 4: Game Mechanics
- [ ] Implement collision detection system
- [ ] Add traffic obstacles and movement patterns
- [ ] Create Pokemon encounter system
  - [ ] Pokemon spawn logic
  - [ ] Catching mechanic
  - [ ] Success/failure states
- [ ] Add pet store interaction system
  - [ ] Treat collection mechanic
  - [ ] Inventory system
- [ ] Restaurant visit tracking
  - [ ] Restaurant type identification
  - [ ] Visit history tracking
  - [ ] Duplicate visit detection

### Phase 5: Polish and Assets
- [ ] Add unique building images for each type
- [ ] Create bike sprite and animations
- [ ] Add particle effects for interactions
- [ ] Implement sound effects and background music
- [ ] Add visual feedback for objective completion
- [ ] Create tutorial/instructions screen

### Phase 6: Testing and Deployment
- [ ] Implement error handling for lost connections
- [ ] Add reconnection logic
- [ ] Test multiplayer synchronization
- [ ] Performance optimization
- [ ] Deploy server to hosting platform
- [ ] Set up client deployment





