# Sublime Text 3: интеграция Optimizt с помощью плагина

Пути расположения пользовательских настроек:

- macOS: `~/Library/Application Support/Sublime Text 3/Packages/User`
- Linux: `~/.config/sublime-text-3/Packages/User`
- Windows: `%APPDATA%\Sublime Text 3\Packages\User`

## Добавьте плагин

В директории настроек создайте файл `optimizt.py` со следующим содержимым:

```python
import os
import sublime
import sublime_plugin

optimizt = "~/.nodenv/shims/optimizt"

class OptimiztCommand(sublime_plugin.WindowCommand):
  def run(self, paths=[], options=""):
    if len(paths) < 1:
      return

    safe_paths = ["\"" + i + "\"" for i in paths]
    shell_cmd = optimizt + " " + options + " " + " ".join(safe_paths)
    cwd = os.path.dirname(paths[0])

    self.window.run_command("exec", {
      "shell_cmd": shell_cmd,
      "working_dir": cwd
    })
```

В переменной `optimizt` пропишите путь до исполняемого файла, который можно получить с помощью выполнения команды `command -v optimizt` (в *nix) или `where optimizt` (в Windows).

## Интегрируйте плагин в контекстное меню сайдбара

В директории настроек создайте файл `Side Bar.sublime-menu` со следующим содержимым:

```json
[
    {
        "caption": "Optimizt",
        "children": [
          {
              "caption": "Optimize Images",
              "command": "optimizt",
              "args": {
                "paths": [],
                "options": "--verbose"
              }
          },
          {
              "caption": "Optimize Images (lossless)",
              "command": "optimizt",
              "args": {
                "paths": [],
                "options": "--lossless --verbose"
              }
          },
          {
              "caption": "Create WebP",
              "command": "optimizt",
              "args": {
                "paths": [],
                "options": "--webp --verbose"
              }
          },
          {
              "caption": "Create WebP (lossless)",
              "command": "optimizt",
              "args": {
                "paths": [],
                "options": "--webp --lossless --verbose"
              }
          }
        ]
    }
]
```

## Как использовать

Вызовите контекстное меню на файле или директории и запустите необходимое:

<img src="./sublime-text_sidebar_menu.png" width="55%" alt="Скриншот контекстного меню директории в редакторе Sublime Text 3">
