FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS prod

COPY pnpm-lock.yaml .
RUN pnpm fetch --prod

COPY . .
RUN pnpm install
RUN pnpm run build

FROM base
COPY --from=prod /app/node_modules .
COPY --from=prod /app/.next .
EXPOSE 3000
CMD [ "pnpm", "start" ]