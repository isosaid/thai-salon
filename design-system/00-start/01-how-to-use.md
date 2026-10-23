# Как пользоваться системой

## Кто что берёт

| Ваша роль | Откройте в первую очередь |
|---|---|
| Дизайнер постеров и постов | [`01-foundations/03-color.md`](../01-foundations/03-color.md), [`04-social/02-sample-posters.md`](../04-social/02-sample-posters.md) |
| SMM-менеджер | [`04-social/03-sample-posts.md`](../04-social/03-sample-posts.md), [`06-content/02-copy-library-ru-tj-en.md`](../06-content/02-copy-library-ru-tj-en.md) |
| Видеограф / колорист | [`01-foundations/08-video-and-grading.md`](../01-foundations/08-video-and-grading.md) |
| Веб-разработчик | [`02-tokens/tokens.css`](../02-tokens/tokens.css), [`03-web-platform/02-components.md`](../03-web-platform/02-components.md) |
| Администратор центра | [`05-documents/`](../05-documents/) — готовые бланки |
| Руководитель | [`00-start/02-insights-from-data.md`](02-insights-from-data.md), [`05-documents/05-sample-monthly-report.md`](../05-documents/05-sample-monthly-report.md) |

## Как читать образцы

Образцы в этой системе — не картинки, а **текстовые спецификации**. У каждого образца
три слоя, и все три обязательны:

1. **Раскладка** — ASCII-схема или SVG-файл в [`assets/`](../assets/): что где стоит, какие размеры.
2. **Токены** — какие именно цвета, шрифты и отступы берутся. Без «на глаз».
3. **Текст** — готовый копирайт на трёх языках, который можно ставить без переписывания.

Так образец переносится в любой инструмент: Figma, Canva, Illustrator, InDesign, Premiere,
After Effects, HTML. Система не привязана к программе.

Пример чтения спецификации:

```
┌──────────────────────────────┐   фон:      --color-surface-cream
│  [лого 180px]                │   отступ:   --space-8 (32px) от краёв
│                              │
│  КУРС 10 СЕАНСОВ             │   H1: PT Serif 600, 64/68, --color-ink-900
│  за 3 недели                 │   H2: Inter 400, 28/36, --color-ink-600
│                              │
│  [кнопка: Записаться]        │   Button/primary: --color-forest-700
└──────────────────────────────┘
```

## Чего система не делает

- **Не заменяет съёмку.** Фотостиль описан, но фотографии нужно сделать.
- **Не содержит исходников Figma.** Это намеренно: markdown читается человеком и ИИ,
  не ломается при смене инструмента и версионируется в git.
- **Не описывает медицинские показания.** Любые формулировки о лечении согласуются
  со специалистом центра — см. [`07-governance/01-checklists.md`](../07-governance/01-checklists.md).

## Как вносить изменения

1. Правка идёт в markdown, не в готовый макет.
2. Версия поднимается в [`CHANGELOG.md`](../CHANGELOG.md) по правилам оттуда.
3. Если меняется токен — меняется в трёх местах сразу:
   [`tokens.md`](../02-tokens/tokens.md), [`tokens.css`](../02-tokens/tokens.css),
   [`tokens.json`](../02-tokens/tokens.json). Расхождение между ними — дефект системы.

## Как использовать систему с ИИ

Система написана так, чтобы её можно было отдать языковой модели целиком как контекст.
Рабочая формула запроса:

```
Контекст: [вставить 01-foundations/01-brand-platform.md + 06-content/01-voice-and-tone.md]
Задача:   пост в Instagram о слабой загрузке слота 15:30
Формат:   по образцу из 04-social/03-sample-posts.md, образец №4
Языки:    RU + TJ
```

Для генерации изображений и видео берите промпты из
[`01-foundations/07-photography.md`](../01-foundations/07-photography.md) — там они
даны вместе с русским переводом.
