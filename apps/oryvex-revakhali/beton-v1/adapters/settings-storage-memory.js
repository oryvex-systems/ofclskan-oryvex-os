import {
  normalizeSettings
} from "../models/settings-model.js";

export function createMemorySettingsStorage(initial = {}) {
  let current =
    normalizeSettings(initial);

  return {
    async read() {
      return JSON.parse(
        JSON.stringify(current)
      );
    },

    async write(nextSettings) {
      current =
        normalizeSettings(nextSettings);

      return JSON.parse(
        JSON.stringify(current)
      );
    }
  };
}
