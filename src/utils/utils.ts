import swAPI from '~/serviceWorker/swAPI';
import routes from '~/routes';

export function getRequestFoo<APIFoo extends (...args: any) => any, Fallback>(
  popupsError: (title: string, desc: string) => any,
) {
  return async (
    context: { loading: boolean },
    apiRequest: APIFoo,
    args: Parameters<APIFoo>,
    errorText: string,
    callback?: (data: Awaited<ReturnType<APIFoo>>['data'], status: number) => any,
    toFallbackValue?: Fallback,
    errorCallbacks?: {[key: number]: () => any},
  ) => {
    context.loading = true;
    try {
      const { status, ok, data } = await apiRequest(...<any[]>args);
      context.loading = false;
      if (!ok) {
        const errCallback = errorCallbacks?.[status];
        if (errCallback) {
          errCallback();
          return toFallbackValue;
        }
        if (toFallbackValue) {
          return toFallbackValue;
        }
        popupsError(`Ошибка ${status}`, errorText);
        throw new Error(`Ошибка ${status} при запросе на API. ${errorText}`);
      }
      callback?.(data, status);
      return data;
    } catch (err) {
      context.loading = false;
      console.error('Error while executing $request:', err);
    }
  }
}

export function getCookie(name: string) {
  const matches = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'),
  );
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

export function setCookie(
  name: string,
  value: string,
  options: { path?: string; expires?: Date | string; 'max-age'?: number; [key: string]: any } = {},
) {
  options = {
    path: '/',
    // при необходимости добавьте другие значения по умолчанию
    ...options,
  };

  if (options.expires instanceof Date) {
    options.expires = options.expires.toUTCString();
  }

  let updatedCookie = encodeURIComponent(name) + '=' + encodeURIComponent(value);

  for (const optionKey in options) {
    updatedCookie += '; ' + optionKey;
    const optionValue = options[optionKey as keyof typeof options];
    if (optionValue !== true) {
      updatedCookie += '=' + optionValue;
    }
  }

  document.cookie = updatedCookie;
}

export function deleteCookie(name: string) {
  setCookie(name, '', {
    'max-age': -1,
  });
}

export function detectBrowser() {
  let result = 'Other';
  if (navigator.userAgent.indexOf('YaBrowser') !== -1) {
    result = 'Yandex Browser';
  } else if (navigator.userAgent.indexOf('Firefox') !== -1) {
    result = 'Mozilla Firefox';
  } else if (navigator.userAgent.indexOf('MSIE') !== -1) {
    result = 'Internet Exploder';
  } else if (navigator.userAgent.indexOf('Edge') !== -1) {
    result = 'Microsoft Edge';
  } else if (navigator.userAgent.indexOf('Safari') !== -1) {
    result = 'Safari';
  } else if (navigator.userAgent.indexOf('Opera') !== -1) {
    result = 'Opera';
  } else if (navigator.userAgent.indexOf('Chrome') !== -1) {
    result = 'Google Chrome';
  }
  return result;
}

export function detectOS() {
  if (window.navigator.userAgent.indexOf('Windows NT 11.0') !== -1) return 'Windows 11';
  if (window.navigator.userAgent.indexOf('Windows NT 10.0') !== -1) return 'Windows 10';
  if (window.navigator.userAgent.indexOf('Windows NT 6.3') !== -1) return 'Windows 8.1';
  if (window.navigator.userAgent.indexOf('Windows NT 6.2') !== -1) return 'Windows 8';
  if (window.navigator.userAgent.indexOf('Windows NT 6.1') !== -1) return 'Windows 7';
  if (window.navigator.userAgent.indexOf('Windows NT 6.0') !== -1) return 'Windows Vista';
  if (window.navigator.userAgent.indexOf('Windows NT 5.1') !== -1) return 'Windows XP';
  if (window.navigator.userAgent.indexOf('Windows NT 5.0') !== -1) return 'Windows 2000';
  if (window.navigator.userAgent.indexOf('Mac') !== -1) return 'Mac'; // Macintosh, MacIntel, MacPPC, Mac68K
  if (window.navigator.userAgent.indexOf('iP') !== -1) return 'iOS'; // iPad, iPhone, iPod
  if (window.navigator.userAgent.indexOf('Android') !== -1) return 'Android';
  if (window.navigator.userAgent.indexOf('X11') !== -1) return 'UNIX';
  if (window.navigator.userAgent.indexOf('Linux') !== -1) return 'Linux';
  return 'Unknown OS';
}

export function deepClone<T>(obj: T): T {
  const ret = (obj instanceof Array ? [] : {}) as T;
  for (const key in obj) {
    if (obj[key] === undefined) {
      continue;
    }
    let val = obj[key];
    if (val && typeof (val) == 'object') {
      val = deepClone(val);
    }
    ret[key] = val;
  }
  return ret;
}

type DateTypeStyle = 'full' | 'long' | 'medium' | 'short';
const currentYear = new Date().getFullYear();
export function dateFormatter(d: Date | null, style: DateTypeStyle | any = 'medium') {
  if (!d) {
    return '';
  }
  if (typeof style !== 'string') {
    style = 'medium';
  }
  if (d.toDateString() === new Date().toDateString()) {
    return 'Сегодня';
  } else if (d.toDateString() === new Date(new Date().getTime() - 1000 * 60 * 60 * 24).toDateString()) {
    return 'Вчера';
  } else if (d.toDateString() === new Date(new Date().getTime() + 1000 * 60 * 60 * 24).toDateString()) {
    return 'Завтра';
  }
  return d.toLocaleDateString('ru-RU', { dateStyle: style }).replace(' г.', '').replace(String(currentYear), '');
}

export function timeFormatter(d: Date | null, style: DateTypeStyle | any = 'short') {
  if (!d) {
    return '';
  }
  if (typeof style !== 'string') {
    style = 'short';
  }
  return d.toLocaleTimeString('ru-RU', { timeStyle: style });
}

export function dateTimeFormatter(
  d: Date | null,
  dateStyle: DateTypeStyle | any = 'medium',
  timeStyle: DateTypeStyle | any = 'short',
) {
  if (!d) {
    return '';
  }
  if (typeof dateStyle !== 'string') {
    dateStyle = 'medium';
  }
  if (typeof timeStyle !== 'string') {
    timeStyle = 'short';
  }
  return dateFormatter(d, dateStyle) + ' ' + timeFormatter(d, timeStyle);
}

export function moneyFormatter(val: number): string {
  let postfix = '';
  if (val >= 1_000_000_000) {
    val /= 1_000_000_000;
    postfix = 'млрд.';
  } else if (val >= 1_000_000) {
    val /= 1_000_000;
    postfix = 'млн.';
  } else if (val >= 1_000) {
    val /= 1_000;
    postfix = 'тыс.';
  }
  return `${Math.floor(val * 10) / 10} ${postfix} ₽`;
}

export async function saveAllAssetsByServiceWorker(
  callbackEach?: (data: {current: string, progress: number, total: number}) => void,
  callbackFinish?: () => void,
  callbackError?: (errUrl: string | null) => void,
) {
  let allCachableResources: string[] = [];
  try {
    const module = await import(/* @vite-ignore */ `${'/assetsList.js'}`);
    allCachableResources = module.default; // list of all cachable resources urls
    console.log('Imported assetsList.js:', allCachableResources );
  } catch {
    console.warn('Cannot find assetsList.js. Nothing to cache. Maybe we are in develompent mode' )
  }

  async function saveAllSite() {
    try {
      await swAPI.cacheUrls(allCachableResources, callbackEach);
      if (callbackFinish) {
        callbackFinish();
      }
    } catch (errUrl) {
      if (callbackError) {
        callbackError(errUrl as unknown as string | null);
      }
    }
  }

  async function saveAllIfNotSaved() {
    if (await swAPI.isFilesCached(allCachableResources)) {
      if (callbackFinish) {
        callbackFinish();
      }
      return;
    }
    await saveAllSite();
  }

  async function setOverrideResourceRegexps() {
    const word = '[\\w-~!*\'()<>"{}|^`]+';
    const baseUrl = `(http(s)?://${word}(\\.${word})+)`;
    const anyEnding = `([?/].*)?`;
    const regexps = {} as {[key: string]: string};
    Object.keys(routes).forEach(route => {
      if (route.includes('pathMatch')) {
        return;
      }
      route = route.replace(/:\w+/, word);
      regexps[`^${baseUrl}${route}${anyEnding}$`] = '$1/index.html';
    });
    console.log("Send to SW override caching regexps:", regexps);
    await swAPI.setResourceMappingRegexps(regexps);
  }

  await setOverrideResourceRegexps();
  await saveAllIfNotSaved();
}

export async function setDisableCachingUrlsByServiceWorker(paths: string[]) {
  const word = '[\\w-~!*\'()<>"{}|^`]+';
  const baseUrl = `(http(s)?://${word}(\\.${word})+)`;
  const regexps = paths.map(path => `^${baseUrl}${path}$`);
  console.log("Send to SW disable caching regexps:", regexps);
  return await swAPI.setDisableCachingRegexps(regexps)
}

export function isMobile() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor);
  return check;
}

export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}
