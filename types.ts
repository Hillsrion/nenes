export type Card = {
  title: string;
  description: string;
  image: string;
};

declare global {
  interface Window {
    _paq: Array<Array<string | number>>;
  }
}
