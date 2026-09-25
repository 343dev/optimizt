FROM node:22.22.1-alpine3.23
LABEL maintainer="Andrey Warkentin (https://github.com/343dev)"

WORKDIR /app

COPY . .

RUN npm ci --include=dev \
	&& npm run build \
	&& npm prune --omit=dev \
	&& npm link --workspace @343dev/optimizt \
	&& npm cache clean --force

ENV NODE_ENV="production"

WORKDIR /src

ENTRYPOINT ["optimizt"]
