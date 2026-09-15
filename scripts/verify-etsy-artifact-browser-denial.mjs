import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const apiUrl = process.env.KIAROS_LOCAL_SUPABASE_URL;
const publishableKey = process.env.KIAROS_LOCAL_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.KIAROS_LOCAL_SUPABASE_SERVICE_ROLE_KEY;

assert(apiUrl, "KIAROS_LOCAL_SUPABASE_URL is required");
assert(publishableKey, "KIAROS_LOCAL_SUPABASE_PUBLISHABLE_KEY is required");
assert(serviceRoleKey, "KIAROS_LOCAL_SUPABASE_SERVICE_ROLE_KEY is required");

const parsedApiUrl = new URL(apiUrl);
assert(
  parsedApiUrl.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsedApiUrl.hostname),
  "Refusing to test a non-local Supabase target",
);

let assertions = 0;
const ok = (condition, message) => {
  assert(condition, message);
  assertions += 1;
};

async function createFixtureUser(label) {
  const response = await fetch(`${apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: `artifact-${label}-${randomUUID()}@example.test`,
      password: `Fixture-${randomUUID()}-9!`,
    }),
  });

  const body = await response.json();
  ok(response.ok, `fictional browser user ${label} signs up locally`);
  ok(typeof body.access_token === "string" && body.access_token.length > 0, `browser user ${label} receives a token`);
  return body.access_token;
}

async function expectDenied(response, message) {
  ok(!response.ok, message);
  ok([400, 401, 403, 404].includes(response.status), `${message} with a denial status`);
}

const objectKey = `artifact-files/${randomUUID()}.pdf`;
const objectUrl = `${apiUrl}/storage/v1/object/etsy-artifacts-private/${objectKey}`;
const fixturePdf = Buffer.from("%PDF-1.4\n% Fictional local privacy fixture\n%%EOF\n", "utf8");

const serviceUpload = await fetch(objectUrl, {
  method: "POST",
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/pdf",
    "x-upsert": "false",
  },
  body: fixturePdf,
});
ok(serviceUpload.ok, "service role can create a private PDF fixture");

try {
  const anonymousRead = await fetch(objectUrl);
  await expectDenied(anonymousRead, "anonymous browser cannot read the private artifact file");

  for (const label of ["a", "b"]) {
    const accessToken = await createFixtureUser(label);
    const browserHeaders = {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    };

    const tableRead = await fetch(`${apiUrl}/rest/v1/artifact_orders?select=id`, {
      headers: browserHeaders,
    });
    await expectDenied(tableRead, `browser user ${label} cannot read artifact orders`);

    const storageRead = await fetch(objectUrl, { headers: browserHeaders });
    await expectDenied(storageRead, `browser user ${label} cannot read the private artifact file`);

    const storageWrite = await fetch(`${apiUrl}/storage/v1/object/etsy-artifacts-private/artifact-files/${randomUUID()}.pdf`, {
      method: "POST",
      headers: {
        ...browserHeaders,
        "Content-Type": "application/pdf",
      },
      body: fixturePdf,
    });
    await expectDenied(storageWrite, `browser user ${label} cannot write a private artifact file`);
  }
} finally {
  const serviceDelete = await fetch(objectUrl, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  ok(serviceDelete.ok, "service role removes the temporary private PDF fixture");
}

console.log(`ETSY-03 browser/storage denial verification passed: ${assertions} assertions.`);
