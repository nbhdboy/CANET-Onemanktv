export {};

declare global {
  interface Window {
    TPDirect?: {
      setupSDK: (appId: number, appKey: string, env: string) => void;
      redirect?: (url: string) => void;
      card: {
        setup: (opts: Record<string, unknown>) => void;
        onUpdate: (cb: (update: { canGetPrime: boolean; hasError?: boolean }) => void) => void;
        getTappayFieldsStatus?: () => { canGetPrime: boolean };
        getPrime: (cb: (result: {
          status: number;
          card?: { prime: string };
          msg?: string;
        }) => void) => void;
      };
      linePay?: {
        getPrime: (cb: (result: { status: number; prime?: string; msg?: string }) => void) => void;
      };
    };
  }
}
