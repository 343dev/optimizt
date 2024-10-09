# GitHub Actions: Integrating Optimizt with “Workflow”

## Example of creating AVIF and WebP versions after a push to the main branch

This workflow watches for JPEG and PNG files when you push commits to the main branch. If it finds such files, it will add AVIF and WebP versions and commit the changes.

In the `.github/workflows` directory of your repository, create a file called `optimizt-push.yml` with the following content:

```yml
name: Create AVIF & WebP

on:
  # Runs on "push" event for the "main" branch but only if there are changes to JPEG and PNG files.
  push:
    branches:
      - main
    paths:
      - "**.jpe?g"
      - "**.png"

  # Allows manual workflow trigger from the Actions tab
  workflow_dispatch:

jobs:
  convert:
    runs-on: ubuntu-latest

    steps:
      # Install Node.js to avoid EACCESS errors during package installation
      - uses: actions/setup-node@v2
        with:
          node-version: 18.17.0

      - name: Install Optimizt
        run: npm install --global @343dev/optimizt

      - uses: actions/checkout@v2
        with:
          persist-credentials: false # Use personal access token instead of GITHUB_TOKEN
          fetch-depth: 0 # Download all commits (default is just the latest)

      - name: Run Optimizt
        run: optimizt --verbose --force --avif --webp .

      - name: Commit changes
        run: |
          git add -A
          git config --local user.email "actions@github.com"
          git config --local user.name "github-actions[bot]"
          git diff --quiet && git diff --staged --quiet \
            || git commit -am "Create WebP & AVIF versions"

      - name: Push changes
        uses: ad-m/github-push-action@master
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          branch: ${{ github.ref }}
```

## Example of optimizing images in a Pull Request

This workflow checks for images in a pull request. If it finds images, it optimizes them and also adds AVIF and WebP versions with a new commit.

In the `.github/workflows` directory of your repository, create a file called `optimizt-pr.yml` with the following content:

```yml
name: Optimize images

on:
  pull_request:
    # Runs when you open a new PR or push new commits to the PR's head branch
    types: [opened, synchronize]
    paths:
      - '**.jpe?g'
      - '**.png'
      - '**.gif'
      - '**.svg'

  # Allows manual workflow trigger from the Actions tab
  workflow_dispatch:

jobs:
  optimize-and-convert:
    runs-on: ubuntu-latest
    env:
      IMAGES_PATHS: ''
      IMAGES_PATHS_AVIF: ''

    steps:
      # Check out the repository so your job can access it
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0 # Get all commits
          ref: ${{ github.head_ref }} # Checkout to the source branch of the PR

      - name: Setup Git config
        run: |
          git config --local user.name "github-actions[bot]"
          git config --local user.email "actions@github.com"

      # Get the list of changed files
      - id: changed_files
        uses: jitterbit/get-changed-files@v1

      - name: Set images paths variables
        run: | # Process only added and modified file paths
          for path in ${{ steps.changed_files.outputs.added_modified }}; do
            if printf '%s\n' "${path}" | grep -P '(gif|jpe?g|png|svg)$'; then
              IMAGES_PATHS="${IMAGES_PATHS} ${path}"
            fi

            if printf '%s\n' "${path}" | grep -P '(jpe?g|png)$'; then
              IMAGES_PATHS_AVIF="${IMAGES_PATHS_AVIF} ${path}"
            fi
          done
          echo "IMAGES_PATHS=`echo ${IMAGES_PATHS} | awk '{$1=$1};1'`" >> $GITHUB_ENV
          echo "IMAGES_PATHS_AVIF=`echo ${IMAGES_PATHS_AVIF} | awk '{$1=$1};1'`" >> $GITHUB_ENV

      # Install Node.js to avoid EACCESS errors during package installation
      - uses: actions/setup-node@v2
        if: env.IMAGES_PATHS != '' || env.IMAGES_PATHS_AVIF != ''
        with:
          node-version: '18'

      - name: Install Optimizt via npm
        if: env.IMAGES_PATHS != '' || env.IMAGES_PATHS_AVIF != ''
        run: npm install --global @343dev/optimizt

      - name: Optimize images
        if: env.IMAGES_PATHS != ''
        run: optimizt --verbose ${{ env.IMAGES_PATHS }}

      - name: Commit optimized images
        if: env.IMAGES_PATHS != ''
        run: |
          git add -A
          git diff --quiet && git diff --staged --quiet \
            || git commit -m "Optimize images"

      - name: Create WebP
        if: env.IMAGES_PATHS != ''
        run: optimizt --webp ${{ env.IMAGES_PATHS }}

      - name: Commit WebP versions
        if: env.IMAGES_PATHS != ''
        run: |
          git add -A
          git diff --quiet && git diff --staged --quiet \
            || git commit -m "Create WebP versions"

      - name: Create AVIF
        if: env.IMAGES_PATHS_AVIF != ''
        run: optimizt --avif ${{ env.IMAGES_PATHS_AVIF }}

      - name: Commit AVIF versions
        if: env.IMAGES_PATHS_AVIF != ''
        run: |
          git add -A
          git diff --quiet && git diff --staged --quiet \
            || git commit -m "Create AVIF versions"

      - name: Push changes
        if: env.IMAGES_PATHS != '' || env.IMAGES_PATHS_AVIF != ''
        uses: ad-m/github-push-action@master
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          branch: ${{ github.head_ref }}
```
