export const SESSION_STATE = Object.freeze({
  AUTHENTICATED: "AUTHENTICATED",
  GUEST: "GUEST"
});

export function normalizeSession(session) {
  if (
    session &&
    session.user &&
    session.user.id
  ) {
    return {
      state: SESSION_STATE.AUTHENTICATED,
      user: {
        id: String(session.user.id),
        email:
          session.user.email
            ? String(session.user.email)
            : null,
        displayName:
          session.user.displayName
            ? String(session.user.displayName)
            : null
      }
    };
  }

  return {
    state: SESSION_STATE.GUEST,
    user: null
  };
}

export function requireAuthenticatedSession(session) {
  const normalized =
    normalizeSession(session);

  if (
    normalized.state !==
    SESSION_STATE.AUTHENTICATED
  ) {
    throw new Error(
      "AUTHENTICATED_SESSION_REQUIRED"
    );
  }

  return normalized;
}

export function requireFinancialActionPermission({
  session,
  explicitApproval
} = {}) {
  const authenticated =
    requireAuthenticatedSession(session);

  if (explicitApproval !== true) {
    throw new Error(
      "EXPLICIT_USER_APPROVAL_REQUIRED"
    );
  }

  return authenticated;
}
