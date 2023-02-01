FROM node:19-alpine3.16

WORKDIR /app
COPY ./client ./client
COPY ./database ./database
COPY ./img ./img
COPY ./proxy ./proxy
COPY ./server ./server
COPY ./package.json ./package.json
RUN npm install

CMD ["node", "/app/server/index.js"]