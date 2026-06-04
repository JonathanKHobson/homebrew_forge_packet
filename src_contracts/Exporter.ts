export interface ExportRequest {
  setCode: string;
  profileId: string;
  inputImageDir: string;
  outputDir: string;
}

export interface ExportResult {
  setCode: string;
  outputPaths: string[];
  warnings: string[];
}

export interface Exporter {
  target: 'images' | 'cockatrice' | 'print_pdf' | 'gallery';
  export(request: ExportRequest): Promise<ExportResult>;
}
