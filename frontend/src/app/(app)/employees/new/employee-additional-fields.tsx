'use client';

type Ref = { _id: string; name: string; code?: string; active?: boolean };
type Manager = { _id: string; employeeId: string; fullName: string };

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div className="border-y border-slate-200 bg-slate-50 px-5 py-4 sm:col-span-2"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}

function TextField({ name, label, type = 'text', placeholder }: { name: string; label: string; type?: string; placeholder?: string }) {
  return <label><span className="mb-1 block text-sm font-semibold">{label}</span><input name={name} type={type} className="field" placeholder={placeholder}/></label>;
}

function AddressFields({ prefix, title }: { prefix: string; title: string }) {
  return <>
    <h3 className="pt-2 font-semibold sm:col-span-2">{title}</h3>
    <TextField name={`${prefix}HouseRoadVillage`} label="House / road / village"/>
    <TextField name={`${prefix}PostOffice`} label="Post office"/>
    <TextField name={`${prefix}PostCode`} label="Post code"/>
    <TextField name={`${prefix}District`} label="District"/>
    <TextField name={`${prefix}Upazila`} label="Upazila"/>
    <TextField name={`${prefix}Country`} label="Country" placeholder="Bangladesh"/>
    <label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold">Address details</span><textarea name={`${prefix}Line1`} className="field" rows={2}/></label>
  </>;
}

export function EmployeeAdditionalFields({ sections, managers, userRole }: { sections: Ref[]; managers: Manager[]; userRole?: string }) {
  const canManageBank = userRole === 'SUPER_ADMIN' || userRole === 'HR_ADMIN';
  return <>
    <SectionTitle title="Professional information" description="Organization assignment, reporting, attendance, and operational information."/>
    <TextField name="employeeOf" label="Employee of" placeholder="Company or concern"/>
    <TextField name="divisionName" label="Division name"/>
    <label><span className="mb-1 block text-sm font-semibold">Sub department / section</span><select name="section" className="field"><option value="">Select...</option>{sections.filter((item) => item.active !== false).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
    <label><span className="mb-1 block text-sm font-semibold">Workforce type</span><select name="workforceType" className="field"><option value="LOCAL">Local</option><option value="EXPAT">Expat</option></select></label>
    <label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold">Assigned job description</span><textarea name="jobDescription" className="field" rows={3}/></label>
    <TextField name="employeeCategory" label="Employee category"/>
    <TextField name="jobLevel" label="Job level"/>
    <TextField name="employeeBand" label="Employee level / band"/>
    <TextField name="businessUnit" label="Business unit"/>
    <TextField name="branch" label="Branch"/>
    <TextField name="costCenter" label="Cost center"/>
    <label><span className="mb-1 block text-sm font-semibold">Job status</span><select name="status" className="field"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="SUSPENDED">Suspended</option></select></label>
    <label><span className="mb-1 block text-sm font-semibold">Supervisor</span><select name="reportingManager" className="field"><option value="">Select...</option>{managers.map((item) => <option key={item._id} value={item._id}>{item.fullName} ({item.employeeId})</option>)}</select></label>
    <label><span className="mb-1 block text-sm font-semibold">Reviewer / HOD</span><select name="reviewer" className="field"><option value="">Select...</option>{managers.map((item) => <option key={item._id} value={item._id}>{item.fullName} ({item.employeeId})</option>)}</select></label>
    <TextField name="actualJoiningDate" label="Actual joining date" type="date"/>
    <TextField name="approvedPositionId" label="Approved position ID"/>
    <TextField name="requisitionNo" label="Requisition no."/>
    <label><span className="mb-1 block text-sm font-semibold">Joining source</span><select name="joiningSource" className="field"><option value="">Select...</option><option>New position</option><option>Replacement</option><option>Internal transfer</option><option>Recruitment</option><option>Other</option></select></label>
    <label><span className="mb-1 block text-sm font-semibold">Time attendance applicable?</span><select name="timeAttendanceApplicable" className="field"><option value="true">Yes</option><option value="false">No</option></select></label>
    <TextField name="dutySchedule" label="Duty schedule" placeholder="General shift (09:00 AM to 06:00 PM)"/>
    <TextField name="workShift" label="Shift"/>
    <TextField name="lockerNumber" label="Locker number"/>
    <TextField name="dormitory" label="Dormitory"/>
    <label><span className="mb-1 block text-sm font-semibold">Uniform applicable?</span><select name="uniformApplicable" className="field"><option value="false">No</option><option value="true">Yes</option></select></label>
    <TextField name="regionName" label="Region name"/>
    <TextField name="clusterName" label="Cluster name"/>
    <TextField name="depotName" label="Depot name"/>
    <TextField name="territoryName" label="Territory name"/>
    <TextField name="areaName" label="Area name"/>
    <TextField name="otherErpId" label="Brand / other ERP ID"/>
    <label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold">Employment-related remarks</span><textarea name="employmentRemarks" className="field" rows={3}/></label>

    <SectionTitle title="Personal & contact information" description="Personal details and communication information for the employee profile."/>
    <TextField name="fatherName" label="Father's name"/>
    <TextField name="motherName" label="Mother's name"/>
    <TextField name="dateOfBirth" label="Date of birth" type="date"/>
    <label><span className="mb-1 block text-sm font-semibold">Gender</span><select name="gender" className="field"><option value="">Select...</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option><option value="UNDISCLOSED">Undisclosed</option></select></label>
    <TextField name="bloodGroup" label="Blood group"/>
    <TextField name="nationality" label="Nationality" placeholder="Bangladeshi"/>
    <TextField name="religion" label="Religion"/>
    <label><span className="mb-1 block text-sm font-semibold">Marital status</span><select name="maritalStatus" className="field"><option value="">Select...</option><option value="SINGLE">Single</option><option value="MARRIED">Married</option><option value="DIVORCED">Divorced</option><option value="WIDOWED">Widowed</option><option value="UNDISCLOSED">Undisclosed</option></select></label>
    <TextField name="heightCm" label="Height (cm)" type="number"/>
    <TextField name="weightKg" label="Weight (kg)" type="number"/>
    <label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold">Special training / skills</span><textarea name="specialSkills" className="field" rows={2}/></label>
    <TextField name="personalMobile" label="Personal mobile"/>
    <TextField name="officialMobile" label="Official mobile"/>
    <TextField name="residentPhone" label="Resident phone"/>
    <TextField name="personalEmail" label="Personal email" type="email"/>
    <TextField name="officialEmail" label="Official email" type="email"/>
    <AddressFields prefix="present" title="Present address"/>
    <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" name="sameAsPresent" className="size-4"/><span className="text-sm font-semibold">Permanent address is the same as present address</span></label>
    <AddressFields prefix="permanent" title="Permanent address"/>

    <SectionTitle title="Family & emergency" description="Optional family records and up to two emergency contacts."/>
    {[1, 2].map((index) => <div key={`family-${index}`} className="grid gap-4 rounded-md border border-slate-200 p-4 sm:col-span-2 sm:grid-cols-2"><h3 className="font-semibold sm:col-span-2">Family member {index}</h3><TextField name={`family${index}Name`} label="Name"/><TextField name={`family${index}Relationship`} label="Relationship"/><TextField name={`family${index}Occupation`} label="Occupation"/><TextField name={`family${index}Phone`} label="Phone"/><TextField name={`family${index}DateOfBirth`} label="Date of birth" type="date"/><TextField name={`family${index}AnniversaryDate`} label="Anniversary date" type="date"/><label className="flex items-center gap-2"><input type="checkbox" name={`family${index}Dependent`} className="size-4"/><span className="text-sm font-semibold">Dependent</span></label></div>)}
    {[1, 2].map((index) => <div key={`emergency-${index}`} className="grid gap-4 rounded-md border border-slate-200 p-4 sm:col-span-2 sm:grid-cols-2"><h3 className="font-semibold sm:col-span-2">Emergency contact {index}</h3><TextField name={`emergency${index}Name`} label="Name"/><TextField name={`emergency${index}Relationship`} label="Relationship"/><TextField name={`emergency${index}Phone`} label="Phone"/><label><span className="mb-1 block text-sm font-semibold">Address</span><textarea name={`emergency${index}Address`} className="field" rows={2}/></label></div>)}

    <SectionTitle title="Identity information" description="Sensitive identity information is restricted to authorized HR roles."/>
    <TextField name="nationalId" label="National ID"/>
    <TextField name="birthRegistrationNumber" label="Birth registration number"/>
    <TextField name="eTin" label="E-TIN"/>
    <TextField name="passportNumber" label="Passport number"/>
    <TextField name="passportIssueDate" label="Passport issue date" type="date"/>
    <TextField name="passportExpiryDate" label="Passport expiry date" type="date"/>
    <TextField name="visaNumber" label="Visa number"/>
    <TextField name="visaIssueDate" label="Visa issue date" type="date"/>
    <TextField name="visaExpiryDate" label="Visa expiry date" type="date"/>
    <TextField name="workPermitStartDate" label="Work permit start" type="date"/>
    <TextField name="workPermitEndDate" label="Work permit end" type="date"/>
    <label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold">Identification marks</span><textarea name="identificationMarks" className="field" rows={2}/></label>

    {canManageBank && <>
      <SectionTitle title="Bank information" description="Restricted to Super Admin and HR Admin. Payroll is not included in this phase."/>
      <TextField name="bankName" label="Bank name"/>
      <TextField name="bankBranchName" label="Branch name"/>
      <TextField name="bankAccountName" label="Account name"/>
      <TextField name="bankAccountNumber" label="Account number"/>
      <TextField name="bankRoutingNumber" label="Routing number"/>
      <label><span className="mb-1 block text-sm font-semibold">Account type</span><select name="bankAccountType" className="field"><option value="">Select...</option><option value="SAVINGS">Savings</option><option value="CURRENT">Current</option><option value="SALARY">Salary</option><option value="OTHER">Other</option></select></label>
      <TextField name="mobileFinancialService" label="Mobile financial service" placeholder="bKash / Nagad / Rocket"/>
      <TextField name="mobileAccountNumber" label="Mobile account number"/>
    </>}
  </>;
}
