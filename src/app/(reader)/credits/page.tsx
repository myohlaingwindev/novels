export default function CreditsPage() {
  return (
    <main className="credits">
      <div>
        <h1>My credits</h1>
        <p className="credits-lede">Use credits to unlock chapters. Unlocked chapters stay yours.</p>
      </div>
      <div className="credit-grid">
        <section className="balance">
          <span>Your balance</span>
          <div>0</div>
          <span>credits</span>
        </section>
        <section className="panel">
          <h2>Daily free credit</h2>
          <p>Claim 1 free credit every day. It resets at midnight, Thailand time.</p>
          <button type="button" disabled>
            Claim 1 credit
          </button>
        </section>
        <section className="panel">
          <h2>Active promotions</h2>
          <p>No promotions right now.</p>
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
              <tr>
                <td colSpan={4}>No credit history yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
