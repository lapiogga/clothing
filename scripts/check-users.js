const SUPABASE_URL = "https://kxplyfuddngeveldijxh.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGx5ZnVkZG5nZXZlbGRpanhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI5NDE4MCwiZXhwIjoyMDg2ODcwMTgwfQ.0Q9TqZAFF7PAhCk8itMQqs_Az3LD8FBVORHs1VDIHqg";

async function main() {
  // Auth users 조회
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=50`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  const authData = await authRes.json();
  const authUsers = authData.users || [];
  authUsers.sort((a,b) => a.email.localeCompare(b.email));

  console.log("=== Auth users ===");
  authUsers.forEach(u => console.log(u.id, u.email));

  // public users 조회
  const pubRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,email,role,rank&order=email`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  const pubUsers = await pubRes.json();

  console.log("\n=== public.users ===");
  pubUsers.forEach(u => console.log(u.id, u.email, u.role));

  // Auth에는 있는데 public.users에 없는 사용자
  const pubIds = new Set(pubUsers.map(u => u.id));
  const missing = authUsers.filter(u => !pubIds.has(u.id));
  console.log("\n=== Auth에 있지만 public.users에 없는 사용자 ===");
  missing.forEach(u => console.log(u.id, u.email));
}

main().catch(console.error);
