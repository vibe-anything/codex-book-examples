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
            <th scope="col">종가</th>
            {showTurnover && <th scope="col">거래대금</th>}
            <th scope="col">등락률</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.code ?? row.name}-${index}`}>
              <td className="rank-number">{index + 1}</td>
              <th scope="row">{row.name}</th>
              <td>{formatPrice(row.price)}</td>
              {showTurnover && <td>{formatTurnover(row.turnover)}</td>}
              <td>
                <span className={`rate-badge ${changeTone(row.changePercent)}`}>
                  {formatSigned(row.changePercent, 2)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
