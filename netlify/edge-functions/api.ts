import { handle } from "hono/netlify";
import app from "../../src/index.js";

export const onRequest = handle(app);