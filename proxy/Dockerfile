FROM node:alpine

WORKDIR /app
COPY ./package*.json ./
RUN npm install
COPY ./proxy/proxy.js ./proxy/proxy.js

CMD ["node", "/app/proxy/proxy.js"]
