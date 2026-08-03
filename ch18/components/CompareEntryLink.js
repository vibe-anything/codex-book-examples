import Link from "next/link";
import styles from "./StockComparison.module.css";

export function CompareEntryLink() {
  return (
    <nav className={styles.entry} aria-label="종목 비교 바로가기">
      <Link className={styles.entryLink} href="/compare">
        두 종목 비교하기
      </Link>
    </nav>
  );
}
