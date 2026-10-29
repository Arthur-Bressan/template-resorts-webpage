export function GreenSparkles() {
  return (
    <div aria-hidden="true" className="green-sparkles">
      {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
    </div>
  );
}
