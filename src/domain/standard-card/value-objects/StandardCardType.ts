export enum StandardCardType {
  COLOR = 'color',
  PROCESS = 'process',
  QUALITY = 'quality',
  COMPREHENSIVE = 'comprehensive',
}

export const standardCardTypeLabels: Record<StandardCardType, string> = {
  [StandardCardType.COLOR]: '颜色标准卡',
  [StandardCardType.PROCESS]: '工艺标准卡',
  [StandardCardType.QUALITY]: '质量标准卡',
  [StandardCardType.COMPREHENSIVE]: '综合标准卡',
};

export function getTypeLabel(type: StandardCardType): string {
  return standardCardTypeLabels[type] || type;
}

export function getTypePrefix(type: StandardCardType): string {
  switch (type) {
    case StandardCardType.COLOR:
      return 'SCC';
    case StandardCardType.PROCESS:
      return 'SCP';
    case StandardCardType.QUALITY:
      return 'SCQ';
    case StandardCardType.COMPREHENSIVE:
      return 'SCZ';
    default:
      return 'SC';
  }
}
