import pino from "pino";
import { pinoConfig } from "./pino.config";

export const logger = pino(pinoConfig);

export type Logger = typeof logger;
