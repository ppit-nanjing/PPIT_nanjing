/** Line - diamond - line divider (.deco-rule in globals.css). Decoration only. */
export function DecoRule({ className = "", align = "center" }: { className?: string; align?: "center" | "start" }) {
  return (
    <div className={`deco-rule ${align === "start" ? "justify-start" : "justify-center"} ${className}`} aria-hidden="true">
      <i />
      <b />
      <i />
    </div>
  );
}
