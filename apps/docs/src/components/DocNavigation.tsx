"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./DocNavigation.module.css";

export function DocNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Getting Started" },
    { href: "/guides", label: "Guides" },
    { href: "/api", label: "API Reference" },
    { href: "/plugins", label: "Plugin Development" },
    { href: "/integrations", label: "Integrations" },
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.header}>
        <Link href="/" className={styles.logo}>
          AURA Docs
        </Link>
      </div>
      <ul className={styles.navList}>
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`${styles.navLink} ${
                pathname === item.href ? styles.active : ""
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
