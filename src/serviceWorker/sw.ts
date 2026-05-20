/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { SWCallbackEach } from '~/serviceWorker/swAPI';

const sw = self as unknown as ServiceWorkerGlobalScope & typeof globalThis;
export {};

// ------------------------------------------------------------------
// наименование для нашего хранилища кэша
const CACHE_KEYNAME = 'app_serviceworker_v_1';

// период обновления кэша
const CACHE_MAX_AGE_MS = 86400000; // 1 day

// Стратегия кэширования.
// true - сначала отдавать из кэша, а потом по возможности обновлять ресурс.
// Но после истечения CACHE_MAX_AGE_MS стратегия переключится на false, пока актуальная версия ресурса не будет получена
// false - сначала ждать ответа на запрос, а потом отдавать из кэша, если запрос не прошел
const STRATEGY_CACHE_FIRST = true;

// regExp-ссылок на НЕ-кэшируемые файлы
const DISABLE_CACHING_URLS_REGEXPS = [/sw\.js/];

// кол-во попыток загрузки файла, если они заканчиваются ошибкой
const FILES_LOADING_RETRIES_COUNT = 3;

// Типы PostMessage для общения приложения с service worker'ом
const PostMessagesNames = {
  cacheUrls: 'CACHE_URLS',
  isUrlsCached: 'IS_URLS_CACHED',
  clearCache: 'CLEAR_CACHE',
  saveOverrideResourceRegexps: 'SAVE_OVERRIDE_RESOURCE_REGEXPS',
  saveDisableCachingRegexps: 'SAVE_DISABLE_CACHING_URLS_REGEXPS',

  swCacheProgress: 'SW_CACHE_PROGRESS',
  swAllUrlsCached: 'SW_ALL_URLS_CACHED',
  swUrlsCachingError: 'SW_URLS_CACHING_ERROR',
  swIsUrlsCachedResponse: 'SW_IS_URLS_CACHED',
  swCacheCleared: 'SW_CACHE_CLEARED',
  overrideResourceRegexpsSaved: 'SW_OVERRIDE_RESOURCE_REGEXPS_SAVED',
  disableCachingRegexpsSaved: 'SW_DISABLE_CACHING_URLS_REGEXPS_SAVED',
};

// для страниц слева будут несмотря на url отдаваться ресурсы справа. Обхект расширяем через соответствующий postMessage
const word = '[\\w-~!*\'()<>"{}|^`]+';
const baseUrl = `(http(s)?://${word}(\\.${word})+)`;
const OVERRIDE_RESOURCE_MAPPING_REGEXPS = {
  [`^${baseUrl}/?$`]: '$1/index.html',
};
// ------------------------------------------------------------------

const PostMessage = (type: string, payload: any, uid: string) => ({
  type: type,
  payload: payload,
  uid: uid,
});

function broadcastPostMessage(message: object) {
  // Select who we want to respond to
  sw.clients
    .matchAll({
      includeUncontrolled: true,
      type: 'window',
    })
    .then(clients => {
      if (clients && clients.length) {
        // Send a response - the clients
        // array is ordered by last focused
        clients[0].postMessage(message);
      }
      return;
    })
    .catch(err => console.error("Unknown error when sending broadcast message:", err));
}

console.log('SW file initialized');

sw.addEventListener('install', function (event) {
  event.waitUntil(sw.skipWaiting());
  console.log('SW installed', event);
});
sw.addEventListener('active', function (event) {
  console.log('SW active', event);
});

function isUrlNotCachable(url: string) {
  return DISABLE_CACHING_URLS_REGEXPS.some(regExp => regExp.test(url));
}

function rewriteUrlToCachedUrl(url: string) {
  // apply rewriting rules
  const replacingRegExp = Object.keys(OVERRIDE_RESOURCE_MAPPING_REGEXPS).find(regExpStr =>
    new RegExp(regExpStr, 'ig').test(url),
  )!;
  if (replacingRegExp) {
    url = url.replaceAll(
      new RegExp(replacingRegExp, 'ig'),
      OVERRIDE_RESOURCE_MAPPING_REGEXPS[replacingRegExp as keyof typeof OVERRIDE_RESOURCE_MAPPING_REGEXPS],
    );
  }
  // relative url to absolute
  if (!(url.startsWith('/') || url.startsWith('http'))) {
    url =
      location.protocol +
      '//' +
      location.host +
      location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1) +
      url;
  }
  return url;
}

async function setCached(url: string, response: Response, openedCache?: Cache) {
  if (isUrlNotCachable(url)) {
    return;
  }
  url = rewriteUrlToCachedUrl(url);
  const cache = openedCache || (await caches.open(CACHE_KEYNAME));

  // Хотим установить хэдер 'saved-to-sw-datetime' в текущее время, чтобы от него потом отсчитывать истечение кэша
  // Для этого создаем полную копию запроса, потому что Response не иммутабелен
  response = response.clone();
  const headers = new Headers();
  for (const [key, val] of response.headers.entries()) {
    headers.append(key, val);
  }
  headers.set('saved-to-sw-datetime', new Date().toISOString());
  const blob = await response.blob();
  const newResponse = new Response(blob, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
  await cache.put(url, newResponse);
}

async function downloadAll(urls: string[], callbackEach: SWCallbackEach, openedCache = undefined) {
  const cache = openedCache || (await caches.open(CACHE_KEYNAME));
  let finishedCount = 0;
  let errorUrl = null;
  const promises = urls.map(async (url) => {
    if (isUrlNotCachable(url)) {
      return;
    }

    async function getResource(retryNumber: number): Promise<boolean> {
      try {
        const response = await fetch(url);
        await setCached(url, response.clone(), cache);
        finishedCount++;
        callbackEach({ current: url, progress: finishedCount, total: urls.length });
        return true;
      } catch (err) {
        console.warn(`SW: Error on caching file ${url} | Try: ${retryNumber} | Error: ${err}`);
        return false;
      }
    }

    let retryNumber = 0;
    let res: boolean;
    do {
      res = await getResource(retryNumber);
      retryNumber++;
    } while (!res && retryNumber < FILES_LOADING_RETRIES_COUNT);
    if (!res) {
      errorUrl = url;
      console.error(`SW: Error on caching file ${url} after ${FILES_LOADING_RETRIES_COUNT} retries`);
    }
  });
  await Promise.all(promises);
  return errorUrl;
}

sw.addEventListener('message', async event => {
  if (event.data.type === PostMessagesNames.cacheUrls) {
    // Добавление в кэш статики через postMessage, отправленной из основного приложения
    if (!event.data.payload || !Array.isArray(event.data.payload)) {
      console.error('SW: Incorrect PostMessage with caching urls');
      return;
    }
    const errorUrl = await downloadAll(
      event.data.payload,
      data => {
        broadcastPostMessage(
          PostMessage(
            PostMessagesNames.swCacheProgress,
            {
              current: data.current,
              progress: data.progress,
              total: event.data.payload.length,
            },
            event.data.uid,
          ),
        );
      },
    );
    if (errorUrl === null) {
      broadcastPostMessage(PostMessage(PostMessagesNames.swAllUrlsCached, null, event.data.uid));
      console.log('SW: Urls added to cache:', event.data.payload);
    } else {
      broadcastPostMessage(PostMessage(PostMessagesNames.swUrlsCachingError, errorUrl, event.data.uid));
      console.error('SW: Urls added to cache with error in:', errorUrl, ' | All urls: ', event.data.payload);
    }
  } else if (event.data.type === PostMessagesNames.isUrlsCached) {
    // Проверка, добавлена ли в кэш статика через postMessage, отправленной из основного приложения
    const cache = await caches.open(CACHE_KEYNAME);
    const allCachedUrls = await cache.keys();
    const urls = event.data.payload;
    broadcastPostMessage(
      PostMessage(
        PostMessagesNames.swIsUrlsCachedResponse,
        urls.every((url: string) => {
          const cachedUrl = rewriteUrlToCachedUrl(url);
          return allCachedUrls.some(cachedReq => cachedReq.url === cachedUrl);
        }),
        event.data.uid,
      ),
    );
  } else if (event.data.type === PostMessagesNames.clearCache) {
    // Очистка кэша
    const cache = await caches.open(CACHE_KEYNAME);
    const promises = (await cache.keys()).map(key => cache.delete(key));
    await Promise.all(promises);
    broadcastPostMessage(PostMessage(PostMessagesNames.swCacheCleared, null, event.data.uid));
  } else if (event.data.type === PostMessagesNames.saveOverrideResourceRegexps) {
    Object.assign(OVERRIDE_RESOURCE_MAPPING_REGEXPS, event.data.payload);
    broadcastPostMessage(PostMessage(PostMessagesNames.overrideResourceRegexpsSaved, null, event.data.uid));
  } else if (event.data.type === PostMessagesNames.saveDisableCachingRegexps) {
    DISABLE_CACHING_URLS_REGEXPS.push(...event.data.payload);
    broadcastPostMessage(PostMessage(PostMessagesNames.disableCachingRegexpsSaved, null, event.data.uid));
  }
});

sw.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') {
    return;
  }
  if (isUrlNotCachable(event.request.url)) {
    return;
  }

  const getResponseWithFetch = async () => {
    try {
      const response = await fetch(event.request.clone());
      if (response.ok) {
        await setCached(event.request.url, response); // Добавляем в кэш
        return response.clone();
      }
      return null;
    } catch {
      return null;
    }
  };
  const getResponseFromCache = async (): Promise<[Response, boolean]> => {
    // Преобразуем url по правилам из конфига в константах
    const url = rewriteUrlToCachedUrl(event.request.url);
    // Ищем кэш
    const cachedResponse = await caches.match(url);
    if (cachedResponse) {
      const header = cachedResponse.headers.get('saved-to-sw-datetime');
      if (header) {
        const savedDatetime = new Date(header);
        if (savedDatetime && Date.now() - savedDatetime.getTime() <= CACHE_MAX_AGE_MS) {
          // Отдаем кэш
          return [cachedResponse, true];
        } else {
          // Отдаем кэш, но говорим, что он уже истек
          return [cachedResponse, false];
        }
      }
    }
    // Отдаем инфу, что кэша нет
    return [
      new Response(
        `
<html lang="ru">
<head>
  <title>Нет соединения</title>
  <meta charset="UTF-8"/>
</head>
<body align="center">
  <h1>Нет соединения</h1>
  <p>
    <b>Чтобы згрузить эту страницу, включите соединение</b>
    <br>
    <small><i>Или этой страницы не существует</i></small>
  </p>
</body>
</html>`,
        { headers: { 'Content-Type': 'text/html' } },
      ),
      false,
    ];
  };

  event.respondWith(
    (async () => {
      if (STRATEGY_CACHE_FIRST) {
        const [cached, ok] = await getResponseFromCache();
        if (ok) {
          getResponseWithFetch();
          return cached;
        }
        return (await getResponseWithFetch()) || cached;
      }
      return (await getResponseWithFetch()) || (await getResponseFromCache())[0];
    })(),
  );
});
