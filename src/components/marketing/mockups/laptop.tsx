import Image from "next/image";

/**
 * A MacBook-style frame around a real screenshot. The image keeps its own 16:10 ratio (2880x1800),
 * so it is never stretched; the lid, notch and base are drawn around it.
 */
export function LaptopMockup({ src, darkSrc, alt }: { src: string; darkSrc: string; alt: string }) {
  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <div className="relative rounded-t-[1.1rem] bg-charcoal p-[2.2%] pb-[2.2%] ring-1 ring-foreground/20 sm:rounded-t-[1.6rem]">
        <div className="relative overflow-hidden rounded-[0.35rem] bg-card sm:rounded-lg">
          <Image src={src} alt={alt} width={2880} height={1800} sizes="(min-width: 1088px) 1000px, 94vw" priority className="block h-auto w-full dark:hidden" />
          <Image src={darkSrc} alt={alt} width={2880} height={1800} sizes="(min-width: 1088px) 1000px, 94vw" className="hidden h-auto w-full dark:block" />
          <span aria-hidden className="absolute top-0 left-1/2 h-[2.2%] min-h-1 w-[9%] -translate-x-1/2 rounded-b-[0.3rem] bg-charcoal" />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="relative -ml-[5%] h-2.5 w-[110%] rounded-b-[1.4rem] bg-gradient-to-b from-border-strong to-border shadow-[0_26px_40px_-20px_#10101459] sm:h-4"
      >
        <span className="absolute top-0 left-1/2 h-1 w-20 -translate-x-1/2 rounded-b-md bg-foreground/20 sm:h-1.5 sm:w-32" />
      </div>
    </div>
  );
}
