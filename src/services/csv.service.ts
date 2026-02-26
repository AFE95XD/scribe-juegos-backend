import { parse } from 'csv-parse/sync';

export interface CSVPrizeRow {
  title: string;
  description: string;
  pointsRequired: string;
  stock: string;
  startDate?: string;
  endDate?: string;
  isActive?: string;
}

export interface ParsedPrizeData {
  title: string;
  description: string;
  pointsRequired: number;
  stock: number;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export class CSVService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_ROWS = 1000;

  /**
   * Parse CSV buffer and return array of records
   */
  parseCSV(buffer: Buffer): CSVPrizeRow[] {
    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new Error(`El archivo CSV excede el tamaño máximo permitido (5MB)`);
    }

    try {
      const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true, // Handle UTF-8 BOM
      }) as CSVPrizeRow[];

      if (records.length === 0) {
        throw new Error('El archivo CSV está vacío');
      }

      if (records.length > this.MAX_ROWS) {
        throw new Error(`El archivo CSV excede el límite de ${this.MAX_ROWS} filas`);
      }

      return records;
    } catch (error: any) {
      throw new Error(`Error al parsear CSV: ${error.message}`);
    }
  }

  /**
   * Validate and transform CSV data
   */
  validateAndTransform(rows: CSVPrizeRow[]): {
    data: ParsedPrizeData[];
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    const data: ParsedPrizeData[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because: 1-based index + 1 for header
      const rowErrors = this.validateRow(row, rowNumber);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        try {
          data.push(this.transformRow(row));
        } catch (error: any) {
          errors.push({
            row: rowNumber,
            field: 'general',
            message: error.message,
          });
        }
      }
    });

    return { data, errors };
  }

  /**
   * Validate a single CSV row
   */
  private validateRow(row: CSVPrizeRow, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Title validation
    if (!row.title || row.title.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'title',
        message: 'El título es obligatorio',
      });
    } else if (row.title.length > 255) {
      errors.push({
        row: rowNumber,
        field: 'title',
        message: 'El título no puede exceder 255 caracteres',
      });
    }

    // Description validation
    if (!row.description || row.description.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'description',
        message: 'La descripción es obligatoria',
      });
    }

    // PointsRequired validation
    const points = parseInt(row.pointsRequired);
    if (isNaN(points)) {
      errors.push({
        row: rowNumber,
        field: 'pointsRequired',
        message: 'Los puntos requeridos deben ser un número',
      });
    } else if (points <= 0) {
      errors.push({
        row: rowNumber,
        field: 'pointsRequired',
        message: 'Los puntos requeridos deben ser mayores a 0',
      });
    }

    // Stock validation
    const stock = parseInt(row.stock);
    if (isNaN(stock)) {
      errors.push({
        row: rowNumber,
        field: 'stock',
        message: 'El stock debe ser un número',
      });
    } else if (stock < 0) {
      errors.push({
        row: rowNumber,
        field: 'stock',
        message: 'El stock no puede ser negativo',
      });
    }

    // StartDate validation
    if (row.startDate && row.startDate.trim() !== '') {
      if (!this.isValidDate(row.startDate)) {
        errors.push({
          row: rowNumber,
          field: 'startDate',
          message: 'Fecha de inicio inválida (usar formato YYYY-MM-DD)',
        });
      }
    }

    // EndDate validation
    if (row.endDate && row.endDate.trim() !== '') {
      if (!this.isValidDate(row.endDate)) {
        errors.push({
          row: rowNumber,
          field: 'endDate',
          message: 'Fecha de fin inválida (usar formato YYYY-MM-DD)',
        });
      }
    }

    // Date range validation
    if (
      row.startDate &&
      row.startDate.trim() !== '' &&
      row.endDate &&
      row.endDate.trim() !== '' &&
      this.isValidDate(row.startDate) &&
      this.isValidDate(row.endDate)
    ) {
      const start = new Date(row.startDate);
      const end = new Date(row.endDate);
      if (end < start) {
        errors.push({
          row: rowNumber,
          field: 'endDate',
          message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
        });
      }
    }

    // isActive validation
    if (row.isActive && row.isActive.trim() !== '') {
      const lower = row.isActive.toLowerCase().trim();
      if (lower !== 'true' && lower !== 'false') {
        errors.push({
          row: rowNumber,
          field: 'isActive',
          message: 'isActive debe ser true o false',
        });
      }
    }

    return errors;
  }

  /**
   * Transform CSV row to database format
   */
  private transformRow(row: CSVPrizeRow): ParsedPrizeData {
    return {
      title: row.title.trim(),
      description: row.description.trim(),
      pointsRequired: parseInt(row.pointsRequired),
      stock: parseInt(row.stock),
      startDate: row.startDate && row.startDate.trim() !== ''
        ? new Date(row.startDate)
        : null,
      endDate: row.endDate && row.endDate.trim() !== ''
        ? new Date(row.endDate)
        : null,
      isActive: row.isActive && row.isActive.trim() !== ''
        ? row.isActive.toLowerCase().trim() === 'true'
        : true,
    };
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  private isValidDate(dateString: string): boolean {
    // Check format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    // Check if date is valid
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

export const csvService = new CSVService();
