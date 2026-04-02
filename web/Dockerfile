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

EXPOSE 4321

CMD ["node", "dist/server/entry.mjs"]
