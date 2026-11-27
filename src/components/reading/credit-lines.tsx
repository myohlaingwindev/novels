import { creditText } from "@/services/reading/credit";

export function CreditLines({ originAuthor, penName }: { originAuthor: string; penName: string }) {
  const credit = creditText(originAuthor, penName);
  return (
    <div className="novel-credit">
      <span>{credit.writtenBy}</span>
      <span>{credit.publishedBy}</span>
    </div>
  );
}
