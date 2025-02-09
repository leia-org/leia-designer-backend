FROM node:lts-alpine

WORKDIR /leia-backend

COPY . .

RUN npm ci --omit=dev && \
    rm -rf $(npm get cache)

ENTRYPOINT ["npm", "start"]