# Visual Studio Code: интеграция Optimizt с помощью «Tasks»

## Добавьте Task

С помощью _Command Palette_ выберите пункт `>Tasks: Open User Tasks`.

В открывшемся файле, в массив `tasks` добавьте нужные задачи, например:

```javascript
{
  // See https://go.microsoft.com/fwlink/?LinkId=733558
  // for the documentation about the tasks.json format
  "version": "2.0.0",
  "tasks": [
    {
      "label": "optimizt: Optimize Image",
      "type": "shell",
      "command": "optimizt",
      "args": [
        "--verbose",
        {
          "value": "${file}",
          "quoting": "strong"
        }
      ],
      "presentation": {
        "echo": false,
        "showReuseMessage": false,
        "clear": true
      }
    },
    {
      "label": "optimizt: Optimize Image (lossless)",
      "type": "shell",
      "command": "optimizt",
      "args": [
        "--lossless",
        "--verbose",
        {
          "value": "${file}",
          "quoting": "strong"
        }
      ],
      "presentation": {
        "echo": false,
        "showReuseMessage": false,
        "clear": true
      }
    },
    {
      "label": "optimizt: Create WebP",
      "type": "shell",
      "command": "optimizt",
      "args": [
        "--webp",
        "--verbose",
        {
          "value": "${file}",
          "quoting": "strong"
        }
      ],
      "presentation": {
        "echo": false,
        "showReuseMessage": false,
        "clear": true
      }
    },
    {
      "label": "optimizt: Create WebP (lossless)",
      "type": "shell",
      "command": "optimizt",
      "args": [
        "--webp",
        "--lossless",
        "--verbose",
        {
          "value": "${file}",
          "quoting": "strong"
        }
      ],
      "presentation": {
        "echo": false,
        "showReuseMessage": false,
        "clear": true
      }
    }
  ]
}
```

## Как использовать

1. Откройте нужный файл для обработки с помощью Оптимизта, он должен быть в активной вкладке.
2. С помощью _Command Palette_ выберите пункт `>Tasks: Run Task`.
3. Выберите нужную задачу.

## Горячие клавиши

Добавить горячую клавишу для задачи можно выбрав пункт `>Preferences: Open Keyboard Shortcuts (JSON)` в _Command Palette_.

Пример добавления горячей клавиши для запуска задачи «optimizt: Optimize Image (lossless)»:

```javascript
// Place your key bindings in this file to override the defaults
[
  {
    "key": "ctrl+l",
    "command": "workbench.action.tasks.runTask",
    "args": "optimizt: Optimize Image (lossless)"
  }
]
```
