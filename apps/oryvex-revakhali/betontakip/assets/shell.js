(function () {
  "use strict";

  function nav(active) {
    const links = [
      ["dashboard", "index.html", "Dashboard"],
      ["beton", "beton.html", "Beton Fişleri"],
  ["fis", "fis-merkezi.html", "Fiş Merkezi"],
  ["cari", "cari-entegrasyonu.html", "Cari Entegrasyonu"],
      ["reports", "raporlar.html", "Raporlar"],
      ["settings", "ayarlar.html", "Ayarlar"],
      ["integrations", "entegrasyonlar.html", "Entegrasyonlar"]
    ];

    return links.map(([id, href, title]) => {
      const cls = id === active ? ' class="active"' : "";
      return `<a${cls} href="${href}">${title}</a>`;
    }).join("");
  }

  function mount(active) {
    const host = document.querySelector("[data-nav]");

    if (host) {
      host.innerHTML = nav(active);
    }
  }

  window.ORYVEX_SHELL = {
    mount
  };
})();
