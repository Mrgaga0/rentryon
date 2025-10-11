import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
