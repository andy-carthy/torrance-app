import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportWorkingPaper = async (fund: any, fsData: any, tbData: any) => {
  const workbook = new ExcelJS.Workbook();

  // --- TAB 1: Financial Statement ---
  const stmtSheet = workbook.addWorksheet('Financial Statement');
  stmtSheet.columns = [{ width: 40 }, { width: 25 }];

  // Title Formatting
  stmtSheet.mergeCells('A1:B1');
  const titleCell = stmtSheet.getCell('A1');
  titleCell.value = `${fund?.name || 'Fund'} - Statement of Assets & Liabilities`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center' };

  // Data Rows
  const rows = [
    ['Assets', ''],
    ['Investments, at Value', fsData.investments_at_value],
    ['Cash — Domestic', fsData.cash_domestic],
    ['Cash — Foreign Currency', fsData.cash_foreign],
    ['Dividends Receivable', fsData.dividends_receivable],
    ['Total Assets', fsData.total_assets],
    ['', ''],
    ['Liabilities', ''],
    ['Payable for Securities Purchased', -fsData.pay_securities],
    ['Investment Advisory Fee Payable', -fsData.advisory_fee_payable],
    ['Total Liabilities', -fsData.total_liabilities],
    ['', ''],
    ['Net Assets', fsData.net_assets]
  ];

  rows.forEach((row) => {
    const addedRow = stmtSheet.addRow(row);
    if (['Assets', 'Liabilities', 'Net Assets'].includes(row[0])) {
      addedRow.font = { bold: true };
    }
    if (typeof row[1] === 'number') {
      addedRow.getCell(2).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00)';
    }
  });

  // --- TAB 2: Raw Trial Balance Data ---
  const dataSheet = workbook.addWorksheet('Raw TB Data');
  dataSheet.columns = [
    { header: 'Account', key: 'acct', width: 15 },
    { header: 'Account Name', key: 'name', width: 35 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Debit', key: 'debit', width: 20 },
    { header: 'Credit', key: 'credit', width: 20 }
  ];

  const headerRow = dataSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

  tbData.forEach((r: any) => {
    dataSheet.addRow({
      acct: r.acct, name: r.name, category: r.category, debit: r.debit, credit: r.credit
    });
  });

  dataSheet.getColumn('debit').numFmt = '"$"#,##0.00';
  dataSheet.getColumn('credit').numFmt = '"$"#,##0.00';

  // Generate and Download
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${fund?.fund_id || 'Fund'}_WorkingPaper.xlsx`);
};
// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL EXPORT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
export const exportToExcel = async (data: any[], columns: any[], filename: string, sheetName = "Data") => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  // Setup columns
  sheet.columns = columns.map(c => ({
    header: typeof c === 'string' ? c : c.label,
    key: typeof c === 'string' ? c : c.field,
    width: 20
  }));

  // Style the Header Row to match Torrance UI (Navy Blue)
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };

  // Add the Data
  data.forEach((rowData: any) => {
    sheet.addRow(rowData);
  });

  // Generate and Download
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${filename}.xlsx`);
};

