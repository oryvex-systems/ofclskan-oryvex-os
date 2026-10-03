import {
  normalizeSession,
  requireAuthenticatedSession,
  requireFinancialActionPermission
} from "../models/auth-model.js";

export class AuthSessionAdapter {
  constructor(provider = null) {
    this.provider = provider;
  }

  register(provider) {
    this.provider =
      provider ?? null;
  }

  async session() {
    if (
      !this.provider ||
      typeof this.provider.session !== "function"
    ) {
      return normalizeSession(null);
    }

    const raw =
      await this.provider.session();

    return normalizeSession(raw);
  }

  async requireWriteSession() {
    const current =
      await this.session();

    return requireAuthenticatedSession(
      current
    );
  }

  async requireFinancialAction(
    explicitApproval
  ) {
    const current =
      await this.session();

    return requireFinancialActionPermission({
      session: current,
      explicitApproval
    });
  }
}
