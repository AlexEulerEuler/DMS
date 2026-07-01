# Frontend image (docs/ia/runtime.md §5). Build context = apps/dms-console.
# NEXT_PUBLIC_* are baked at build time, so the API URL is a build arg.
FROM node:20-slim AS build

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_DMS_API_TOKEN=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_DMS_API_TOKEN=$NEXT_PUBLIC_DMS_API_TOKEN

WORKDIR /app
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
