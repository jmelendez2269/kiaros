import assert from "node:assert/strict";
import { randomBytes, randomInt, randomUUID } from "node:crypto";

import { createClerkClient } from "@clerk/backend";

const ACKNOWLEDGEMENT = "temporary-fictional-users-approved";
const command = process.argv[2];
const secretKey = process.env.CLERK_SECRET_KEY;

assert.equal(
  process.env.KIAROS_CLERK_TEST_MUTATION_ACK,
  ACKNOWLEDGEMENT,
  "Explicit temporary-user acknowledgement is required",
);
assert(secretKey?.startsWith("sk_test_"), "Refusing to mutate a non-test Clerk instance");

const clerk = createClerkClient({ secretKey });

function makeFixture(label, phoneSuffix) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  return {
    email: `kiaros-artifact-${label}-${suffix}+clerk_test@example.com`,
    externalId: `kiaros-etsy03-${label}-${suffix}`,
    firstName: `Artifact ${label[0].toUpperCase()}${label.slice(1)}`,
    lastName: "Fixture Delete Me",
    password: `Kiaros-${randomBytes(18).toString("base64url")}-A9!`,
    phoneNumber: `+120255501${String(phoneSuffix).padStart(2, "0")}`,
  };
}

async function createFixtureUsers(labels) {
  const createdIds = [];

  try {
    const output = {};
    const phoneStart = randomInt(0, 99);
    for (const [index, label] of labels.entries()) {
      const fixture = makeFixture(label, (phoneStart + index) % 100);
      const user = await clerk.users.createUser({
        emailAddress: [fixture.email],
        externalId: fixture.externalId,
        firstName: fixture.firstName,
        lastName: fixture.lastName,
        password: fixture.password,
        phoneNumber: [fixture.phoneNumber],
        publicMetadata: { isAdmin: true },
      });
      createdIds.push(user.id);
      output[label] = {
        id: user.id,
        email: fixture.email,
        password: fixture.password,
      };
    }

    console.log(
      `CLERK_TEST_USERS_HEX=${Buffer.from(JSON.stringify(output), "utf8").toString("hex")}`,
    );
  } catch (error) {
    await Promise.allSettled(createdIds.map((userId) => clerk.users.deleteUser(userId)));
    throw error;
  }
}

async function deleteOrphanedVerifierUsers() {
  const users = await clerk.users.getUserList({ limit: 100, orderBy: "-created_at" });
  const matches = users.data.filter(
    (user) =>
      user.externalId?.startsWith("kiaros-etsy03-verifier-") &&
      user.lastName === "Fixture Delete Me" &&
      user.publicMetadata?.isAdmin === true,
  );
  const results = await Promise.allSettled(matches.map((user) => clerk.users.deleteUser(user.id)));
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((result) => result.reason),
      `Failed to delete ${failures.length} orphaned verifier fixture(s)`,
    );
  }
  console.log(`Orphaned Clerk verifier fixtures deleted: ${matches.length}`);
}

async function deleteFixtureUsers() {
  const userIds = process.argv.slice(3);
  assert(
    userIds.length >= 1 && userIds.length <= 2,
    "One or two temporary Clerk user IDs are required",
  );
  for (const userId of userIds) {
    assert.match(userId, /^user_[A-Za-z0-9]+$/, "Invalid Clerk user ID");
  }

  const results = await Promise.allSettled(userIds.map((userId) => clerk.users.deleteUser(userId)));
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((result) => result.reason),
      `Failed to delete ${failures.length} temporary Clerk user(s)`,
    );
  }

  const verification = await Promise.all(
    userIds.map(async (userId) => {
      try {
        await clerk.users.getUser(userId);
        return false;
      } catch (error) {
        return error?.status === 404;
      }
    }),
  );
  assert(verification.every(Boolean), "Temporary Clerk user deletion could not be verified");

  console.log(`Temporary Clerk fixture users deleted and absence verified: ${userIds.length}`);
}

if (command === "create") {
  await createFixtureUsers(["operator", "reviewer"]);
} else if (command === "create-one") {
  await createFixtureUsers(["verifier"]);
} else if (command === "delete") {
  await deleteFixtureUsers();
} else if (command === "delete-orphaned-verifiers") {
  await deleteOrphanedVerifierUsers();
} else {
  throw new Error(
    "Usage: node scripts/verify-etsy-artifact-clerk-users.mjs <create|create-one|delete|delete-orphaned-verifiers> [user IDs]",
  );
}
