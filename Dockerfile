# syntax=docker/dockerfile:1

FROM node:22.22.1-alpine3.23 AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/optimizt/package.json packages/optimizt/package.json
COPY packages/optimizt-sharp/package.json packages/optimizt-sharp/package.json
COPY packages/optimizt-guetzli/package.json packages/optimizt-guetzli/package.json
COPY packages/optimizt-gifsicle/package.json packages/optimizt-gifsicle/package.json

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
	npm ci --include=dev

COPY packages/ packages/

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
	npm run build \
	&& npm pack --workspace @343dev/optimizt --ignore-scripts --pack-destination /tmp \
	&& mv /tmp/343dev-optimizt-*.tgz /tmp/optimizt.tgz

FROM node:22.22.1-alpine3.23
LABEL maintainer="Andrey Warkentin (https://github.com/343dev)"

COPY --from=build /tmp/optimizt.tgz /tmp/optimizt.tgz

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
	npm install --global /tmp/optimizt.tgz \
	&& rm /tmp/optimizt.tgz

ENV NODE_ENV="production"

WORKDIR /src

ENTRYPOINT ["optimizt"]
