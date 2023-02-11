FROM node

WORKDIR /app
COPY ./api ./api
COPY ./grammar ./grammar
COPY ./.env ./.env
COPY ./package*.json .
RUN npm ci
EXPOSE 4000

CMD [ "node", "/app/api/server.js" ]