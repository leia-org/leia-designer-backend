FROM node:lts-alpine

WORKDIR /leia-designer-backend

COPY . .

RUN npm ci --omit=dev && \
  rm -rf $(npm get cache)

ENTRYPOINT ["npm", "start"]