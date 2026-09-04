#!/usr/bin/env bash

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt update
apt install --yes --no-install-recommends \
	ca-certificates \
	openssh-client \
	git

rm -rf /var/lib/apt/lists/*
