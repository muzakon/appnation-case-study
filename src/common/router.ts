import Elysia from "elysia";
import {
  authenticationMiddleware,
  clientTypeDetectionMiddleware,
  firebaseAppCheckMiddleware,
  requestLoggerMiddleware,
} from "../middlewares";

export const createRouter = (prefix: string) =>
  new Elysia({ prefix })
    .use(firebaseAppCheckMiddleware)
    .use(authenticationMiddleware)
    .use(clientTypeDetectionMiddleware)
    .use(requestLoggerMiddleware);
