/**
 * measurement.js からの認証コード照合用 GAS。
 *
 * 使い方:
 * 1) スクリプト プロパティに AUTH_CODE を設定
 * 2) ウェブアプリとしてデプロイ（全員）
 * 3) 発行された URL を measurement.js の GAS_URL に設定
 *
 * 受信形式:
 * - GET:  ?code=xxxxx
 * - POST: JSON {"code":"xxxxx"}
 * - POST: form-urlencoded code=xxxxx
 *
 * 返却:
 * - 成功: "OK"
 * - 失敗: "NG"
 */

const AUTH_PROP_KEY = "AUTH_CODE";

function doGet(e) {
  const code = getCodeFromGet(e);
  return buildAuthResponse(code);
}

function doPost(e) {
  const code = getCodeFromPost(e);
  return buildAuthResponse(code);
}

function getCodeFromGet(e) {
  if (!e || !e.parameter) return "";
  return String(e.parameter.code || "").trim();
}

function getCodeFromPost(e) {
  if (!e || !e.postData) return "";
  const contentType = String(e.postData.type || "").toLowerCase();
  const body = String(e.postData.contents || "");

  if (contentType.indexOf("application/json") >= 0) {
    try {
      const parsed = JSON.parse(body);
      return String((parsed && parsed.code) || "").trim();
    } catch (_err) {
      return "";
    }
  }

  if (contentType.indexOf("application/x-www-form-urlencoded") >= 0) {
    const params = parseFormEncoded(body);
    return String(params.code || "").trim();
  }

  // content-type が不明な場合も一応 form として解釈を試みる
  const params = parseFormEncoded(body);
  return String(params.code || "").trim();
}

function parseFormEncoded(body) {
  const result = {};
  if (!body) return result;

  const pairs = body.split("&");
  for (let i = 0; i < pairs.length; i++) {
    if (!pairs[i]) continue;
    const eqIndex = pairs[i].indexOf("=");
    const rawKey = eqIndex >= 0 ? pairs[i].slice(0, eqIndex) : pairs[i];
    const rawValue = eqIndex >= 0 ? pairs[i].slice(eqIndex + 1) : "";
    const key = decodeURIComponent(rawKey.replace(/\+/g, " "));
    const value = decodeURIComponent(rawValue.replace(/\+/g, " "));
    result[key] = value;
  }
  return result;
}

function buildAuthResponse(inputCode) {
  const expectedCode = String(PropertiesService.getScriptProperties().getProperty(AUTH_PROP_KEY) || "").trim();

  // 空設定のまま公開しないため、未設定時は常に失敗
  if (!expectedCode) return textResponse("NG");

  return textResponse(inputCode === expectedCode ? "OK" : "NG");
}

function textResponse(text) {
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}
