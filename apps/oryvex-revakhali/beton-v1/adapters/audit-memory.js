export function createMemoryAuditAdapter() {
  const records = [];

  return {
    async write(record) {
      records.push(
        structuredClone
          ? structuredClone(record)
          : JSON.parse(JSON.stringify(record))
      );

      return record;
    },

    list() {
      return records.map(
        record =>
          JSON.parse(JSON.stringify(record))
      );
    }
  };
}
