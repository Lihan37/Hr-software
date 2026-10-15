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
  sides: IdCardSide[];
};

// The official design must be inserted here without approximating its dimensions
// or field coordinates. This deliberately remains inactive until it is supplied.
export const employeeIdCardTemplate: IdCardTemplate = {
  status: 'AWAITING_TEMPLATE',
  widthMm: null,
  heightMm: null,
  sides: [],
};
