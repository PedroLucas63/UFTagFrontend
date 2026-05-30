type AuthListener = (isAuthenticated: boolean) => void;

let isAuthenticated = false;
let listeners: AuthListener[] = [];

export function subscribeAuthState(listener: AuthListener) {
   listeners = [...listeners, listener];
   return () => {
      listeners = listeners.filter((item) => item !== listener);
   };
}

export function setAuthState(nextState: boolean) {
   isAuthenticated = nextState;
   listeners.forEach((listener) => listener(nextState));
}

export function getAuthState() {
   return isAuthenticated;
}
