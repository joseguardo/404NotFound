export function Integrations() {
  const logos = [
    { src: "/logos/granola.png", alt: "Granola" },
    { src: "/logos/notion.png", alt: "Notion" },
    { src: "/logos/linear.svg", alt: "Linear" },
  ];

  return (
    <section className="py-16 px-6 border-t border-border/50">
      <div className="max-w-4xl mx-auto text-center space-y-10">
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-primary">
            // Integrations
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-wide">
            Integrated with your favourite meeting notetakers
          </h2>
        </div>

        <div className="flex items-center justify-center gap-8 sm:gap-12 flex-wrap">
          {logos.map((logo) => (
            <div
              key={logo.alt}
              className="w-40 h-16 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
            >
              <img
                src={logo.src}
                alt={logo.alt}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ))}
        </div>

        <p className="text-muted-foreground text-base font-light max-w-2xl mx-auto">
          Automatically adapts to your workplace and generates tickets in{" "}
          <span className="text-foreground font-medium">Linear</span>
        </p>
      </div>
    </section>
  );
}
