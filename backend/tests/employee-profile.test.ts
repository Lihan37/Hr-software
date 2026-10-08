import { describe, expect, it } from 'vitest';
import { EmployeeContact, EmployeeEducation, EmployeeExperience, EmployeeFamilyMember, EmployeeIdentity } from '../src/modules/employees/employee-profile.model.js';

describe('normalized employee profile models', () => {
  it('keeps sensitive and repeatable profile data outside the employee master document', () => {
    expect(EmployeeContact.modelName).toBe('EmployeeContact');
    expect(EmployeeIdentity.modelName).toBe('EmployeeIdentity');
    expect(EmployeeFamilyMember.modelName).toBe('EmployeeFamilyMember');
    expect(EmployeeEducation.modelName).toBe('EmployeeEducation');
    expect(EmployeeExperience.modelName).toBe('EmployeeExperience');
  });

  it('enforces one contact and one identity profile per employee', () => {
    const contactIndex = EmployeeContact.schema.indexes().find(([fields]) => fields.employee === 1);
    const identityIndex = EmployeeIdentity.schema.indexes().find(([fields]) => fields.employee === 1);
    expect(contactIndex?.[1]).toMatchObject({ unique: true });
    expect(identityIndex?.[1]).toMatchObject({ unique: true });
  });
});
