import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

import { parseProductsFromExcel } from '../gemini';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('parseProductsFromExcel handles 렌탈료 template without Gemini', async () => {
  const fixturePath = path.resolve(
    __dirname,
    '../../attached_assets/9월 렌탈료리스트_1758755776240.xlsx'
  );
  const buffer = await readFile(fixturePath);

  const result = await parseProductsFromExcel(buffer, path.basename(fixturePath));

  assert.ok(result.drafts.length > 0, 'Expected at least one draft');

  const [firstDraft] = result.drafts;

  assert.equal(firstDraft.nameKo, 'AIS 3.0');
  assert.equal(firstDraft.name, 'AIS 3.0');
  assert.equal(firstDraft.modelNumber, 'CHPI-7511L');
  assert.equal(firstDraft.brand, '코웨이');
  assert.equal(firstDraft.categoryId, 'water-purifier');
  assert.equal(Number(firstDraft.monthlyPrice), 50900);
  assert.equal(Number(firstDraft.originalPrice), 54900);

  assert.ok(firstDraft.specifications, 'Expected specifications to be populated');
  assert.equal(firstDraft.specifications?.['렌탈료소유권'], 3);
  assert.equal(firstDraft.specifications?.['리스구분'], 'R');
  assert.equal(firstDraft.specifications?.['점검주기'], '2M(2개월점검주기)');

  assert.equal(result.mapping?.source, 'fallback');
  assert.equal(result.mapping?.columnMappings?.['마케팅네임']?.field, 'nameKo');
  assert.equal(result.mapping?.columnMappings?.['제품명']?.field, 'modelNumber');
  assert.equal(result.mapping?.columnMappings?.['약정할인가']?.transformer, 'price');
  assert.equal(result.mapping?.columnMappings?.['정상가']?.transformer, 'price');
});

test('parseProductsFromExcel tolerates spaced 렌탈료 headers', async () => {
  const workbook = XLSX.utils.book_new();
  const sheetData = [
    [' 제품군 ', '마케팅 네임', '제품명', '렌탈료 소유권', '리스 구분', '점검 주기', '정상가', '약정 할인 가'],
    ['정수기', '테스트 제품', 'MODEL-001', 3, 'R', '2M', 54900, 50900],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, sheet, '청호');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const result = await parseProductsFromExcel(buffer, '청호 템플릿.xlsx');

  assert.equal(result.drafts.length, 1);
  const draft = result.drafts[0];

  assert.equal(draft.nameKo, '테스트 제품');
  assert.equal(draft.name, '테스트 제품');
  assert.equal(draft.modelNumber, 'MODEL-001');
  assert.equal(draft.categoryId, 'water-purifier');
  assert.equal(Number(draft.monthlyPrice), 50900);
  assert.equal(Number(draft.originalPrice), 54900);
  assert.equal(draft.brand, '청호');

  assert.equal(draft.specifications?.['렌탈료 소유권'], 3);
  assert.equal(draft.specifications?.['리스 구분'], 'R');
  assert.equal(draft.specifications?.['점검 주기'], '2M');

  assert.equal(result.mapping?.columnMappings?.['마케팅 네임']?.field, 'nameKo');
  assert.equal(result.mapping?.columnMappings?.['제품명']?.field, 'modelNumber');
  assert.equal(result.mapping?.columnMappings?.['약정 할인 가']?.field, 'monthlyPrice');
  assert.equal(result.mapping?.columnMappings?.['정상가']?.field, 'originalPrice');
  assert.equal(result.mapping?.columnMappings?.['제품군']?.field, 'categoryId');
});
