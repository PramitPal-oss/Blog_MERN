export function SafeText({ children, className = "prewrap" }: { children: string; className?: string }) { return <div className={className}>{children}</div>; }
