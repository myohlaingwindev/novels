import { requireUser } from "@/auth/current";
import { activePromotions, promotionRule } from "@/credits/promotions";
import { creditBalance, creditDescription, creditHistoryForUser, creditRules } from "@/credits/ledger";
import { getDatabase } from "@/db/client";

function when(createdAt: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(createdAt);
}

export default async function CreditsPage() {
  const user = await requireUser();
  const db = await getDatabase();
  const balance = await creditBalance(db, user.id);
  const rules = await creditRules(db);
  const history = await creditHistoryForUser(db, user.id);
  const promotions = await activePromotions(db);
  const claim = `${rules.dailyFree} free ${rules.dailyFree === 1 ? "credit" : "credits"}`;
  return (
    <main className="credits">
      <div>
        <h1>My credits</h1>
        <p className="credits-lede">Use credits to unlock chapters. Unlocked chapters stay yours.</p>
      </div>
      <div className="credit-grid">
        <section className="balance">
          <span>Your balance</span>
          <div>{balance}</div>
          <span>{balance === 1 ? "credit" : "credits"}</span>
        </section>
        <section className="panel">
          <h2>Daily free credit</h2>
          <p>
            Claim {claim} every day. It resets at {rules.resetLabel}.
          </p>
          <button type="button" disabled>
            Claim {claim}
          </button>
        </section>
        <section className="panel">
          <h2>Active promotions</h2>
          {promotions.length === 0 ? (
            <p>No promotions right now.</p>
          ) : (
            <ul className="term-list">
              {promotions.map((promotion) => (
                <li key={promotion.id}>
                  <span>
                    <b>{promotion.name}</b>
                    <small className="hint">{promotionRule(promotion)}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="panel history">
        <h2>Credit history</h2>
        <div className="user-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Amount</th>
                <th scope="col">Balance</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4}>No credit history yet.</td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id}>
                    <td>{when(row.createdAt)}</td>
                    <td>{creditDescription(row.kind, row.note)}</td>
                    <td className={row.amount < 0 ? "minus" : "plus"}>{row.amount > 0 ? `+${row.amount}` : row.amount}</td>
                    <td>{row.balanceAfter}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
