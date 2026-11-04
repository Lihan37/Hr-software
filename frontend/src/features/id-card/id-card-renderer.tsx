'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { IdCardFieldKey, IdCardFieldPlacement, IdCardSide, IdCardTemplate } from './id-card-template';

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
    joiningDate: employee.employment.joiningDate ? new Date(employee.employment.joiningDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }) : '',
    location: employee.employment.locationRef?.name ?? employee.employment.location ?? '',
  };
  return values[key];
}

function CardText({ field, value, style }: { field: IdCardFieldPlacement; value: string; style: CSSProperties }) {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const container = box.current; const content = text.current;
    if (!container || !content) return;
    let fontSize = field.fontSizePt ?? 7;
    const minimum = field.minFontSizePt ?? 6;
    content.style.fontSize = `${fontSize}pt`;
    while ((content.scrollHeight > container.clientHeight + 1 || content.scrollWidth > container.clientWidth + 1) && fontSize > minimum) {
      fontSize = Math.max(minimum, fontSize - .25); content.style.fontSize = `${fontSize}pt`;
    }
    setOverflow(content.scrollHeight > container.clientHeight + 1 || content.scrollWidth > container.clientWidth + 1);
  }, [field, value]);
  return <div ref={box} data-card-field={field.key} data-card-overflow={overflow ? 'true' : undefined} className="absolute flex items-center" style={style} title={value}>
    <span ref={text} className="block w-full" style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.1 }}>{field.label}{value || '—'}</span>
  </div>;
}

function CardPhoto({ url, name, style }: { url?: string; name: string; style: CSSProperties }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <div data-card-photo-missing="true" className="absolute grid place-items-center bg-slate-100 text-center text-[6pt] text-slate-500" style={style}>Photo unavailable</div>;
  return <img src={url} alt={name} className="absolute object-cover" style={style} onError={() => setFailed(true)} />;
}

export function IdCardRenderer({ employee, template, printLayout = false }: { employee: IdCardEmployee; template: IdCardTemplate; printLayout?: boolean }) {
  if (template.status !== 'READY' || !template.widthMm || !template.heightMm) return null;
  const radius = `${Math.min(Math.max(0, template.cornerRadiusMm ?? 0), template.widthMm / 2, template.heightMm / 2)}mm`;
  return <div data-card-layout={printLayout ? 'print' : 'preview'} className={printLayout ? '' : 'flex flex-wrap justify-center gap-6'}>
    {template.sides.map((side) => <section key={side.side} aria-label={`${side.side} of ID card`} data-card-shape={printLayout && side.printCornerFill ? 'square' : 'rounded'} className="id-card-side relative shrink-0 overflow-hidden bg-white shadow-lg print:shadow-none" style={{ width: `${template.widthMm}mm`, height: `${template.heightMm}mm`, borderRadius: printLayout && side.printCornerFill ? 0 : radius, clipPath: printLayout && side.printCornerFill ? 'none' : `inset(0 round ${radius})` }}>
      <img src={side.backgroundUrl} alt="" className="absolute inset-0 size-full" style={{ objectFit: printLayout && side.printCornerFill ? 'cover' : 'contain' }} aria-hidden="true"/>
      {printLayout && side.printCornerFill && <PrintCornerFills fill={side.printCornerFill} cornerMm={Math.min(template.cornerRadiusMm ?? 4, template.widthMm! / 2, template.heightMm! / 2)} heightMm={template.heightMm!} />}
      {side.fields.map((field) => {
        const style: CSSProperties = {
          left: `${field.xPercent}%`, top: `${field.yPercent}%`, width: `${field.widthPercent}%`, height: `${field.heightPercent}%`,
          fontSize: field.fontSizePt ? `${field.fontSizePt}pt` : undefined, fontWeight: field.fontWeight,
          color: field.color ?? '#171717', textAlign: field.textAlign, overflow: 'hidden', fontFamily: 'Arial, sans-serif', borderRadius: field.borderRadiusPercent ? `${field.borderRadiusPercent}%` : undefined,
        };
        if (field.key === 'photo') return <CardPhoto key={`${employee._id}:${employee.profilePhoto?.url}`} url={employee.profilePhoto?.url} name={employee.fullName} style={{ ...style, objectPosition: field.objectPosition ?? 'center' }} />;
        return <CardText key={field.key} field={field} value={fieldValue(employee, field.key)} style={style} />;
      })}
    </section>)}
  </div>;
}

function PrintCornerFills({ fill, cornerMm, heightMm }: { fill: NonNullable<IdCardSide['printCornerFill']>; cornerMm: number; heightMm: number }) {
  if (cornerMm <= 0) return null;
  // Match the original footer boundary rather than extending the back's band
  // upwards. Vector fills print even when browser background graphics are off.
  const footerHeight = Math.max(0, Math.min(100, (100 - fill.footerStartPercent) / 100 * heightMm / cornerMm * 100));
  return <>{['top', 'bottom'].flatMap((vertical) => ['left', 'right'].map((horizontal) => <svg key={`${vertical}-${horizontal}`} data-print-corner={`${vertical}-${horizontal}`} aria-hidden="true" className="pointer-events-none absolute" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: `${cornerMm}mm`, height: `${cornerMm}mm`, [vertical]: 0, [horizontal]: 0 }}>
    <rect width="100" height="100" fill={fill.topColor} />
    {vertical === 'bottom' && <rect y={100 - footerHeight} width="100" height={footerHeight} fill={fill.bottomColor} />}
  </svg>))}</>;
}
