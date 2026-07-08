# Scrum Planning Poker

Веб-приложение для покерного планирования в Scrum-командах. Участники подключаются к общей
комнате и анонимно голосуют за оценку задачи картами из колоды Фибоначчи, а администратор видит
результаты в реальном времени.

## Технологический стек

**Клиент:** React 19 + Vite, Socket.IO Client, Axios
**Сервер:** Node.js + Express 5, Socket.IO, TypeScript (частично, через `ts-node`), cookie-based
сессии, in-memory хранилище
**Стилистика:** монохромный терминальный интерфейс (`Courier New`, ASCII-арт)

## Архитектура сервера

Сервер разбит на слои (Presentation → Business logic → Data access), каждый обращается только к
слою ниже:

```
routes.js / socketHandler.js      — presentation layer (HTTP и WebSocket)
        ↓
controllers/RoomController.ts     — presentation layer для WebSocket-транспорта
        ↓
services/RoomService.ts           — business logic layer (валидация, права, Result<T>)
services/SessionService.ts
        ↓
repositories/RoomRepository.ts    — data access layer (CRUD, сейчас — Map в памяти)
repositories/SessionRepository.ts
        ↓
rooms/Rooms.ts                    — domain-модель комнаты
rooms/vote.ts                     — domain-модель голоса
```

HTTP (`routes.js`) и WebSocket (`socketHandler.js` → `RoomController`) — два независимых входа в
одну и ту же бизнес-логику. Общие правила (кто админ, что можно делать) не дублируются: WS-путь,
где это возможно, сам зовёт `RoomService`.

Все операции, которые могут завершиться неудачей, возвращают унифицированный `Result<T>`
(`{ success: true, data }` либо `{ success: false, error: { code, message } }`) вместо `throw` —
см. `src/types/errors.ts`. Коды ошибок — `ErrorCode` (например, `ROOM_NOT_FOUND`, `NOT_ADMIN`,
`ALREADY_VOTED`). HTTP-роуты переводят `Result` в ответ через `src/utils/sendResult.ts`
(код ошибки → HTTP-статус).

Часть кода — на TypeScript (модели, типы, репозитории, сервисы, контроллер, валидаторы), часть
осталась на обычном JS (роуты, socket-обработчик, пара тонких shim-файлов для обратной
совместимости). Это осознанное решение: TS — там, где он даёт ощутимую пользу (типы, доменные
модели), без полного переписывания проекта.

## Структура проекта

```
ScrumPlanningPoker/
├── client/                        # React-приложение (Vite)
│   └── src/
│       ├── api/                   # http.js (axios), socket.js (socket.io-client)
│       ├── components/            # CardDeck, ParticipantList
│       ├── context/                # SocketContext (подключение сокета после HTTP-сессии)
│       └── pages/                 # JoinPage, AdminPage, ParticipantPage
└── server/                        # Node.js-сервер
    ├── app.js                     # точка входа: регистрирует ts-node/register, запускает AppServer
    ├── tsconfig.json              # конфиг для ts-node (без отдельного шага сборки)
    └── src/
        ├── server/AppServer.ts    # класс сервера: Express + Socket.IO + middleware + запуск/остановка
        ├── routes.js              # HTTP API (Express-роуты)
        ├── socket/socketHandler.js# WebSocket-обработчик событий
        ├── controllers/
        │   └── RoomController.ts  # бизнес-логика WS-транспорта, Result<T>
        ├── services/
        │   ├── RoomService.ts     # бизнес-логика комнат, валидация, Result<T>
        │   └── SessionService.ts  # бизнес-логика сессий
        ├── repositories/
        │   ├── RoomRepository.ts    # хранилище комнат (Map)
        │   └── SessionRepository.ts # хранилище сессий (Map)
        ├── rooms/
        │   ├── Rooms.ts            # доменная модель комнаты (класс Room)
        │   ├── vote.ts             # доменная модель голоса (Vote: number | special)
        │   ├── voteMetrics.js      # median/average/distribution по голосам
        │   └── roomService.js      # legacy-обёртка над services/RoomService (для обратной совместимости)
        ├── session/
        │   └── sessionService.js   # legacy-обёртка над services/SessionService
        ├── types/
        │   ├── errors.ts           # Result<T>, ErrorCode, AppError
        │   └── constants.ts        # RoomStatus, WebSocketEvent (enum'ы вместо строк)
        ├── validators/
        │   └── requestValidators.ts# валидация входных данных (имя, кворум)
        └── utils/
            └── sendResult.ts       # Result<T> → HTTP-ответ
```

## Установка и запуск

### Требования

- Node.js ≥ 18
- npm

### Сервер

```bash
cd server
npm install
npm run dev      # nodemon — авторестарт при изменениях
```

Сервер запускается на `http://localhost:3001`. TypeScript-файлы подключаются напрямую через
`ts-node/register` — отдельный шаг сборки (`tsc`) не требуется ни в dev, ни при `npm start`.

### Клиент

```bash
cd client
npm install
npm run dev
```

Клиент запускается на `http://localhost:5173`.

> Оба процесса должны работать одновременно. В продакшн-режиме запустите `npm run build` в
> `client/` и раздайте собранный `dist/` через любой статический сервер или настройте отдачу через
> Express.

## Функциональность

### Роли

**Администратор** — создаёт комнату, запускает и останавливает раунды, задаёт тему голосования и
кворум, закрывает комнату. Админ не считается участником комнаты: не входит в список участников и
не учитывается в кворуме, даже если открывает ссылку комнаты повторно в другой вкладке через форму
«Войти».

**Участник** — входит по коду комнаты, голосует картой в текущем раунде.

### Флоу работы

1. Администратор создаёт комнату и выбирает режим подведения результата (медиана / среднее / все
   голоса + медиана).
2. Участники подключаются по 6-символьному коду или прямой ссылке `/join/XXXXXX`.
3. Администратор задаёт тему задачи, устанавливает кворум и запускает раунд.
4. Участники выбирают карту; при достижении кворума раунд завершается автоматически (только через
   WebSocket-путь — см. ниже). Администратор может также остановить раунд вручную.
5. Показываются результаты: итоговая оценка и (в режиме `all`) голоса всех участников.
6. Администратор начинает следующий раунд или закрывает комнату.

> HTTP-эндпоинт `/vote` и WebSocket-событие `cast_vote` ведут себя чуть по-разному: WS
> автоматически останавливает раунд при достижении кворума, HTTP — нет (раунд останавливается
> только явным вызовом `/stop`). Клиент всегда использует WebSocket-путь для голосования.

### Колода

По умолчанию используется расширенная последовательность Фибоначчи:
`0, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?, ∞`

### Socket-события

| Направление     | Событие             | Описание                                              |
|-----------------|---------------------|-------------------------------------------------------|
| клиент → сервер | `join_room`         | Подключить сокет к комнате                            |
| клиент → сервер | `leave_room`        | Покинуть комнату                                      |
| клиент → сервер | `close_room`        | Закрыть комнату (только администратор)                |
| клиент → сервер | `start_round`       | Начать раунд (только администратор)                   |
| клиент → сервер | `stop_round`        | Остановить раунд (только администратор)               |
| клиент → сервер | `new_round`         | Перейти к следующему раунду (только администратор)    |
| клиент → сервер | `set_topic`         | Установить тему голосования (только администратор)    |
| клиент → сервер | `cast_vote`         | Проголосовать картой                                  |
| сервер → клиент | `room_joined`       | Состояние комнаты после подключения сокета            |
| сервер → клиент | `participant_joined`| Новый участник в комнате (не отправляется для админа) |
| сервер → клиент | `participant_left`  | Участник покинул комнату / отключился                 |
| сервер → клиент | `room_closed`       | Комната закрыта администратором                       |
| сервер → клиент | `round_started`     | Раунд начался                                         |
| сервер → клиент | `topic_updated`     | Тема голосования изменена                             |
| сервер → клиент | `vote_cast`         | Кто-то проголосовал (счётчик голосов обновлён)        |
| сервер → клиент | `vote_error`        | Голос не принят (`{ code, message }`)                 |
| сервер → клиент | `round_stopped`     | Раунд завершён, есть результаты                       |
| сервер → клиент | `new_round_ready`   | Комната готова к новому раунду                        |
| сервер → клиент | `error`             | Общая ошибка (например, комната не найдена)           |

### HTTP API

Все ответы с ошибкой имеют вид `{ error: string, code: string }`, где `error` — человекочитаемый
текст (можно показывать прямо в UI), `code` — значение `ErrorCode` для программной обработки.

| Метод  | Маршрут                   | Описание                                              |
|--------|---------------------------|-------------------------------------------------------|
| `POST` | `/api/room`               | Создать комнату                                       |
| `GET`  | `/api/room/:code`         | Состояние комнаты                                     |
| `POST` | `/api/room/:code/join`    | Войти в комнату (`{ ok, isAdmin }`)                   |
| `POST` | `/api/room/:code/start`   | Начать раунд                                          |
| `POST` | `/api/room/:code/stop`    | Остановить раунд                                      |
| `POST` | `/api/room/:code/vote`    | Проголосовать (без авто-остановки по кворуму)         |
| `GET`  | `/api/session`            | Текущая сессия пользователя и её роль в комнате       |

### Сессии

Идентификация пользователей осуществляется через `httpOnly`-куки `sessionId` (24 ч). При
перезапуске сервера cookie сохраняется: права администратора на комнату при этом не теряются за
счёт восстановления сессии с тем же ID (`requireSession` в `routes.js`).

### Хранилище

Все данные хранятся в памяти процесса (`Map`, за интерфейсом `RoomRepository`/
`SessionRepository`). Комнаты автоматически удаляются через 24 часа фоновой задачей
(`RoomService.cleanupStale`). При перезапуске сервера все активные комнаты теряются.

## Известные ограничения

- Нет базы данных: данные не переживают перезапуск сервера.
- CORS настроен на `http://localhost:5173` по умолчанию (`src/server/AppServer.ts`, опция
  `corsOrigin`) — для деплоя нужно передать другой origin при создании `AppServer`.
- Один экземпляр приложения (нет поддержки горизонтального масштабирования через Redis Adapter).
- Автоматических тестов пока нет, но архитектура (DI через конструкторы в сервисах/контроллере)
  рассчитана на то, чтобы их можно было добавить без переделки кода.
  
## Скриншоты

<img width="452" height="812" alt="image" src="https://github.com/user-attachments/assets/a9832381-1d1d-4fad-96b2-a01fec62e750" />
<img width="495" height="722" alt="image" src="https://github.com/user-attachments/assets/a3b48c7a-2109-46ad-be50-69dfc7a79cee" />
<img width="369" height="507" alt="image" src="https://github.com/user-attachments/assets/5a34e1e6-c414-4454-9306-04dd3b666c7f" />
<img width="616" height="783" alt="image" src="https://github.com/user-attachments/assets/434a9769-3fad-4644-acde-cc89e9c4e277" />
<img width="369" height="616" alt="image" src="https://github.com/user-attachments/assets/32643e25-ae64-48c4-8190-3765ac8b8fba" />
<img width="444" height="906" alt="image" src="https://github.com/user-attachments/assets/3c72f806-94f1-4db3-b040-d83f3d29e322" />

## Автор

Титов В.Д., ПИ-31, АлтГТУ
[GitHub: ktljhtp/ScrumPlanningPoker](https://github.com/ktljhtp/ScrumPlanningPoker)
