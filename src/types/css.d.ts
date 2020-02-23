declare module "*.css" {
  const styles: { readonly [key: string]: string };
  export = styles;
}
