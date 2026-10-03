function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

export function createReadOnlyConsumerFixture() {
  const received = [];

  return {
    async handle(event) {
      received.push(
        clone(event)
      );

      return {
        ok: true,
        mode: "READ_ONLY_FIXTURE"
      };
    },

    list() {
      return received.map(clone);
    }
  };
}
