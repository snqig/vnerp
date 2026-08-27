export interface PrintSequence {
  id: number;
  color: string;
  inkCode: string;
  linCode: string;
  storageLocation: string;
  plateCode: string;
  mesh: string;
  plateStorage: string;
  printSide: string;
}

export interface SheetSpecs {
  width: string;
  length: string;
}

export interface CardData {
  cardNo: string;
  customer: string;
  customerCode: string;
  productName: string;
  version: string;
  date: string;
  finishedSize: string;
  tolerance: string;
  materialName: string;
  materialType: string;
  layoutType: string;
  printType: string;
  processMethod: string;
  glueType: string;
  packingType: string;
  spacing: string;
  spacingValue: string;
  sheetSpecs: SheetSpecs;
  coreType: string;
  paperDirection: string;
  rollWidth: string;
  paperEdge: string;
  standardUsage: string;
  jumpDistance: string;
  processFlow1: string;
  processFlow2: string;
  firstJumpDistance: string;
  sequences: PrintSequence[];
  filmManufacturer: string;
  filmCode: string;
  filmSize: string;
  stampingMethod: string;
  moldCode: string;
  layoutMethod: string;
  layoutWay: string;
  jumpDistance2: string;
  mylarMaterial: string;
  mylarSpecs: string;
  mylarLayout: string;
  mylarJump: string;
  adhesiveType: string;
  adhesiveManufacturer: string;
  adhesiveCode: string;
  adhesiveSize: string;
  adhesiveSpecs: string;
  dashedKnife: boolean;
  slicePerRow: string;
  slicePerRoll: string;
  slicePerBundle: string;
  slicePerBag: string;
  slicePerBox: string;
  packingQty: string;
  backKnifeMold: string;
  backMoldCode: string;
  backMylarMold: string;
  releasePaperCode: string;
  releasePaperType: string;
  releasePaperCategory: string;
  releasePaperSpecs: string;
  paddingMaterial: string;
  packingMaterial: string;
  specialColor: string;
  colorFormula: string;
  filePath: string;
  sampleInfo: string;
  notes: string;
  creator: string;
  reviewer: string;
  factoryManager: string;
  qualityManager: string;
  sales: string;
  approver: string;
  documentCode: string;
  moldType: string;
  etchMold: string;
  storageLocation: string;
  extraField: string;
}

export interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  shortName: string;
  contactName?: string;
  contactPhone?: string;
}

export interface StandardCardApiPayload {
  [key: string]: unknown;
  card_no: string;
  customer_name: string;
  customer_code: string;
  product_name: string;
  version: string;
  status: number;
}

export interface StandardCardApiResponse {
  id?: number;
  card_no?: string;
  success?: boolean;
  message?: string;
  data?: StandardCardApiPayload;
}
