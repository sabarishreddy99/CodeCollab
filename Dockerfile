# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
