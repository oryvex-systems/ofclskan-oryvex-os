import {
  validateIntegrationEvent
} from "../models/integration-contract.js";

export class IntegrationBus {
  constructor() {
    this.consumers =
      new Map();

    this.processed =
      new Set();
  }

  register(name, consumer) {
    if (!name) {
      throw new Error(
        "CONSUMER_NAME_REQUIRED"
      );
    }

    if (
      !consumer ||
      typeof consumer.handle !== "function"
    ) {
      throw new Error(
        "CONSUMER_HANDLE_REQUIRED"
      );
    }

    this.consumers.set(
      name,
      consumer
    );
  }

  enabled(name) {
    return this.consumers.has(name);
  }

  list() {
    return [
      ...this.consumers.keys()
    ];
  }

  async publish(event) {
    validateIntegrationEvent(event);

    if (
      this.processed.has(
        event.idempotencyKey
      )
    ) {
      return {
        accepted: true,
        duplicate: true,
        delivered: []
      };
    }

    const delivered = [];

    for (
      const [name, consumer]
      of this.consumers.entries()
    ) {
      const result =
        await consumer.handle(event);

      delivered.push({
        consumer: name,
        result:
          result ?? null
      });
    }

    this.processed.add(
      event.idempotencyKey
    );

    return {
      accepted: true,
      duplicate: false,
      delivered
    };
  }
}
