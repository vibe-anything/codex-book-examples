import { readFileSync } from 'node:fs';
import path from 'node:path';

const REGION_CODE_FILE = 'legalDongCode.txt';

let cachedRegions;

const CITY_ALIASES = [
  ['서울특별시', '서울'],
  ['부산광역시', '부산'],
  ['대구광역시', '대구'],
  ['인천광역시', '인천'],
  ['광주광역시', '광주'],
  ['대전광역시', '대전'],
  ['울산광역시', '울산'],
  ['세종특별자치시', '세종'],
  ['제주특별자치도', '제주']
];

export function resolveRegionName(regionName) {
  const query = normalizeRegionName(regionName);

  if (!query) {
    return {
      ok: false,
      error: '지역명을 입력하세요.'
    };
  }

  const regions = getActiveRegions();
  const exactMatches = regions.filter((region) => region.searchNames.includes(query));
  const tokenMatches = query
    ? regions.filter((region) => getQueryTokens(regionName).every((token) => region.searchText.includes(token)))
    : [];
  const candidates = exactMatches.length > 0 ? exactMatches : tokenMatches;
  const sggMatches = groupBySggCode(candidates);

  if (sggMatches.length === 1) {
    return {
      ok: true,
      value: sggMatches[0]
    };
  }

  if (sggMatches.length > 1) {
    return {
      ok: false,
      error: `지역명이 여러 지역과 일치합니다. 예: ${sggMatches
        .slice(0, 3)
        .map((region) => region.name)
        .join(', ')}`
    };
  }

  return {
    ok: false,
    error: '지역명을 법정동코드 자료에서 찾을 수 없습니다.'
  };
}

function getActiveRegions() {
  if (!cachedRegions) {
    cachedRegions = parseRegionCodeText(readRegionCodeFile());
  }

  return cachedRegions;
}

function readRegionCodeFile() {
  const bytes = readFileSync(path.join(process.cwd(), REGION_CODE_FILE));
  return new TextDecoder('euc-kr').decode(bytes);
}

export function parseRegionCodeText(text) {
  return text
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [code, name, status] = line.split('\t');
      return createRegionEntry(code, name, status);
    })
    .filter((region) => region && region.status === '존재');
}

function createRegionEntry(code, name, status) {
  if (!/^\d{10}$/.test(code || '') || !name) {
    return null;
  }

  const displayName = name.trim();
  const shortName = toShortRegionName(displayName);
  const lastName = displayName.split(/\s+/).at(-1);

  return {
    code,
    sggCode: code.slice(0, 5),
    name: displayName,
    status: status?.trim() || '',
    searchNames: [displayName, shortName, lastName].map(normalizeRegionName),
    searchText: normalizeRegionName(`${displayName} ${shortName}`)
  };
}

function groupBySggCode(regions) {
  const byCode = new Map();

  for (const region of regions) {
    const current = byCode.get(region.sggCode);

    if (!current || region.name.length < current.name.length) {
      byCode.set(region.sggCode, {
        regionCode: region.sggCode,
        regionName: region.name
      });
    }
  }

  return [...byCode.values()].sort((a, b) => a.regionName.localeCompare(b.regionName, 'ko-KR'));
}

function getQueryTokens(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .map(normalizeRegionName)
    .filter(Boolean);
}

function toShortRegionName(name) {
  return CITY_ALIASES.reduce((result, [longName, shortName]) => result.replaceAll(longName, shortName), name);
}

function normalizeRegionName(value) {
  return toShortRegionName(String(value || ''))
    .replace(/\s+/g, '')
    .trim();
}
