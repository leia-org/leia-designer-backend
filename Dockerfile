# Keep the runtime on Node 24: the JWT dependency chain still uses SlowBuffer,
# which is unavailable on Node 26 when the floating LTS tag advances.
FROM node:24-alpine

WORKDIR /leia-designer-backend

COPY . .

RUN npm ci --omit=dev && \
  node -e "const jwt = require('jsonwebtoken'); jwt.verify(jwt.sign({ sub: 'runtime-smoke' }, 'runtime-smoke'), 'runtime-smoke');" && \
  rm -rf $(npm get cache)

ENTRYPOINT ["npm", "start"]
