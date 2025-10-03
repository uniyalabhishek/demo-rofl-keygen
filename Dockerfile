FROM node:20-alpine
WORKDIR /app

# Install dependencies (dev deps included so we can compile contracts)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy sources and build (TS + contracts)
COPY tsconfig.json ./
COPY src ./src
COPY contracts ./contracts
COPY hardhat.config.cjs ./
RUN npm run build && npm run compile:contracts && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Keep artifacts/ in the image (compiled in previous step) so we can deploy via /deploy-counter
CMD ["node", "dist/server.js"]
