import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import ExcelJS from 'exceljs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { AuditLog } from '../modules/audit/audit.model.js';
import { Employee } from '../modules/employees/employee.model.js';
import { Department, Designation } from '../modules/organization/organization.model.js';

const sourcePath = resolve(process.cwd(), '..', '9.BWPR Salary of September 2026.xlsx');
const apply = process.argv.includes('--apply');

interface LegacyEmployee {
  row: number;
  serial: number;
  employeeId: string;
  legacyEmployeeId: string;
  fullName: string;
  joiningDate: Date;
  department: string;
  designation: string;
  location: string;
}

function referenceCode(prefix: string, value: string): string {
  const slug = value.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 10) || 'UNKNOWN';
  const hash = createHash('sha1').update(value.toLowerCase()).digest('hex').slice(0, 5).toUpperCase();
  return `${prefix}-${slug}-${hash}`;
}

function excelDate(value: ExcelJS.CellValue, date1904: boolean): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const epoch = Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30);
    return new Date(epoch + value * 86_400_000);
  }
  const parsed = new Date(String(value ?? ''));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(sourcePath);
const worksheet = workbook.getWorksheet('Master Payroll');
if (!worksheet) throw new Error('Expected worksheet "Master Payroll" was not found');

const records: LegacyEmployee[] = [];
const errors: string[] = [];
let currentDepartment = '';

worksheet.eachRow((row, rowNumber) => {
  if (rowNumber < 7) return;
  const departmentCell = row.getCell(1).text.trim();
  if (departmentCell) currentDepartment = departmentCell;
  const serial = Number(row.getCell(2).value);
  const legacyEmployeeId = row.getCell(3).text.trim();
  if (!Number.isInteger(serial) || !legacyEmployeeId) return;

  const fullName = row.getCell(5).text.trim();
  const designation = row.getCell(6).text.trim();
  const location = row.getCell(7).text.trim();
  const joiningDate = excelDate(row.getCell(4).value, Boolean(workbook.properties.date1904));
  if (!currentDepartment || !fullName || !designation || !joiningDate) {
    errors.push(`Row ${rowNumber}: missing required department, name, designation, or joining date`);
    return;
  }

  records.push({
    row: rowNumber,
    serial,
    employeeId: `EMP-${String(serial).padStart(6, '0')}`,
    legacyEmployeeId,
    fullName,
    joiningDate,
    department: currentDepartment,
    designation,
    location
  });
});

const duplicateCanonicalIds = [...new Set(records.map((record) => record.employeeId).filter((id, index, all) => all.indexOf(id) !== index))];
const normalizedLegacyIds = records.map((record) => record.legacyEmployeeId.toUpperCase().replace(/\s+/g, ''));
const duplicateLegacyIds = [...new Set(normalizedLegacyIds.filter((id, index, all) => all.indexOf(id) !== index))];
const report = {
  mode: apply ? 'apply' : 'dry-run',
  source: sourcePath,
  employeeRows: records.length,
  departments: new Set(records.map((record) => record.department)).size,
  designations: new Set(records.map((record) => record.designation)).size,
  locations: new Set(records.map((record) => record.location)).size,
  canonicalIdRange: records.length ? [records[0]!.employeeId, records.at(-1)!.employeeId] : [],
  duplicateCanonicalIds,
  duplicateLegacyIds,
  validationErrors: errors
};

if (errors.length || duplicateCanonicalIds.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else if (!apply) {
  console.log(JSON.stringify(report, null, 2));
} else {
  await connectDatabase();
  let created = 0;
  let skipped = 0;
  try {
    for (const record of records) {
      const existing = await Employee.exists({ employeeId: record.employeeId });
      if (existing) {
        skipped += 1;
        continue;
      }
      const department = await Department.findOneAndUpdate(
        { name: record.department },
        { $setOnInsert: { name: record.department, code: referenceCode('LEG-D', record.department), description: 'Imported from the September 2026 legacy workbook', active: true } },
        { upsert: true, new: true, runValidators: true }
      );
      const designation = await Designation.findOneAndUpdate(
        { name: record.designation },
        { $setOnInsert: { name: record.designation, code: referenceCode('LEG-J', record.designation), description: 'Imported from the September 2026 legacy workbook', active: true } },
        { upsert: true, new: true, runValidators: true }
      );
      const employee = await Employee.create({
        employeeId: record.employeeId,
        legacyEmployeeId: record.legacyEmployeeId,
        fullName: record.fullName,
        employment: {
          department: department._id,
          designation: designation._id,
          employeeType: 'UNSPECIFIED',
          joiningDate: record.joiningDate,
          status: 'ACTIVE',
          location: record.location
        }
      });
      await AuditLog.create({
        actor: null,
        action: 'EMPLOYEE_IMPORTED',
        entityType: 'Employee',
        entityId: employee._id,
        changes: { source: 'legacy-workbook', row: record.row, employeeId: record.employeeId, legacyEmployeeId: record.legacyEmployeeId }
      });
      created += 1;
    }
    console.log(JSON.stringify({ ...report, created, skipped }, null, 2));
  } finally {
    await disconnectDatabase();
  }
}
