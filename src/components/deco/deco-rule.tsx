/** Line - diamond - line divider (.deco-rule in globals.css). Decoration only. */
export function DecoRule({ className = "" }: { className?: string }) {
  return (
    <div className={`deco-rule ${className}`} aria-hidden="true">
      <i />
      <b />
      <i />
    </div>
  );
}
