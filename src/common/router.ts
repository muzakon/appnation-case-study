import Elysia from "elysia";
import { logger } from "../core/logger";
import {
  authenticationMiddleware,
  clientTypeDetectionMiddleware,
  firebaseAppMiddleware,
} from "../middlewares";

export const createRouter = (prefix: string) =>
  new Elysia({ prefix })
    .derive(firebaseAppMiddleware())
    .derive(authenticationMiddleware())
    .derive(clientTypeDetectionMiddleware())
    .onAfterResponse(({ request, set, path }) => {
      logger.info(`[${request.method}] ${path} - Status: ${set.status}`);
    });
