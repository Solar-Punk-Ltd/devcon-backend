# Fetching the minified node image on apline linux
FROM node:slim

ARG GIFTCODE_JSON
ARG CONFIG_JSON

# Setting up the work directory
WORKDIR /devcon

# Copying all the files in our project
COPY . .

RUN if [ -n "$GIFTCODE_JSON" ] ; then echo "$GIFTCODE_JSON" > giftcodes.json ; fi
RUN if [ -n "$CONFIG_JSON" ] ; then echo "$CONFIG_JSON" > config.json ; fi

# Installing dependencies
RUN npm install

# Starting our application
CMD [ "node", "index.js" ]

# Exposing server port
EXPOSE 4000