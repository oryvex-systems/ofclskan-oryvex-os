function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

export function createAppendOnlyAuditAdapter() {
  const records = [];

  return Object.freeze({
    async append(record) {
      if (!record) {
        throw new Error(
          "AUDIT_RECORD_REQUIRED"
        );
      }

      const stored =
        Object.freeze(
          clone(record)
        );

      records.push(stored);

      return clone(stored);
    },

    async write(record) {
      return this.append(record);
    },

    list() {
      return records.map(clone);
    },

    count() {
      return records.length;
    }
  });
}
