/**
 * Global TypeScript ambient type declarations.
 * Enables direct importing of DotLottie binary animation assets (.lottie).
 */
declare module "*.lottie" {
  const src: string;
  export default src;
}
