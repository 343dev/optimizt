# @343dev/optimizt

<img align="right" width="192" height="192"
     alt="Аватар Оптимизта: «OK» жест с картиной Моной Лизой между пальцами"
     src="./docs/logo.png">

[![npm](https://img.shields.io/npm/v/@343dev/optimizt.svg)](https://www.npmjs.com/package/@343dev/optimizt)

**Optimizt** — это консольная утилита, помогающая подготавливать картинки для веба.

Она умеет сжимать PNG, JPEG, GIF и SVG с потерями и без, а также создавать AVIF и WebP-версии для растровых изображений.

## Мотивация

Будучи фронтендерами мы должны помнить о картинках: сжимать PNG и JPEG, удалять лишние куски из SVG, создавать AVIF и WebP для современных браузеров и так далее. Однажды мы устали использовать кучу разных утилит для всего этого и создали одну единственную, которая делает всё, что нам нужно.

## Использование

Установить:

```sh
npm i -g @343dev/optimizt
```

Оптимизировать!

```sh
optimizt path/to/picture.jpg
```

## Флаги

- `--avif` — создать AVIF-версии изображений.
- `--webp` — создать WebP-версии изображений.
- `-f, --force` — пересоздавать AVIF и WebP-версии, если файл уже существует.
- `-l, --lossless` — оптимизировать без потерь, а не с потерями.
- `-v, --verbose` — выводить дополнительную информацию в ходе работы (например, проигнорированные файлы).
- `-c, --config` — использовать указанный файл с настройками, вместо настроек по умолчанию.
- `-o, --output` — сохранять результат в указанную директорию.
- `-V, --version` — вывести версию утилиты.
- `-h, --help` — вывести справочную информацию.

## Примеры использования

```bash
# оптимизация одной картинки
optimizt path/to/picture.jpg

# оптимизация нескольких изображений без потерь
optimizt --lossless path/to/picture.jpg path/to/another/picture.png

# рекурсивное создание AVIF и WebP-версий для изображений в указанной директории
optimizt --avif --webp path/to/directory

# рекурсивная оптимизация JPEG в текущей директории
find . -iname \*.jpg -exec optimizt {} +
```

## Разница между Lossy и Lossless

### Lossy (по умолчанию)

Позволяет получить итоговое изображение с соблюдением баланса между высоким уровнем сжатия и минимальным количеством визуальных искажений.

### Lossless (запуск с флагом --lossless)

При создании AVIF и WebP-версий применяются оптимизации, которые не влияют на визуальное качество изображений.

Для оптимизации PNG, JPEG и GIF используются настройки с уклоном на получение максимального визуального качества изображений в ущерб итоговому размеру файла.

При обработке SVG-файлов настройки в Lossy и Lossless режимах — идентичны.

## Конфигурация

Операции с [JPEG](https://sharp.pixelplumbing.com/api-output#jpeg), [PNG](https://sharp.pixelplumbing.com/api-output#png), [WebP](https://sharp.pixelplumbing.com/api-output#webp) и [AVIF](https://sharp.pixelplumbing.com/api-output#avif) производятся с помощью библиотеки [sharp](https://github.com/lovell/sharp), а SVG обрабатывается с помощью утилиты [svgo](https://github.com/svg/svgo).

Для оптимизации GIF используется [gifsicle](https://github.com/kohler/gifsicle).

> [!NOTE]
> В режиме Lossless для оптимизации JPEG используется энкодер [Guetzli](https://github.com/google/guetzli), который позволяет получить высокий уровень компрессии и при этом сохранить хорошее визуальное качество изображения. Но, нужно иметь в виду, что при повторной оптимизации файла размер может уменьшаться за счёт деградации визуального качества изображения.

Настройки по умолчанию расположены в [.optimiztrc.cjs](./.optimiztrc.cjs), файл содержит список поддерживаемых параметров и их краткое описание.

Для отключения любого из параметров следует использовать значение `false`.

При запуске с флагом `--config path/to/.optimiztrc.cjs` для обработки изображений будут использоваться настройки из указанного конфигурационного файла.

При обычном запуске, без флага `--config`, будет произведён рекурсивный поиск файла `.optimiztrc.cjs` начиная с текущей директории и до корня файловой системы. Если файл не найден, то будут применены настройки по умолчанию.

## Решение проблем

### «spawn guetzli ENOENT» и т. д.

Перед установкой необходимо убедиться в том, что не используется опция [ignore-scripts](https://docs.npmjs.com/cli/v6/using-npm/config#ignore-scripts).

Подробнее: [funbox/optimizt/issues/9](https://github.com/funbox/optimizt/issues/9).

### «pkg-config: command not found», «fatal error: 'png.h' file not found» и т. д.

На некоторых ОС могут отсутствовать необходимые библиотеки и утилиты, нужно установить их самостоятельно.

Пример установки на macOS с помощью [Homebrew](https://brew.sh/index_ru):

```bash
brew install pkg-config libpng
```

## Docker

### Использование готового образа

```bash
# pull по названию
docker pull 343dev/optimizt

# pull по названию и версии
docker pull 343dev/optimizt:9.0.2
```

### Самостоятельная сборка образа

```bash
# клонировать репозиторий Optimizt
git clone https://github.com/343dev/optimizt.git

# перейти в каталог с репозиторием
cd optimizt

# собрать образ
docker build --tag 343dev/optimizt .
```

ИЛИ:

```bash
# собрать образ без клонирования репозитория
# при этом файл .dockerignore из указанного репозитория будет проигнорирован: https://github.com/docker/cli/issues/2827
docker build --tag 343dev/optimizt https://github.com/343dev/optimizt.git
```

### Запуск контейнера

```bash
# внутри контейнера значение WORKDIR установлено как `/src`, поэтому все пути будут разрешаться относительно неё
docker run --rm --volume $(pwd):/src 343dev/optimizt --webp ./image.png
```

## Интеграции

- [JetBrains IDEs](./docs/jetbrains.ru.md)
- [Visual Studio Code](./docs/vscode.ru.md)
- [Sublime Text 3](./docs/sublime-text.ru.md)
- [GitHub Actions Workflow](./docs/github.ru.md)

## Благодарности

Клёвую картинку для репозитория нарисовал [Игорь Гарибальди](http://pandabanda.com/).
