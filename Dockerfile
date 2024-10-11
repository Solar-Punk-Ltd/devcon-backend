# Fetching the minified node image on apline linux
FROM node:slim

ARG ROOM_JSON

# Setting up the work directory
WORKDIR /devcon

# Copying all the files in our project
COPY . .

# Get rooms.json from args
RUN echo "$ROOM_JSON" >> rooms.json

# Installing dependencies
RUN npm install

# Starting our application
CMD [ "node", "index.js" ]

# Exposing server port
EXPOSE 4000