import { Client } from "pg";

const username = process.argv[2];
if (!username) {
  console.error("사용법: node scripts/promote-owner.mjs <아이디>");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rowCount } = await client.query(
  `update profiles set role = 'owner', status = 'approved' where username = $1`,
  [username]
);
console.log(`업데이트된 계정 수: ${rowCount}`);
await client.end();
