# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Pass build arguments to Vite
ARG VITE_API_URL
ARG VITE_AUTHENTIK_URL
ARG VITE_AUTHENTIK_CLIENT_ID

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTHENTIK_URL=$VITE_AUTHENTIK_URL
ENV VITE_AUTHENTIK_CLIENT_ID=$VITE_AUTHENTIK_CLIENT_ID

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the build output to Nginx's html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
