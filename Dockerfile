FROM node:alpine

WORKDIR /app
COPY ./package*.json .
RUN npm ci
COPY ./certificates ./certificates
COPY ./client ./client
COPY ./database ./database
COPY ./grammar ./grammar
COPY ./server ./server
COPY ./.env ./.env
COPY ./.gitignore ./.gitignore

CMD ["node", "/app/server/index.js"]