export class CariAdapter {
  constructor({
    transport,
    audit
  } = {}) {
    this.transport = transport;
    this.audit = audit;
  }

  async transfer(request) {
    if (!request) {
      throw new Error("TRANSFER_REQUEST_REQUIRED");
    }

    if (request.automaticTransfer !== false) {
      throw new Error("AUTOMATIC_CARI_FORBIDDEN");
    }

    if (
      request.approval?.explicitUserApproval !== true
    ) {
      throw new Error("EXPLICIT_USER_APPROVAL_REQUIRED");
    }

    if (
      !this.transport ||
      typeof this.transport.transfer !== "function"
    ) {
      throw new Error("CARI_TRANSPORT_NOT_CONFIGURED");
    }

    const startedAt = new Date().toISOString();

    try {
      const result =
        await this.transport.transfer(request);

      const auditRecord = {
        event: "CONCRETE_CARI_TRANSFER",
        slipNo: request.slipNo,
        result: "SUCCESS",
        startedAt,
        finishedAt: new Date().toISOString(),
        externalReference:
          result?.externalReference ?? null
      };

      if (this.audit?.write) {
        await this.audit.write(auditRecord);
      }

      return {
        ok: true,
        status: "CARIYE_AKTARILDI",
        externalReference:
          result?.externalReference ?? null,
        audit: auditRecord
      };
    } catch (error) {
      const auditRecord = {
        event: "CONCRETE_CARI_TRANSFER",
        slipNo: request.slipNo,
        result: "FAILED",
        errorCode:
          error?.code ??
          error?.message ??
          "UNKNOWN_ERROR",
        startedAt,
        finishedAt: new Date().toISOString()
      };

      if (this.audit?.write) {
        await this.audit.write(auditRecord);
      }

      return {
        ok: false,
        status: "AKTARIM_HATASI",
        error:
          error?.message ??
          "UNKNOWN_ERROR",
        audit: auditRecord
      };
    }
  }
}
