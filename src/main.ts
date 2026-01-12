import "reflect-metadata";
import { registerContainer } from "@shared/container";
import { startServer } from "@bootstrap/server";

registerContainer();
startServer();
