import Link from "next/link";

const items = [
  ["/panel", "⌂", "Ana Sayfa"],
  ["/sistemler", "▦", "Sistemler"],
  ["/ai", "✦", "AI"],
  ["/gorevler", "☑", "Görevler"],
  ["/profil", "○", "Profil"],
] as const;

export default function BottomNav({ active }: { active: string }) {
  return (
    <nav className="bottom-nav" aria-label="Ana menü">
      {items.map(([href, icon, label]) => (
        <Link className={active === href ? "active" : ""} href={href} key={href}>
          <strong>{icon}</strong>{label}
        </Link>
      ))}
    </nav>
  );
}
