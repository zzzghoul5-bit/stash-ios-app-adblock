(() => {
  "use strict";

  const requestUrl =
    typeof $request !== "undefined" && typeof $request.url === "string"
      ? $request.url
      : "";
  const originalBody =
    typeof $response !== "undefined" && typeof $response.body === "string"
      ? $response.body
      : "";
  let finished = false;

  function finish(result) {
    if (!finished) {
      finished = true;
      $done(result || {});
    }
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function isPositiveMarker(value) {
    if (
      value === null ||
      value === undefined ||
      value === false ||
      value === "" ||
      value === 0 ||
      value === "0"
    ) {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (isObject(value)) {
      return Object.keys(value).length > 0;
    }
    return true;
  }

  function parseRequest(url) {
    const match = /^https:\/\/([^/?#]+)(\/[^?#]*)?(?:[?#]|$)/i.exec(url);
    return match
      ? { host: match[1].toLowerCase(), path: match[2] || "/" }
      : null;
  }

  function hasExplicitAdMarker(item) {
    return ["ad", "adjson"].some(
      (key) => hasOwn(item, key) && isPositiveMarker(item[key])
    );
  }

  function hasPromotionMarker(item) {
    return (
      hasOwn(item, "promotion_extra") &&
      isPositiveMarker(item.promotion_extra)
    );
  }

  try {
    if (!requestUrl || !originalBody) {
      finish({});
      return;
    }

    const request = parseRequest(requestUrl);
    if (!request || request.host !== "api.zhihu.com") {
      finish({});
      return;
    }
    if (request.path.length > 1 && request.path.endsWith("/")) {
      request.path = request.path.slice(0, -1);
    }

    let body;
    try {
      body = JSON.parse(originalBody);
    } catch (_) {
      finish({});
      return;
    }

    if (!isObject(body)) {
      finish({});
      return;
    }

    let removed = 0;

    if (request.path === "/topstory/recommend") {
      if (!Array.isArray(body.data)) {
        finish({});
        return;
      }

      body.data = body.data.filter((item) => {
        if (!isObject(item)) {
          return true;
        }
        const explicitAdMarker = hasExplicitAdMarker(item);
        const promotionMarker = hasPromotionMarker(item);
        const isExplicitFeedAd = item.type === "feed_advert";
        const isKnownSlot =
          item.card_type === "slot_event_card" ||
          item.card_type === "slot_video_event_card";
        const isCommonPromotion =
          (item.type === "common_card" || item.card_type === "common_card") &&
          promotionMarker;
        const isVerifiedSlot =
          isKnownSlot && (explicitAdMarker || promotionMarker);
        const isAd =
          isExplicitFeedAd ||
          explicitAdMarker ||
          isCommonPromotion ||
          isVerifiedSlot;
        if (isAd) {
          removed += 1;
          return false;
        }
        return true;
      });
    } else if (request.path === "/commercial_api/app_float_layer") {
      if (hasOwn(body, "feed_egg")) {
        delete body.feed_egg;
        removed += 1;
      }
      if (isObject(body.data) && hasOwn(body.data, "feed_egg")) {
        delete body.data.feed_egg;
        removed += 1;
      }
    } else if (
      /^\/(?:v4\/)?questions\/\d+\/(?:feeds?|answers)$/.test(request.path)
    ) {
      if (hasOwn(body, "ad_info")) {
        delete body.ad_info;
        removed += 1;
      }
      if (isObject(body.data) && hasOwn(body.data, "ad_info")) {
        delete body.data.ad_info;
        removed += 1;
      }
    } else {
      finish({});
      return;
    }

    if (removed > 0) {
      console.log(
        `[stash-adblock] zhihu path=${request.path} removed=${removed}`
      );
      finish({ body: JSON.stringify(body) });
    } else {
      finish({});
    }
  } catch (error) {
    const message =
      error && typeof error.message === "string" ? error.message : "unknown";
    console.log(`[stash-adblock] zhihu bypassed=${message}`);
    finish({});
  }
})();
