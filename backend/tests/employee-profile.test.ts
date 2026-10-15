import { describe, expect, it } from 'vitest';
import { EmployeeBankAccount, EmployeeContact, EmployeeEducation, EmployeeExperience, EmployeeFamilyMember, EmployeeIdentity } from '../src/modules/employees/employee-profile.model.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { Branch, BusinessUnit, CostCenter, EmployeeLevel } from '../src/modules/organization/organization.model.js';
import { rolePermissions } from '../src/modules/auth/permissions.js';

describe('normalized employee profile models', () => {
  it('keeps sensitive and repeatable profile data outside the employee master document', () => {
    expect(EmployeeContact.modelName).toBe('EmployeeContact');
    expect(EmployeeIdentity.modelName).toBe('EmployeeIdentity');
    expect(EmployeeFamilyMember.modelName).toBe('EmployeeFamilyMember');
    expect(EmployeeEducation.modelName).toBe('EmployeeEducation');
    expect(EmployeeExperience.modelName).toBe('EmployeeExperience');
    expect(EmployeeBankAccount.modelName).toBe('EmployeeBankAccount');
  });

  it('enforces one contact, identity, and bank profile per employee', () => {
    const contactIndex = EmployeeContact.schema.indexes().find(([fields]) => fields.employee === 1);
    const identityIndex = EmployeeIdentity.schema.indexes().find(([fields]) => fields.employee === 1);
    const bankIndex = EmployeeBankAccount.schema.indexes().find(([fields]) => fields.employee === 1);
    expect(contactIndex?.[1]).toMatchObject({ unique: true });
    expect(identityIndex?.[1]).toMatchObject({ unique: true });
    expect(bankIndex?.[1]).toMatchObject({ unique: true });
    expect(EmployeeBankAccount.schema.path('accountNumber')?.options.select).toBe(false);
  });

  it('persists the requested professional information on the employee master', () => {
    for (const path of ['employment.reviewer', 'employment.employeeOf', 'employment.divisionName', 'employment.workforceType', 'employment.employeeCategory', 'employment.jobDescription', 'employment.employeeBand', 'employment.actualJoiningDate', 'employment.approvedPositionId', 'employment.requisitionNo', 'employment.joiningSource', 'employment.timeAttendanceApplicable', 'employment.dutySchedule', 'employment.lockerNumber', 'employment.dormitory', 'employment.uniformApplicable', 'employment.regionName', 'employment.clusterName', 'employment.depotName', 'employment.territoryName', 'employment.areaName', 'employment.otherErpId', 'employment.employmentRemarks']) {
      expect(Employee.schema.path(path), path).toBeDefined();
    }
  });

  it('provides centrally managed options for controlled employee fields', () => {
    expect(BusinessUnit.modelName).toBe('BusinessUnit');
    expect(Branch.modelName).toBe('Branch');
    expect(CostCenter.modelName).toBe('CostCenter');
    expect(EmployeeLevel.modelName).toBe('EmployeeLevel');
    for (const model of [BusinessUnit, Branch, CostCenter, EmployeeLevel]) {
      expect(model.schema.path('name')).toBeDefined();
      expect(model.schema.path('code')).toBeDefined();
      expect(model.schema.path('active')).toBeDefined();
    }
  });

  it('restricts employee ID card generation to HR roles', () => {
    for (const role of ['SUPER_ADMIN', 'HR_ADMIN', 'HR'] as const) {
      expect(rolePermissions[role]).toContain('employee:id-card:generate');
    }
    expect(rolePermissions.MANAGER).not.toContain('employee:id-card:generate');
    expect(rolePermissions.EMPLOYEE).not.toContain('employee:id-card:generate');
  });
});
