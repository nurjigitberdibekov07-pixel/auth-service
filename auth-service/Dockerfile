FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY docker-entrypoint.sh ./

USER node
EXPOSE 8080
CMD ["sh", "docker-entrypoint.sh"]