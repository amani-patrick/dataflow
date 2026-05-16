FROM node:20-bullseye

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --production

COPY src/ ./src/

RUN mkdir -p uploads

EXPOSE 4000

CMD ["node", "src/index.js"]
