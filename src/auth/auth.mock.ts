import { randomUUID } from "node:crypto";
import Elysia from "elysia";
import { AuthUtils } from "../auth/auth-utils";
import { UnauthorizedError, ValidationError } from "../common/errors";
import type { DecodedToken } from "../common/interfaces";

// --- Constants & Defaults ---
const DEFAULT_MOCK_USER = {
  name: "Mock User",
  picture: "https://i.pravatar.cc/200",
  sub: "mock-uid-123",
  email: "mock@pixelic.ai",
  provider: "google.com",
};

/**
 * Parses a "mock:key=value:key2=value2" string into a dictionary.
 */
function parseMockToken(token: string): Record<string, string> {
  const rawData = token.startsWith("mock:") ? token.slice(5) : "";
  if (!rawData) return {};

  return rawData.split(":").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key && value) {
        acc[key.trim()] = decodeURIComponent(value.trim());
      }
      return acc;
    },
    {} as Record<string, string>,
  );
}

/**
 * Mock "verifyFirebaseToken" replacement
 *
 * Supports:
 * - Bearer mock
 * - Bearer mock:email=test@pixelic.ai
 * - Bearer mock:provider=github.com:email=test@pixelic.ai:sub=123:db=tenant_1
 */
export async function verifyMockFirebaseToken(token: string): Promise<DecodedToken> {
  if (token.startsWith("mock:")) {
    const params = parseMockToken(token);

    // Merge defaults with parsed params
    const config = {
      id: params.id ?? randomUUID(),
      name: params.name ?? DEFAULT_MOCK_USER.name,
      picture: params.picture ?? DEFAULT_MOCK_USER.picture,
      sub: params.sub ?? DEFAULT_MOCK_USER.sub,
      email: params.email ?? DEFAULT_MOCK_USER.email,
      provider: params.provider ?? DEFAULT_MOCK_USER.provider,
      emailVerified: params.verified ? params.verified === "true" : true,
    };

    if (!config.email) {
      throw new ValidationError("Mock token requires an email address.");
    }

    return buildDecodedToken(config);
  }

  throw new UnauthorizedError("Invalid mock token format. Must start with 'mock:'");
}

/**
 * Helper to construct the FirebaseDecodedToken object
 */
function buildDecodedToken(config: {
  id: string;
  name: string;
  picture: string;
  sub: string;
  email: string;
  provider: string;
  emailVerified?: boolean;
}): DecodedToken {
  return {
    id: config.id,
    name: config.name,
    picture: config.picture,
    sub: config.sub,
    email: config.email,
    email_verified: config.emailVerified ?? true,
    firebase: {
      identities: { [config.provider]: [config.email] },
      sign_in_provider: config.provider,
    },
    mappedProvider: AuthUtils.mapFirebaseProvider(config.provider),
  };
}

export const mockAuthDerive =
  () =>
  async ({ headers }: { headers: Record<string, string | undefined> }) => {
    const token = AuthUtils.extractTokenFromHeader(headers.authorization);
    if (!token) {
      throw new UnauthorizedError("Authentication required");
    }

    try {
      const decodedToken = await verifyMockFirebaseToken(token);
      return {
        decodedToken,
      };
    } catch (_error) {
      throw new UnauthorizedError("Authentication required");
    }
  };

export const createMockAuthController = (prefix: string) =>
  new Elysia({ prefix }).derive(mockAuthDerive());
