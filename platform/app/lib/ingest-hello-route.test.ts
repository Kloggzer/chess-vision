import { beforeEach, expect, test } from "vitest";
import { ingestToken } from "@/lib/ingest";
import { GET } from "@/app/api/ingest/hello/route";
import { tempDataRoot } from "@/lib/test-fixtures";

/**
 * Der Handschlag, mit dem das Handy das Subnetz absucht. Er muss zwei Dinge leisten: sich
 * eindeutig zu erkennen geben (ein Scanner schliesst 254 Adressen ueber die ANTWORT aus, nicht
 * ueber Zeitablauf) und "falscher Rechner" von "falscher Token" trennen. Sonst sucht der Nutzer
 * den Fehler an der falschen Stelle.
 */
beforeEach(async () => {
  await tempDataRoot("hello");
  delete process.env.CHESSLAB_INGEST_TOKEN;
});

const hello = async (auth?: string) =>
  (await GET(new Request("http://host/api/ingest/hello", {
    headers: auth ? { authorization: auth } : {},
  }))).json();

test("the handshake names itself, so a scanner can rule a host out by the answer", async () => {
  const body = await hello();

  expect(body.app).toBe("chesslab-platform");
  expect(body.ingest).toBe(1);
  expect(typeof body.chunk).toBe("number");
});

test("paired separates the wrong token from the wrong host", async () => {
  expect((await hello()).paired).toBe(false);
  expect((await hello("Bearer nonsense")).paired).toBe(false);
  expect((await hello(`Bearer ${await ingestToken()}`)).paired).toBe(true);
});

test("it says nothing secret — the token never rides in the answer", async () => {
  const token = await ingestToken();

  expect(JSON.stringify(await hello(`Bearer ${token}`))).not.toContain(token);
});
