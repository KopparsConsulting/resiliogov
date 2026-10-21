# Steg 1: bygg den statiska webbappen
FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.ts tailwind.config.ts postcss.config.js components.json ./
COPY tsconfig*.json ./
COPY public ./public
COPY src ./src
RUN npm run build

# Steg 2: servera med nginx; /api/ vidarebefordras till api-tjänsten
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
