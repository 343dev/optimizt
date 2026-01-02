FROM node:current-alpine
LABEL maintainer="Andrey Warkentin (https://github.com/343dev)"

WORKDIR /app

COPY . .

ENV NODE_ENV="production"

RUN npm ci \
	&& npm link \
	&& npm cache clean --force

WORKDIR /src

ENTRYPOINT ["optimizt"]
