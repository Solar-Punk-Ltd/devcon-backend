# Fetching the minified node image on apline linux
FROM node:slim

# Setting up the work directory
WORKDIR /devcon

# Copying all the files in our project
COPY . .

# Installing dependencies
RUN npm install

# Starting our application
CMD [ "node", "index.js" ]

# Exposing server port
EXPOSE 4000