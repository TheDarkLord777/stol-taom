require("dotenv").config();
const Redis = require("ioredis");

async function main() {
  const enabled =
    String(process.env.ENABLE_REDIS || "").toLowerCase() === "true" ||
    process.env.ENABLE_REDIS === "1";
  if (!enabled) {
    console.error(
      "Redis not enabled (ENABLE_REDIS not set). Cannot bump menu cache.",
    );
    process.exit(2);
  }

  const url = process.env.REDIS_URL;
  if (!url) {
    console.error("REDIS_URL not set.");
    process.exit(2);
  }

  const password = process.env.REDIS_PASSWORD || undefined;
  const client = password ? new Redis(url, { password }) : new Redis(url);

  client.on("error", (e) => console.error("redis error", e));
  client.on("ready", async () => {
    try {
      const newVer = await client.incr("menu:list:version");
      console.log("Bumped menu:list:version =>", newVer);
    } catch (err) {
      console.error("Failed bumping menu:list:version", err);
      process.exitCode = 1;
    } finally {
      try {
        await client.quit();
      } catch {}
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
