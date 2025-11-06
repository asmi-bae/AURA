import { z, ZodSchema } from 'zod';
export declare function validate<T>(schema: ZodSchema<T>, data: unknown): T;
export declare function validateAsync<T>(schema: ZodSchema<T>, data: unknown): Promise<T>;
export declare const schemas: {
    id: z.ZodString;
    email: z.ZodString;
    url: z.ZodString;
    date: z.ZodString;
    pagination: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortOrder: "asc" | "desc";
        sortBy?: string | undefined;
    }, {
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: string | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
};
//# sourceMappingURL=validation.d.ts.map