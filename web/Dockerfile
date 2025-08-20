FROM node:20-alpine


# Create app directory
WORKDIR /app


# Install dependencies first (better layer caching)
COPY package.json ./
RUN npm install --only=production


# Copy the rest of the source
COPY server.js ./

# Port for the web API
EXPOSE 3000


# Start the server
CMD ["node", "server.js"]
