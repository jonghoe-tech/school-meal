const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const root = __dirname;
const config = { ...process.env, ...loadEnv(path.join(root, ".env")) };
const port = Number(config.PORT || 3000);

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  }));
}

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

function normalizeMeals(payload) {
  const rows = payload?.mealServiceDietInfo?.find((part) => part.row)?.row || [];
  return rows.map((row) => ({
    date: `${row.MLSV_YMD.slice(0, 4)}-${row.MLSV_YMD.slice(4, 6)}-${row.MLSV_YMD.slice(6, 8)}`,
    type: row.MMEAL_SC_NM,
    time: getMealTime(row.MMEAL_SC_NM),
    title: `${row.MMEAL_SC_NM} 식단`,
    items: (row.DDISH_NM || "").split(/<br\s*\/?>|\r?\n/).map((item) => item.trim()).filter(Boolean),
    kcal: row.CAL_INFO || "정보 없음",
    nutrition: parseNutrition(row.NTR_INFO),
    origin: (row.ORPLC_INFO || "정보 없음").replace(/<br\s*\/?>/g, ", "),
  }));
}

function parseNutrition(value = "") {
  const nutrition = {};
  for (const label of ["탄수화물", "단백질", "지방"]) {
    const match = value.match(new RegExp(`${label}(?:\\([^)]*\\))?\\s*:\\s*([^<\\r\\n]+)`));
    nutrition[label] = match ? match[1].trim() : "정보 없음";
  }
  return nutrition;
}

function getMealTime(mealType) {
  const mealTimes = {
    조식: config.BREAKFAST_TIME,
    중식: config.LUNCH_TIME,
    석식: config.DINNER_TIME,
  };
  return mealTimes[mealType] || "시간 정보 없음";
}

async function handleMeals(request, response, requestUrl) {
  if (!config.NEIS_API_KEY || !config.ATPT_OFCDC_SC_CODE || !config.SD_SCHUL_CODE) {
    sendJson(response, 500, { error: "서버의 .env에 나이스 API 설정이 없습니다." });
    return;
  }
  const params = new URLSearchParams({
    KEY: config.NEIS_API_KEY,
    Type: "json",
    pIndex: "1",
    pSize: "100",
    ATPT_OFCDC_SC_CODE: config.ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE: config.SD_SCHUL_CODE,
    MLSV_FROM_YMD: requestUrl.searchParams.get("from") || new Date().toISOString().slice(0, 10).replaceAll("-", ""),
    MLSV_TO_YMD: requestUrl.searchParams.get("to") || new Date().toISOString().slice(0, 10).replaceAll("-", ""),
  });
  const apiResponse = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?${params}`);
  const payload = await apiResponse.json();
  if (payload.RESULT?.CODE === "ERROR-300" || payload.RESULT?.CODE === "ERROR-290") {
    sendJson(response, 502, { error: payload.RESULT.MESSAGE || "나이스 API 요청에 실패했습니다." });
    return;
  }
  sendJson(response, 200, { meals: normalizeMeals(payload) });
}

function serveStatic(response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(root, requested));
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404); response.end("Not found"); return;
  }
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
  response.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(response);
}

http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (requestUrl.pathname === "/api/meals") await handleMeals(request, response, requestUrl);
    else serveStatic(response, requestUrl.pathname);
  } catch (error) {
    sendJson(response, 500, { error: "서버 오류가 발생했습니다." });
    console.error(error);
  }
}).listen(port, () => console.log(`급식 웹 앱: http://localhost:${port}`));