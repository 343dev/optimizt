# syntax=docker/dockerfile:1

ARG OPTIMIZT_TARBALL=artifacts/optimizt.tgz
FROM node:24.18.0-alpine3.23
LABEL maintainer="Andrey Warkentin (https://github.com/343dev)"
ARG OPTIMIZT_TARBALL
COPY ${OPTIMIZT_TARBALL} /tmp/optimizt.tgz
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
	npm install --global /tmp/optimizt.tgz \
	&& rm /tmp/optimizt.tgz
ENV NODE_ENV="production"
WORKDIR /src
ENTRYPOINT ["optimizt"]
