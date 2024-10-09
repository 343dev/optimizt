# GitHub Actions: интеграция Optimizt с помощью «Workflow»

## Пример создания AVIF и WebP-версий после push в основную ветку

Воркфлоу отслеживает наличие JPEG и PNG файлов при пуше коммитов в основную ветку, и при обнаружении таковых добавит AVIF и WebP версии с помощью нового коммита.

В директории `.github/workflows` вашего репозитория создайте файл `optimizt-push.yml` со следующим содержимым:

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

## Пример оптимизации изображений в PR

Воркфлоу отслеживает наличие изображений в пул-реквесте, и при обнаружении таковых оптимизирует их, а так же добавит AVIF и WebP версии с помощью нового коммита.

В директории `.github/workflows` вашего репозитория создайте файл `optimizt-pr.yml` со следующим содержимым:

```yml
name: Optimize images

on:
  pull_request:
    # Runs only if you open a new PR or push a new commit to the HEAD ref of the PR
    types: [opened, synchronize]
    paths:
      - '**.jpe?g'
      - '**.png'
      - '**.gif'
      - '**.svg'

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

jobs:
  optimize-and-convert:
    runs-on: ubuntu-latest
    env:
      IMAGES_PATHS: ''
      IMAGES_PATHS_AVIF: ''

    steps:
      # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0 # Get all commits
          ref: ${{ github.head_ref }} # Checkout to source branch of the PR (only if PR method used)

      - name: Setup Git config
        run: |
          git config --local user.name "github-actions[bot]"
          git config --local user.email "actions@github.com"

      # Get list of changed files
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

      # Install Node.js to avoid EACCESS errors upon install packages
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
