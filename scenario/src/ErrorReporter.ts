
import { utils } from 'ethers';
import {ComptrollerErr, TokenErr} from './ErrorReporterConstants';

export interface ErrorReporter {
  getError(error: any): string | null
  getInfo(info: any): string | null
  getDetail(error: any, detail: number): string
  getEncodedCustomError(errorName: string, args: unknown[]): string | null
}

class NoErrorReporterType implements ErrorReporter {
  getError(error: any): string | null {
    return null;
  }

  getInfo(info: any): string | null {
    return null;
  }

  getDetail(error: any, detail: number): string {
    return detail.toString();
  }

  getEncodedCustomError(errorName: string, args: unknown[]): string | null {
    return null
  }
}

class CTokenErrorReporterType implements ErrorReporter {
  getError(error: any): string | null {
    if (error === null) {
      return null;
    } else {
      return TokenErr.ErrorInv[Number(error)];
    }
  }

  getInfo(info: any): string | null {
    if (info === null) {
      return null;
    } else {
      return TokenErr.FailureInfoInv[Number(info)];
    }
  }

  getDetail(error: any, detail: number): string {
    // Little hack to let us use proper names for cross-contract errors
    if (this.getError(error) === "COMPTROLLER_REJECTION") {
      let comptrollerError = ComptrollerErrorReporter.getError(detail);

      if (comptrollerError) {
        return comptrollerError;
      }
    }

    return detail.toString();
  }

  getEncodedCustomError(errorName: string, args: unknown[]): string | null {
    try {
      return TokenErr.CustomErrors.encodeErrorResult(errorName, args)
    } catch (err) {
      return null
    }
  }
}

class ComptrollerErrorReporterType implements ErrorReporter {
  getError(error: any): string | null {
    if (error === null) {
      return null;
    } else {
      // TODO: This probably isn't right...
      return ComptrollerErr.ErrorInv[Number(error)];
    }
  }

  getInfo(info: any): string | null {
    if (info === null) {
      return null;
    } else {
      // TODO: This probably isn't right...
      return ComptrollerErr.FailureInfoInv[Number(info)];
    }
  }

  getDetail(error: any, detail: number): string {
    if (this.getError(error) === "REJECTION") {
      let comptrollerError = ComptrollerErrorReporter.getError(detail);

      if (comptrollerError) {
        return comptrollerError;
      }
    }

    return detail.toString();
  }

  getEncodedCustomError(errorName: string, args: unknown[]): string | null {
    try {
      return ComptrollerErr.CustomErrors.encodeErrorResult(errorName, args)
    } catch (err) {
      return null
    }
  }
}

export function formatResult(errorReporter: ErrorReporter, result: any): string {
  const errorStr = errorReporter.getError(result);
  if (errorStr !== null) {
    return `Error=${errorStr}`
  } else {
    return `Result=${result}`;
  }
}

// Singleton instances
export const NoErrorReporter = new NoErrorReporterType();
export const CTokenErrorReporter = new CTokenErrorReporterType();
export const ComptrollerErrorReporter = new ComptrollerErrorReporterType();
