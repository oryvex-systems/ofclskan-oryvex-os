import {
  normalizeReportRow
} from "./report-model.js";

export const EXPORT_COLUMNS = Object.freeze([
  ["date", "Tarih"],
  ["slipNo", "Fiş No"],
  ["supplierName", "Tedarikçi"],
  ["concreteClass", "Beton Sınıfı"],
  ["quantityM3", "Miktar m³"],
  ["classification", "Sınıflandırma"],
  ["workGroup", "İş Grubu"],
  ["workItem", "İmalat"],
  ["costCenter", "Maliyet Merkezi"],
  ["unitPrice", "Birim Fiyat"],
  ["amount", "Toplam Tutar"],
  ["currency", "Para Birimi"],
  ["cariStatus", "Cari Durumu"]
]);

function csvCell(value) {
  const raw =
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${raw.replaceAll('"', '""')}"`;
}

export function reportToCsv(rows = []) {
  const normalized =
    rows.map(normalizeReportRow);

  const header =
    EXPORT_COLUMNS
      .map(([, label]) => csvCell(label))
      .join(",");

  const body =
    normalized.map(row =>
      EXPORT_COLUMNS
        .map(([key]) => csvCell(row[key]))
        .join(",")
    );

  return [
    "\uFEFF" + header,
    ...body
  ].join("\r\n");
}

export function reportToExcelHtml(rows = []) {
  const normalized =
    rows.map(normalizeReportRow);

  const head =
    EXPORT_COLUMNS
      .map(([, label]) => `<th>${escapeHtml(label)}</th>`)
      .join("");

  const body =
    normalized
      .map(row => {
        const cells =
          EXPORT_COLUMNS
            .map(([key]) =>
              `<td>${escapeHtml(row[key] ?? "")}</td>`
            )
            .join("");

        return `<tr>${cells}</tr>`;
      })
      .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
</head>
<body>
<table border="1">
<thead><tr>${head}</tr></thead>
<tbody>${body}</tbody>
</table>
</body>
</html>`;
}

export function reportToPrintableHtml(
  rows = [],
  summary = {}
) {
  const normalized =
    rows.map(normalizeReportRow);

  const body =
    normalized
      .map(row => `
<tr>
<td>${escapeHtml(row.date)}</td>
<td>${escapeHtml(row.slipNo)}</td>
<td>${escapeHtml(row.supplierName)}</td>
<td>${escapeHtml(row.concreteClass)}</td>
<td>${escapeHtml(row.quantityM3)}</td>
<td>${escapeHtml(row.classification)}</td>
<td>${escapeHtml(row.workItem)}</td>
<td>${escapeHtml(row.costCenter)}</td>
<td>${escapeHtml(row.amount ?? "")}</td>
<td>${escapeHtml(row.cariStatus)}</td>
</tr>`)
      .join("");

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Beton Takip Raporu</title>
<style>
body{font-family:Arial,sans-serif;padding:24px;color:#111}
h1{margin:0 0 8px}
.summary{margin:16px 0;padding:12px;border:1px solid #bbb}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #bbb;padding:6px;text-align:left}
th{background:#eee}
@media print{button{display:none}}
</style>
</head>
<body>
<h1>ORYVEX Beton Takip Raporu</h1>
<div class="summary">
Fiş: ${escapeHtml(summary.slipCount ?? normalized.length)}
&nbsp; | &nbsp;
Toplam: ${escapeHtml(summary.totalQuantityM3 ?? "")} m³
&nbsp; | &nbsp;
Proje: ${escapeHtml(summary.projectQuantityM3 ?? "")} m³
&nbsp; | &nbsp;
Proje Dışı: ${escapeHtml(summary.nonProjectQuantityM3 ?? "")} m³
&nbsp; | &nbsp;
Sınıflandırılmamış: ${escapeHtml(summary.unclassifiedQuantityM3 ?? "")} m³
</div>
<table>
<thead>
<tr>
<th>Tarih</th>
<th>Fiş No</th>
<th>Tedarikçi</th>
<th>Sınıf</th>
<th>m³</th>
<th>Sınıflandırma</th>
<th>İmalat</th>
<th>Maliyet Merkezi</th>
<th>Tutar</th>
<th>Cari</th>
</tr>
</thead>
<tbody>${body}</tbody>
</table>
</body>
</html>`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
