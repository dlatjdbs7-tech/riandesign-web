import { Client } from "pg";

const [username, newPassword] = process.argv.slice(2);
if (!username || !newPassword) {
  console.error("사용법: node scripts/reset-password.mjs <아이디> <새비밀번호>");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(`create extension if not exists pgcrypto`);

const { rowCount } = await client.query(
  `update auth.users
   set encrypted_password = crypt($2, gen_salt('bf'))
   where id = (select id from profiles where username = $1)`,
  [username, newPassword]
);

console.log(`업데이트된 계정 수: ${rowCount}`);
await client.end();
