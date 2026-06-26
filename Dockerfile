FROM node:22.22.1-alpine3.23
LABEL maintainer="Andrey Warkentin (https://github.com/343dev)"

WORKDIR /app

COPY . .

ENV NODE_ENV="production"

RUN npm ci \
	&& npm link \
	&& npm cache clean --force

WORKDIR /src

ENTRYPOINT ["optimizt"]
