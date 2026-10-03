import {
  normalizeExternalReceipt,
  validateExternalReceipt
} from "../models/receipt-inbox.js";

const PROTECTED =
  new Set(["0014121"]);

function client() {
  const sb =
    window.ORYVEX_SUPABASE?.requireClient?.();

  if (!sb) {
    throw new Error(
      "SUPABASE_CLIENT_REQUIRED"
    );
  }

  return sb;
}

async function requireWrite() {
  return window.ORYVEX_AUTH
    ?.requireWriteSession?.();
}

export async function listServerInbox(
  projectId
) {
  const sb = client();

  const { data, error } = await sb
    .from("santiye_concrete_receipt_inbox")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", {
      ascending: false
    });

  if (error) throw error;

  return data ?? [];
}

export async function createServerInbox(
  input
) {
  const session = await requireWrite();

  if (!session?.user?.id) {
    throw new Error("AUTH_REQUIRED");
  }

  const receipt =
    normalizeExternalReceipt(input);

  const validation =
    validateExternalReceipt(receipt);

  if (!validation.valid) {
    throw new Error(
      validation.errors.join(",")
    );
  }

  if (PROTECTED.has(receipt.slipNo)) {
    throw new Error(
      "PROTECTED_SLIP_0014121"
    );
  }

  const sb = client();

  const { data: existing, error: checkError } =
    await sb
      .from("santiye_concrete_slips")
      .select("id,slip_no")
      .eq("project_id", receipt.projectId)
      .eq("slip_no", receipt.slipNo)
      .limit(1);

  if (checkError) throw checkError;

  if (existing?.length) {
    throw new Error(
      "DUPLICATE_CONCRETE_SLIP"
    );
  }

  const row = {
    company_id: receipt.companyId,
    project_id: receipt.projectId,

    source: receipt.source,

    slip_no: receipt.slipNo,
    slip_date: receipt.date,
    concrete_class: receipt.concreteClass,
    quantity_m3: receipt.quantityM3,

    supplier_name: receipt.supplier || null,
    vehicle_plate: receipt.vehiclePlate || null,
    driver_name: receipt.driver || null,
    customer_name: receipt.customer || null,

    printed_site_name:
      receipt.printedSite || null,

    actual_site_name:
      receipt.actualSite || null,

    raw_note:
      receipt.rawNote || null,

    scope_type: "UNCLASSIFIED",
    status: "PENDING_REVIEW",

    created_by: session.user.id
  };

  const { data, error } = await sb
    .from("santiye_concrete_receipt_inbox")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function reviewServerInbox(
  id,
  {
    classification,
    workItem,
    workGroup = null,
    costCenter = null,
    explicitApproval = false
  }
) {
  if (!explicitApproval) {
    throw new Error(
      "EXPLICIT_USER_APPROVAL_REQUIRED"
    );
  }

  await requireWrite();

  const sb = client();

  const { data, error } = await sb.rpc(
    "santiye_review_concrete_receipt_t3",
    {
      p_inbox_id: id,
      p_scope_type: classification,
      p_work_item: workItem,
      p_work_group: workGroup,
      p_cost_center: costCenter
    }
  );

  if (error) throw error;

  return data;
}

export async function saveApprovedServerInbox(
  id,
  explicitApproval = false
) {
  if (!explicitApproval) {
    throw new Error(
      "EXPLICIT_FINAL_SAVE_REQUIRED"
    );
  }

  await requireWrite();

  const sb = client();

  const { data, error } = await sb.rpc(
    "santiye_save_concrete_receipt_t3",
    {
      p_inbox_id: id
    }
  );

  if (error) throw error;

  return data;
}
