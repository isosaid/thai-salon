# Токены

Токен — единственный источник правды о значении. Если цвет или отступ не описан
токеном, его нельзя использовать в макете.

Три представления одного набора:

| Файл | Для кого |
|---|---|
| `tokens.md` (этот файл) | дизайнер, менеджер — смотреть и обсуждать |
| [`tokens.css`](tokens.css) | веб-разработчик — подключить напрямую |
| [`tokens.json`](tokens.json) | Figma Tokens, Style Dictionary, генераторы |

**Правило синхронизации:** изменение вносится во все три файла в одном коммите.
Расхождение между ними — дефект системы, а не «мелочь».

## Уровни токенов

```
Примитив             →  Семантический        →  Компонентный
--color-forest-700      --action-primary        --button-primary-bg
#2E5A49                 ссылается на            ссылается на
                        --color-forest-700      --action-primary
```

Примитивы и семантические токены определены в [`tokens.css`](tokens.css).
Компонентные (`--button-primary-bg` и подобные) определяются рядом со своим
компонентом и всегда ссылаются на семантический токен, никогда — на примитив
и никогда на голый HEX.

В макетах и коде используются **семантические и компонентные** токены.
Примитивы напрямую — только внутри определения семантических.

## Бренд

| Токен | Значение |
|---|---|
| `--brand-name-ru` | ОРОМ |
| `--brand-name-tj` | ОРОМ |
| `--brand-name-en` | OROM |
| `--brand-legal-ru` | Центр массажа и восстановления «ОРОМ» |
| `--brand-tagline-ru` | Тело помнит заботу |
| `--brand-tagline-tj` | Бадан ғамхориро дар ёд дорад |
| `--brand-tagline-en` | The body remembers care |
| `--brand-domain` | orom.tj |

## Цвет — примитивы

| Токен | HEX |
|---|---|
| `--color-forest-900` | `#14271F` |
| `--color-forest-800` | `#1F3D32` |
| `--color-forest-700` | `#2E5A49` |
| `--color-forest-600` | `#3F7A62` |
| `--color-forest-300` | `#9CBFB0` |
| `--color-forest-100` | `#DCE9E3` |
| `--color-terra-700` | `#9E4A2E` |
| `--color-terra-600` | `#B45A38` |
| `--color-terra-500` | `#C06B4A` |
| `--color-terra-200` | `#F0D3C5` |
| `--color-sand-500` | `#D8C4A8` |
| `--color-sand-300` | `#EADFD0` |
| `--color-sand-100` | `#F4EDE3` |
| `--color-cream` | `#FBF8F3` |
| `--color-ink-900` | `#1A1714` |
| `--color-ink-600` | `#4A423A` |
| `--color-ink-400` | `#7A6E62` |
| `--color-line` | `#E3D9CB` |
| `--color-gold-600` | `#C9922F` |
| `--color-danger-600` | `#A33A2C` |
| `--color-info-600` | `#3C6E8F` |

## Цвет — семантические

| Токен | Ссылается на | Назначение |
|---|---|---|
| `--bg-page` | `cream` | фон страницы |
| `--bg-surface` | `sand-100` | карточка |
| `--bg-surface-2` | `sand-300` | вложенная поверхность, зебра |
| `--bg-inverse` | `forest-800` | тёмный блок, подвал |
| `--text-primary` | `ink-900` | основной текст |
| `--text-secondary` | `ink-600` | второй уровень |
| `--text-muted` | `ink-400` | подписи, мета |
| `--text-on-inverse` | `cream` | текст на тёмном |
| `--text-link` | `forest-700` | ссылка |
| `--text-accent` | `terra-700` | акцентный текст |
| `--border-default` | `line` | граница |
| `--border-strong` | `sand-500` | рамка документа |
| `--border-focus` | `forest-600` | кольцо фокуса |
| `--action-primary` | `forest-700` | основная кнопка |
| `--action-primary-hover` | `forest-800` | наведение |
| `--action-accent` | `terra-600` | акцентная кнопка |
| `--action-accent-hover` | `terra-700` | наведение |
| `--status-success` | `forest-600` | записано, курс идёт |
| `--status-warning` | `gold-600` | курс заканчивается |
| `--status-danger` | `danger-600` | отмена, просрочка |
| `--status-info` | `info-600` | информация |
| `--segment-corporate` | `forest-700` | корпоративный пакет |
| `--segment-private` | `terra-600` | частный клиент |
| `--segment-certificate` | `gold-600` | сертификат |
| `--segment-child` | `info-600` | детская программа |
| `--slot-free` | `forest-100` | свободный слот |
| `--slot-busy` | `sand-300` | занятый слот |
| `--slot-selected` | `forest-700` | выбранный слот |
| `--slot-unavailable` | `sand-100` | недоступный слот |

## Типографика

| Токен | Значение |
|---|---|
| `--font-display` | `"PT Serif", Georgia, serif` |
| `--font-text` | `"Inter", "PT Sans", system-ui, sans-serif` |
| `--font-mono` | `"JetBrains Mono", ui-monospace, monospace` |
| `--text-display-1` | `700 72px/76px var(--font-display)` |
| `--text-display-2` | `700 56px/62px var(--font-display)` |
| `--text-h1` | `700 40px/48px var(--font-display)` |
| `--text-h2` | `700 32px/40px var(--font-display)` |
| `--text-h3` | `400 24px/32px var(--font-display)` |
| `--text-h4` | `600 20px/28px var(--font-text)` |
| `--text-body-lg` | `400 18px/28px var(--font-text)` |
| `--text-body` | `400 16px/26px var(--font-text)` |
| `--text-body-sm` | `400 14px/22px var(--font-text)` |
| `--text-caption` | `400 12px/18px var(--font-text)` |
| `--text-overline` | `600 12px/16px var(--font-text)`, трекинг `0.08em`, uppercase |
| `--text-mono` | `400 15px/24px var(--font-mono)` |

## Отступы

`--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 20 ·
`--space-6` 24 · `--space-8` 32 · `--space-10` 40 · `--space-12` 48 · `--space-16` 64 ·
`--space-20` 80 · `--space-24` 96 · `--space-32` 128 (px)

## Радиусы

`--radius-sm` 6 · `--radius-md` 12 · `--radius-lg` 20 · `--radius-xl` 32 ·
`--radius-pill` 999 · `--radius-none` 0 (px)

## Тени

| Токен | Значение |
|---|---|
| `--shadow-xs` | `0 1px 2px rgba(26,23,20,.06)` |
| `--shadow-sm` | `0 2px 8px rgba(26,23,20,.07)` |
| `--shadow-md` | `0 8px 24px rgba(26,23,20,.09)` |
| `--shadow-lg` | `0 20px 48px rgba(26,23,20,.12)` |

## Движение

| Токен | Значение |
|---|---|
| `--duration-instant` | 80ms |
| `--duration-fast` | 160ms |
| `--duration-base` | 240ms |
| `--duration-slow` | 360ms |
| `--duration-page` | 480ms |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` |
| `--ease-in` | `cubic-bezier(.64,0,.78,0)` |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` |

## Сетка

| Токен | Значение |
|---|---|
| `--container-max` | 1200px |
| `--container-text` | 720px |
| `--grid-columns` | 12 |
| `--grid-gutter` | 24px |
| `--breakpoint-sm` | 600px |
| `--breakpoint-md` | 900px |
| `--breakpoint-lg` | 1280px |
| `--breakpoint-xl` | 1600px |

## Бизнес-константы центра

Взяты из операционной модели — используются в интерфейсе и расчётах.

| Токен | Значение |
|---|---|
| `--session-duration-min` | 90 |
| `--slots-per-day` | 6 |
| `--slot-times` | `11:00, 12:30, 14:00, 15:30, 17:00, 18:30` |
| `--rooms-count` | 3 |
| `--course-default-sessions` | 10 |
| `--closed-weekday` | `sunday` |
| `--daily-capacity` | 18 |

## Палитра графиков

Отдельный набор: интерфейсные цвета намеренно приглушены и в графиках читаются
как серые. Подробные правила — [`03-web-platform/05-admin-dashboard.md`](../03-web-platform/05-admin-dashboard.md).

### Категориальная — фиксированный порядок, не циклится

| № | Токен | Светлая | Тёмная | Сегмент |
|---|---|---|---|---|
| 1 | `--chart-cat-1` | `#0E7A55` | `#298954` | корпоративный пакет |
| 2 | `--chart-cat-2` | `#C9922F` | `#B18D2A` | сертификат |
| 3 | `--chart-cat-3` | `#2A6DA8` | `#488ACB` | детская программа |
| 4 | `--chart-cat-4` | `#B45A38` | `#BB6543` | частный клиент |

Проверено: худшая соседняя пара при протанопии — ΔE 14,6; минимум при нормальном
зрении — 23,9; все четыре в полосе светлоты и выше порога цветности.
`#C9922F` даёт 2,6:1 к фону, поэтому при его использовании обязательны видимые
подписи значений или доступная таблица.

### Последовательная — величина, тепловая карта

`--chart-seq-1` `#7DB992` → `--chart-seq-2` `#59A375` → `--chart-seq-3` `#378C5B`
→ `--chart-seq-4` `#227347` → `--chart-seq-5` `#195936`

Монотонна по светлоте, светлый конец 2,15:1 к поверхности.

### Параметры отрисовки

| Токен | Значение |
|---|---|
| `--chart-mark-width` | 2px |
| `--chart-mark-radius` | 4px |
| `--chart-gap` | 2px |
| `--chart-grid` | `--color-line` |
