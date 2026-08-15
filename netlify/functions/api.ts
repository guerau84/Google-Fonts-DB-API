import { handle } from "hono/netlify";
import app from "../../src/index.js";

export default handle(app);