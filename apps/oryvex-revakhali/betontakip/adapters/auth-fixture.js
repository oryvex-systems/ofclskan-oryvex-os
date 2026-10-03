export function createGuestAuthProvider() {
  return {
    async session() {
      return null;
    }
  };
}

export function createAuthenticatedFixtureProvider({
  id = "M9-TEST-USER",
  email = "m9-test@oryvex.local",
  displayName = "M9 Test User"
} = {}) {
  return {
    async session() {
      return {
        user: {
          id,
          email,
          displayName
        }
      };
    }
  };
}
