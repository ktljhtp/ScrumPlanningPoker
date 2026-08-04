import express, { Express, Router } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { RoomController } from '../controllers/RoomController';
import { roomService } from '../services/RoomService';
import { sessionService } from '../services/SessionService';

export interface AppServerOptions {
  port?: number | string;
  corsOrigin?: string;
  routes?: Router;
  attachSocketHandlers?: (io: SocketIOServer, deps: { roomController: RoomController }) => void;
}

export class AppServer {
  private app: Express;
  private httpServer: http.Server;
  private io: SocketIOServer;
  private port: number;
  private roomController: RoomController;

  constructor(options: AppServerOptions = {}) {
    const corsOrigin = options.corsOrigin || 'http://localhost:5173';
    this.port = Number(options.port || process.env.PORT || 3001);

    // AppServer — композиционный корень: контроллеры собираются здесь,
    // а не живут как глобальные синглтоны в своих модулях (см. было раньше
    // `export const roomController = new RoomController(...)` в
    // RoomController.ts). Так AppServer явно владеет графом зависимостей
    // и может передать нужные экземпляры туда, где они требуются
    // (сокеты, роуты, тесты с изолированным инстансом сервера).
    this.roomController = new RoomController(roomService, sessionService);

    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: { origin: corsOrigin, credentials: true },
    });

    this.configureMiddleware(corsOrigin);
    this.configureRoutes(options.routes);
    this.configureSockets(options.attachSocketHandlers);
  }

  private configureMiddleware(corsOrigin: string): void {
    // Стандартный набор middleware для JSON API с CORS и куками
    this.app.use(cors({ origin: corsOrigin, credentials: true }));
    this.app.use(express.json());
    this.app.use(cookieParser());
  }

  private configureRoutes(routes?: Router): void {
    const router: Router = routes || require('../routes');
    this.app.use('/api', router);
  }

  private configureSockets(attach?: (io: SocketIOServer, deps: { roomController: RoomController }) => void): void {
    const handler = attach || require('../socket/socketHandler');
    handler(this.io, { roomController: this.roomController });
  }

  /** Запускает HTTP-сервер и возвращает Promise, который резолвится после старта. */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        console.log(`Server running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  /** Аккуратно останавливает сервер. Полезно для тестов и gracefull shutdown. */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
}