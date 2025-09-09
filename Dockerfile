FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["npm", "start"]
