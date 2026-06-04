export interface ImportRequest {
  sourcePath: string;
  setCode: string;
  mappingPath?: string;
  dryRun: boolean;
  downloadArt?: boolean;
}

export interface ImportResult {
  setCode: string;
  cardsWritten: number;
  facesWritten: number;
  artRowsWritten: number;
  warnings: string[];
  reportPath?: string;
}

export interface Importer {
  sourceType: 'csv' | 'cockatrice' | 'mse' | 'mtgdesign_export';
  import(request: ImportRequest): Promise<ImportResult>;
}
