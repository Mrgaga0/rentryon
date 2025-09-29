import * as XLSX from 'xlsx';
import { parseProductsFromExcel } from '../../server/gemini';
import { storage } from '../../server/storage';
import type { Category } from '@shared/schema';

async function main() {
  const mockCategories: Category[] = [
    { id: 'cat1', name: 'Refrigerator', nameKo: '냉장고', icon: 'fridge', createdAt: new Date() },
    { id: 'cat2', name: 'Washer', nameKo: '세탁기', icon: 'washer', createdAt: new Date() },
    { id: 'cat3', name: 'Air Conditioner', nameKo: '에어컨', icon: 'air', createdAt: new Date() },
    { id: 'cat4', name: 'Television', nameKo: 'TV', icon: 'tv', createdAt: new Date() },
    { id: 'cat6', name: 'Robot Vacuum', nameKo: '로봇청소기', icon: 'robot', createdAt: new Date() },
  ];

  (storage as any).getCategories = async () => mockCategories;

  const worksheetData = [
    ['제품명', '브랜드', '월 렌탈료', '모델명', '분류'],
    ['AI 프리미엄 냉장고', '삼성', '55,000', 'RQ1234', '냉장고'],
    ['슬림 로봇청소기', 'LG', '33,000', 'RV987', '로봇청소기'],
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, '제품목록');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const result = await parseProductsFromExcel(buffer as Buffer, 'sample-products.xlsx');

  console.log('Excel stats:', result.stats);
  console.log('Resolved mapping source:', result.mapping?.source, 'confidence:', result.mapping?.confidence);
  console.log('Resolved category guess:', {
    guess: result.mapping?.categoryGuess,
    resolvedId: result.mapping?.resolvedCategoryId,
    resolvedLabel: result.mapping?.resolvedCategoryLabel,
  });
  console.log('First draft:', result.drafts[0]);
}

main().catch((error) => {
  console.error('Excel parsing script failed:', error);
  process.exitCode = 1;
});
