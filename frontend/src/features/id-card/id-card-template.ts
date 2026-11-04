export type IdCardFieldKey =
  | 'photo'
  | 'fullName'
  | 'employeeId'
  | 'designation'
  | 'department'
  | 'bloodGroup'
  | 'joiningDate'
  | 'location';

export type IdCardFieldPlacement = {
  key: IdCardFieldKey;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  fontSizePt?: number;
  fontWeight?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  objectPosition?: string;
  borderRadiusPercent?: number;
  label?: string;
  minFontSizePt?: number;
};

export type IdCardSide = {
  side: 'front' | 'back';
  backgroundUrl: string;
  fields: IdCardFieldPlacement[];
};

export type IdCardTemplate = {
  status: 'AWAITING_TEMPLATE' | 'READY';
  widthMm: number | null;
  heightMm: number | null;
  cornerRadiusMm?: number;
  sides: IdCardSide[];
};

// Original PNGs are copied byte-for-byte. Physical dimensions come from the
// 153.39 x 244.139 pt card outlines in the supplied ID.pdf (not its A4 page).
// Dynamic data occupies only the photo circle and unused front whitespace.
export const employeeIdCardTemplate: IdCardTemplate = {
  status: 'READY',
  widthMm: 153.39 * 25.4 / 72,
  heightMm: 244.139 * 25.4 / 72,
  cornerRadiusMm: 4,
  sides: [
    {
      side: 'front', backgroundUrl: '/id-card/runway/front.png',
      fields: [
        { key: 'photo', xPercent: 27.92, yPercent: 25.64, widthPercent: 44.64, heightPercent: 28.09, borderRadiusPercent: 50, objectPosition: 'center' },
        { key: 'fullName', xPercent: 7, yPercent: 55.2, widthPercent: 86, heightPercent: 8, fontSizePt: 10, minFontSizePt: 6.5, fontWeight: 700, color: '#991b3f', textAlign: 'center' },
        { key: 'designation', xPercent: 7, yPercent: 63.6, widthPercent: 86, heightPercent: 4.5, fontSizePt: 7.5, minFontSizePt: 6, textAlign: 'center' },
        { key: 'department', xPercent: 7, yPercent: 68.4, widthPercent: 86, heightPercent: 3.6, fontSizePt: 6.5, minFontSizePt: 6, textAlign: 'center' },
        { key: 'employeeId', label: 'ID: ', xPercent: 7, yPercent: 72.5, widthPercent: 86, heightPercent: 3, fontSizePt: 7, minFontSizePt: 6, fontWeight: 700, textAlign: 'center' },
        { key: 'bloodGroup', label: 'Blood group: ', xPercent: 7, yPercent: 75.8, widthPercent: 86, heightPercent: 3, fontSizePt: 6.5, minFontSizePt: 6, textAlign: 'center' },
        { key: 'joiningDate', label: 'Joining date: ', xPercent: 7, yPercent: 79.1, widthPercent: 86, heightPercent: 3, fontSizePt: 6.5, minFontSizePt: 6, textAlign: 'center' },
      ],
    },
    { side: 'back', backgroundUrl: '/id-card/runway/back.png', fields: [] },
  ],
};
