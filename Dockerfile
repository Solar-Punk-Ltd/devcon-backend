# Fetching the minified node image on apline linux
FROM node:slim

ARG ROOM_JSON
ARG GIFTCODE_JSON

# Setting up the work directory
WORKDIR /devcon

# Copying all the files in our project
COPY . .

# Get rooms.json from args
RUN echo "$ROOM_JSON" >> rooms.json
RUN if [ -n "$GIFTCODE_JSON" ] ; then echo "$GIFTCODE_JSON" > giftcodes.json ; fi

# Installing dependencies
RUN npm install

# Starting our application
CMD [ "node", "index.js" ]

# Exposing server port
EXPOSE 4000