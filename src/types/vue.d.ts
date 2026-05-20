import App from "~/App.vue";
import API from "~/utils/API";
import { Modals, Popups } from '@sergtyapkin/modals-popups';
import { WS } from '@sergtyapkin/reconnecting-websocket';

declare module 'vue' {
  interface ComponentCustomProperties {
    $app: App,
    $api: API,
    $isMobile: boolean,
    $ws: WS,
    $modals: typeof Modals,
    $popups: typeof Popups,
    $log: (...data: any[]) => void,
    $request: <APIFoo extends (...args: any) => any, Fallback>(
      context: { loading: boolean },
      apiRequest: APIFoo,
      args: Parameters<APIFoo>,
      errorText: string,
      callback?: (data: Awaited<ReturnType<APIFoo>>['data'], status: number) => any,
      toFallbackValue?: Fallback,
      errorCallbacks?: {[key: number]: () => any},
    ) => Promise<Awaited<ReturnType<APIFoo>>['data'] | Fallback>,
  }
}
