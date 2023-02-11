FROM node

WORKDIR /app
COPY ./server ./server
COPY ./client ./client
COPY ./certificates ./certificates
COPY ./package*.json .
RUN npm ci
EXPOSE 3000

CMD [ "node", "/app/server/index.js" ]