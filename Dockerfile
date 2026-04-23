FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV GENERATE_SOURCEMAP=false
RUN npm run build

FROM base AS runner
WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/build ./build

EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]