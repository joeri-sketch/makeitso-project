# Untested template: Docker isn't available on the machine this was written on.
# Railway does not need this file (it builds from package.json); it is here for other hosts.
#   docker build -f deploy/Dockerfile -t makeitso .
#   docker run -p 3000:3000 -e DATABASE_URL=... -e APP_SECRET=... makeitso
FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY src ./src
COPY public ./public
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
