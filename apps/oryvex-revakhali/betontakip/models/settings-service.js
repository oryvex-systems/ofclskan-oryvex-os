import {
  normalizeSettings
} from "./settings-model.js";

import {
  requireAuthenticatedSession
} from "./auth-model.js";

import {
  createAuditRecord,
  AUDIT_RESULT
} from "./audit-model.js";

export async function updateSettings({
  storage,
  audit,
  session,
  nextSettings
} = {}) {
  if (!storage?.write) {
    throw new Error(
      "SETTINGS_STORAGE_REQUIRED"
    );
  }

  const authenticated =
    requireAuthenticatedSession(session);

  const normalized =
    normalizeSettings(nextSettings);

  const saved =
    await storage.write(normalized);

  if (audit?.append) {
    await audit.append(
      createAuditRecord({
        actor: authenticated.user,
        action:
          "BETON_SETTINGS_UPDATED",
        result:
          AUDIT_RESULT.SUCCESS,
        entityType:
          "BETON_SETTINGS",
        entityId:
          saved.projectCode,
        metadata: {
          automaticCariTransfer:
            false,
          manualFinancialApproval:
            true
        }
      })
    );
  }

  return saved;
}
