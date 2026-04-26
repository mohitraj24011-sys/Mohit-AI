FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Install playwright browsers
RUN npx playwright install chromium

CMD ["node", "dist/index.js"]
