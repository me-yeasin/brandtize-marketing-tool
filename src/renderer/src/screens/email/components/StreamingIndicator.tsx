function StreamingIndicator(): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 text-text-muted text-sm py-2">
      <span className="animate-pulse">●</span>
      <span className="animate-pulse delay-75">●</span>
      <span className="animate-pulse delay-150">●</span>
    </div>
  )
}

export { StreamingIndicator }
