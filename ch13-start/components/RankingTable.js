import { changeTone, formatPrice, formatSigned, formatTurnover } from "@/lib/market";

export function RankingTable({ title, badge, rows, showTurnover = false }) {
  return (
    <article className="ranking-card panel">
      <div className="ranking-title">
        <span className={`ranking-badge ${badge}`} aria-hidden="true" />
        <h3>{title}</h3>
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col">순위</th>
            <th scope="col">종목명</th>
            <th scope="col">현재가</th>
            {showTurnover && <th scope="col">거래대금</th>}
            <th scope="col">등락률</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.name}>
              <td className="rank-number">{index + 1}</td>
              <th scope="row">{row.name}</th>
              <td>{formatPrice(row.price)}</td>
              {showTurnover && <td>{formatTurnover(row.turnover)}</td>}
              <td className={`rate ${changeTone(row.changePercent)}`}>
                {formatSigned(row.changePercent, 2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
