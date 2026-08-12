"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/giris");
      router.refresh();
    }
  }

  return (
    <button className="setting-row" type="button" onClick={logout} disabled={loading} style={{width:"100%",cursor:"pointer"}}>
      <span>{loading ? "Çıkış yapılıyor..." : "Çıkış Yap"}</span><span>→</span>
    </button>
  );
}
