import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Employee } from '../modules/employees/employee.model.js';

await connectDatabase();
const employees = await Employee.find({ 'employment.employmentType': { $exists: false } }).select('employeeId fullName employment.employeeType employment.joiningDate').lean();
console.log(JSON.stringify({ mode: 'report-only', note: 'No employment type was guessed or written. HR must review every listed employee.', count: employees.length, employees: employees.map((employee: any) => ({ employeeId: employee.employeeId, name: employee.fullName, legacyEmployeeType: employee.employment?.employeeType ?? null, joiningDate: employee.employment?.joiningDate ?? null, suggestedAction: 'MANUAL_REVIEW_REQUIRED' })) }, null, 2));
await disconnectDatabase();
