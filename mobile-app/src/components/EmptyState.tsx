export default function EmptyState({ text }: { text: string }) {
  return <div className="empty-state"><span>◇</span><p>{text}</p></div>
}
