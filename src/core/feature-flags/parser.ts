import type { FeatureFlagRecord, RawFlagValue } from "./types";

function parseScalar(value: string): RawFlagValue {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;

  const lowered = unquoted.toLowerCase();
  if (lowered === "true") {
    return true;
  }
  if (lowered === "false") {
    return false;
  }
  if (lowered === "null") {
    return null;
  }

  const asNumber = Number(unquoted);
  if (!Number.isNaN(asNumber) && unquoted !== "") {
    return asNumber;
  }

  return unquoted;
}

export function parseYamlFlags(contents: string): FeatureFlagRecord {
  const result: FeatureFlagRecord = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key) {
      continue;
    }

    let rawValue = trimmed.slice(separatorIndex + 1).trim();
    const commentIndex = rawValue.indexOf("#");
    if (commentIndex !== -1) {
      rawValue = rawValue.slice(0, commentIndex).trim();
    }

    result[key] = parseScalar(rawValue);
  }

  return result;
}
