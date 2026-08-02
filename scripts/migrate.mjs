import { readFileSync } from "node:fs";
import { Client } from "pg";

const filePath = process.argv[2];
if (!filePath) {
  console.error("사용법: node scripts/migrate.mjs <sql파일경로>");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL 환경변수가 없습니다 (.env.local 확인).");
  process.exit(1);
}

const sql = readFileSync(filePath, "utf-8");
const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query(sql);
  console.log(`완료: ${filePath} 적용됨`);
} catch (error) {
  console.error("마이그레이션 실패:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
