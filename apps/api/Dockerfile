FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Filarkivet (volymen files) måste vara skrivbart för node-användaren. En namngiven volym
# får ägaren från katalogen i imagen när den skapas – därför skapas den här med rätt ägare.
RUN mkdir -p /data/files && chown -R node:node /data/files
VOLUME /data/files
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
