FROM node

WORKDIR /app
COPY ./proxy ./proxy
COPY ./certificates ./certificates
COPY ./package*.json .
RUN npm ci
EXPOSE 5000

CMD [ "node", "/app/proxy/proxy.js" ]