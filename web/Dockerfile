FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production=false

COPY . .

ARG STRAPI_URL=http://bbqexperience-strapi:1337
ENV STRAPI_URL=$STRAPI_URL
ENV HOST=0.0.0.0
ENV PORT=4321

RUN npm run build

RUN chown -R node:node /app
USER node

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -q --spider http://127.0.0.1:4321/ || exit 1

CMD ["node", "dist/server/entry.mjs"]
