export function displayAuthor(person: { name: string; email: string }): string {
  const name = person.name.trim();
  if (name) return name;
  const local = person.email.split("@")[0]?.trim() ?? "";
  return local || "Author";
}

export function authorInitials(name: string): string {
  const parts = name.split(/\s+/).filter((part) => part.length > 0);
  return (parts.length > 0 ? parts : ["A"]).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}
