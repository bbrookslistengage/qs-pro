import * as dotenv from "dotenv";
import path from "path";

// Load .env from monorepo root (two directories up from packages/database)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
