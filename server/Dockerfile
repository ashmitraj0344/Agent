# Use the Node official image
# https://hub.docker.com/_/node
FROM node:19.5.0-alpine

# Create and change to the app directory.
WORKDIR /server

# Copy local code to the container image
COPY . ./

# Install packages
RUN npm ci

# Serve the app
CMD ["npm", "run", "start"]