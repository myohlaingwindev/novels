export function chooseGrab(
  current: { title: string; body: string; originAuthor: string },
  extracted: { title: string; body: string; originAuthor: string },
): { title: string | null; body: string | null; originAuthor: string | null } {
  const originAuthor = extracted.originAuthor.trim();
  return {
    title: current.title.trim() === "" ? extracted.title : null,
    body: current.body.trim() === "" ? extracted.body : null,
    originAuthor: current.originAuthor.trim() === "" && originAuthor !== "" ? originAuthor : null,
  };
}
