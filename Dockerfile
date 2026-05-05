FROM node:24-alpine

RUN apk add --no-cache git git-lfs python3 make g++ libgit2-dev

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY src/ ./src/

VOLUME ["/app/repos", "/app/config.yaml"]

CMD ["node", "src/index.js"]
