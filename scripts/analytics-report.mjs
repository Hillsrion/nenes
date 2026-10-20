const days = Number(process.argv[2] || 7);
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_ANALYTICS_READ_TOKEN;
if (!Number.isInteger(days) || days < 1 || days > 90) {
  console.error("Indiquer un nombre de jours entre 1 et 90.");
  process.exit(1);
}
if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !token) {
  console.error("Configurer CLOUDFLARE_ACCOUNT_ID et CLOUDFLARE_ANALYTICS_READ_TOKEN dans .env (jeton privé Account Analytics Read).");
  process.exit(1);
}
try {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/plain" },
    body: `SELECT blob4 AS event, blob5 AS target, SUM(_sample_interval * double1) AS total
      FROM nenes_interactions
      WHERE timestamp >= NOW() - INTERVAL '${days}' DAY
      AND blob1 = '1' AND blob2 = 'nenes.ismaelsebbane.com'
      GROUP BY event, target ORDER BY event, total DESC FORMAT JSON`,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Cloudflare a répondu HTTP ${response.status}. Vérifier les droits du jeton et la création du dataset après un premier événement.`);
  const result = await response.json();
  if (!Array.isArray(result.data)) throw new Error("Réponse Cloudflare inattendue.");
  console.log(`Interactions Nénés — ${days} derniers jours (comptages agrégés)`);
  console.table(result.data);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Lecture des statistiques impossible.");
  process.exitCode = 1;
}
