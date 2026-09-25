#!/bin/sh
set -eu

output_directory=${1:-artifacts}
rm -rf "$output_directory"
mkdir -p "$output_directory"
source_status=$(git status --porcelain=v1 --untracked-files=all -- packages/optimizt-gifsicle)
if [ -n "$source_status" ]; then
	printf '%s\n' 'Cannot build a release artifact with modified Gifsicle source/build files.' >&2
	printf '%s\n' 'Commit or discard changes under packages/optimizt-gifsicle first.' >&2
	printf '%s\n' "$source_status" >&2
	exit 1
fi
npm run build
npm pack --workspace @343dev/optimizt --ignore-scripts --pack-destination "$output_directory"
tarball=$(find "$output_directory" -maxdepth 1 -name '*.tgz' -print)
node packages/optimizt/scripts/verify-package.mjs "$tarball"
node packages/optimizt/scripts/verify-installed-package.mjs "$tarball"
cp "$tarball" "$output_directory/optimizt.tgz"
printf '%s\n' "$output_directory/optimizt.tgz"
