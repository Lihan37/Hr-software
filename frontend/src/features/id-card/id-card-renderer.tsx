'use client';

import type { CSSProperties } from 'react';
import type { IdCardFieldKey, IdCardTemplate } from './id-card-template';

export type IdCardEmployee = {
  _id: string;
  employeeId: string;
  fullName: string;
  profilePhoto?: { url: string };
  personal?: { bloodGroup?: string };
  employment: {
    joiningDate: string;
    department?: { name: string };
    designation?: { name: string };
    locationRef?: { name: string };
    location?: string;
  };
};

function fieldValue(employee: IdCardEmployee, key: Exclude<IdCardFieldKey, 'photo'>) {
  const values: Record<Exclude<IdCardFieldKey, 'photo'>, string> = {
    fullName: employee.fullName,
    employeeId: employee.employeeId,
    designation: employee.employment.designation?.name ?? '',
    department: employee.employment.department?.name ?? '',
    bloodGroup: employee.personal?.bloodGroup ?? '',
    joiningDate: employee.employment.joiningDate ? new Date(employee.employment.joiningDate).toLocaleDateString('en-GB') : '',
    location: employee.employment.locationRef?.name ?? employee.employment.location ?? '',
  };
  return values[key];
}

export function IdCardRenderer({ employee, template }: { employee: IdCardEmployee; template: IdCardTemplate }) {
  if (template.status !== 'READY' || !template.widthMm || !template.heightMm) return null;
  return <div id="id-card-print-area" className="flex flex-wrap justify-center gap-6">
    {template.sides.map((side) => <section key={side.side} aria-label={`${side.side} of ID card`} className="id-card-side relative shrink-0 overflow-hidden bg-white shadow-lg print:shadow-none" style={{ width: `${template.widthMm}mm`, height: `${template.heightMm}mm` }}>
      <img src={side.backgroundUrl} alt="" className="absolute inset-0 size-full" aria-hidden="true"/>
      {side.fields.map((field) => {
        const style: CSSProperties = {
          left: `${field.xPercent}%`, top: `${field.yPercent}%`, width: `${field.widthPercent}%`, height: `${field.heightPercent}%`,
          fontSize: field.fontSizePt ? `${field.fontSizePt}pt` : undefined, fontWeight: field.fontWeight,
          color: field.color, textAlign: field.textAlign, overflow: 'hidden',
        };
        if (field.key === 'photo') return employee.profilePhoto?.url
          ? <img key={field.key} src={employee.profilePhoto.url} alt={employee.fullName} className="absolute object-cover" style={{ ...style, objectPosition: field.objectPosition ?? 'center' }}/>
          : <div key={field.key} className="absolute grid place-items-center bg-slate-100 text-slate-500" style={style}>Photo unavailable</div>;
        return <div key={field.key} className="absolute flex items-center whitespace-nowrap leading-tight" style={style}><span className="block w-full overflow-hidden text-ellipsis">{fieldValue(employee, field.key)}</span></div>;
      })}
    </section>)}
  </div>;
}
