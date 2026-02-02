import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';

/**
 * Validation Error Response
 */
interface ValidationErrorResponse {
    success: false;
    message: string;
    code: string;
    errors: Array<{
        field: string;
        message: string;
    }>;
}

/**
 * Validation Middleware Factory
 * Creates a middleware that validates request body against a Zod schema
 * @param schema - Zod schema to validate against
 */
export function validate<T>(schema: ZodSchema<T>) {
    return (
        req: Request,
        res: Response<ValidationErrorResponse>,
        next: NextFunction
    ): void => {
        try {
            // Parse and validate request body
            const validatedData = schema.parse(req.body);

            // Replace body with validated/transformed data
            req.body = validatedData;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));

                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    errors,
                });
                return;
            }

            // Re-throw unexpected errors
            next(error);
        }
    };
}

/**
 * Validate Query Params Middleware Factory
 * @param schema - Zod schema to validate against
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
    return (
        req: Request,
        res: Response<ValidationErrorResponse>,
        next: NextFunction
    ): void => {
        try {
            const validatedData = schema.parse(req.query);
            req.query = validatedData as unknown as typeof req.query;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));

                res.status(400).json({
                    success: false,
                    message: 'Query validation failed',
                    code: 'VALIDATION_ERROR',
                    errors,
                });
                return;
            }

            next(error);
        }
    };
}

/**
 * Validate Route Params Middleware Factory
 * @param schema - Zod schema to validate against
 */
export function validateParams<T>(schema: ZodSchema<T>) {
    return (
        req: Request,
        res: Response<ValidationErrorResponse>,
        next: NextFunction
    ): void => {
        try {
            const validatedData = schema.parse(req.params);
            req.params = validatedData as unknown as typeof req.params;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));

                res.status(400).json({
                    success: false,
                    message: 'Parameter validation failed',
                    code: 'VALIDATION_ERROR',
                    errors,
                });
                return;
            }

            next(error);
        }
    };
}

export default {
    validate,
    validateQuery,
    validateParams,
};
