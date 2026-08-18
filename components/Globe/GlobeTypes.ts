export type CityPoint = { name: string; lat: number; lon: number };

export type GlobeController = {
  setSize(w: number, h: number): void;
  setDirection(outbound: boolean): void;
  flyOnce(): void;
  pause(): void;
  resume(): void;
  dispose(): void;
};
