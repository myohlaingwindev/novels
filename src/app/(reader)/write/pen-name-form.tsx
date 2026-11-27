import { setPenNameAction } from "@/controllers/write";

export function PenNameForm({ name }: { name: string }) {
  return (
    <form action={setPenNameAction}>
      <section className="panel">
        <div className="field">
          <label htmlFor="pen-name">Pen name</label>
          <input id="pen-name" name="name" defaultValue={name} />
        </div>
        <div className="publish-actions">
          <button className="btn" type="submit">
            Save pen name
          </button>
        </div>
      </section>
    </form>
  );
}
