# Use the official Bun image
FROM oven/bun:1 as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY client/package*.json client/
COPY server/package*.json server/
COPY shared/ shared/
COPY client/ client/
COPY server/ server/
COPY tsconfig.base.json ./

# Install dependencies and build client
RUN cd client && bun install && bun run build

# Install server dependencies
RUN cd server && bun install

# Start the server
CMD ["bun", "run", "--cwd", "server", "dev"]

# Expose the port
EXPOSE 3000