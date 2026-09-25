# GitHub Actions integration

Use a supported Node.js release and pass filenames as distinct arguments. Do not assemble changed paths into a shell string: spaces, wildcard characters, and leading hyphens would be reinterpreted by the shell.

The following workflow optimizes changed images and creates WebP variants. `tj-actions/changed-files` exposes newline-delimited paths, which the step reads without word splitting.

```yaml
name: Optimize images

on:
  pull_request:
    types: [opened, synchronize]
    paths:
      - '**.jpg'
      - '**.jpeg'
      - '**.png'
      - '**.gif'
      - '**.svg'

permissions:
  contents: write

jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.head_ref }}
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '24.18.0'

      - run: npm install --global @343dev/optimizt

      - id: changed
        uses: tj-actions/changed-files@v47
        with:
          files: |
            **.jpg
            **.jpeg
            **.png
            **.gif
            **.svg
          separator: ${{ '\n' }}

      - name: Optimize changed images
        if: steps.changed.outputs.any_changed == 'true'
        env:
          CHANGED_FILES: ${{ steps.changed.outputs.all_changed_files }}
        shell: bash
        run: |
          mapfile -t images <<< "$CHANGED_FILES"
          optimizt -- "${images[@]}"

      - name: Create WebP variants
        if: steps.changed.outputs.any_changed == 'true'
        env:
          CHANGED_FILES: ${{ steps.changed.outputs.all_changed_files }}
        shell: bash
        run: |
          mapfile -t images <<< "$CHANGED_FILES"
          raster=()
          for image in "${images[@]}"; do
            case "$image" in
              *.jpg|*.jpeg|*.png|*.gif) raster+=("$image") ;;
            esac
          done
          ((${#raster[@]} == 0)) || optimizt --webp -- "${raster[@]}"

      - name: Commit results
        run: |
          git config user.name 'github-actions[bot]'
          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          git add --all
          git diff --cached --quiet || git commit -m 'chore(images): optimize images'
          git push
```

Pin third-party actions to full commit SHAs in security-sensitive repositories. The major-version tags above keep the example readable but are mutable.
