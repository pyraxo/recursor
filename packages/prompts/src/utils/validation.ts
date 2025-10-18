/**
 * Validation utilities for prompt variables
 */

import type {
  VariableSchema,
  ValidationResult,
  ValidationError,
} from "../types.js";

/**
 * Validates variables against a schema
 */
export class PromptValidator {
  /**
   * Validate a set of variables against their schema
   */
  validate(
    variables: Record<string, unknown>,
    schema: Record<string, VariableSchema>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Check for missing required variables
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      if (fieldSchema.required && !(fieldName in variables)) {
        errors.push({
          field: fieldName,
          message: `Missing required variable: ${fieldName}`,
          expected: fieldSchema.type,
          received: undefined,
        });
      }
    }

    // Validate provided variables
    for (const [fieldName, value] of Object.entries(variables)) {
      const fieldSchema = schema[fieldName];

      // Check if variable is defined in schema
      if (!fieldSchema) {
        errors.push({
          field: fieldName,
          message: `Unknown variable: ${fieldName} is not defined in schema`,
          expected: "defined in schema",
          received: value,
        });
        continue;
      }

      // Skip validation for undefined optional variables
      if (value === undefined && !fieldSchema.required) {
        continue;
      }

      // Validate type
      const typeError = this.validateType(fieldName, value, fieldSchema);
      if (typeError) {
        errors.push(typeError);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single value against its schema
   */
  private validateType(
    fieldName: string,
    value: unknown,
    schema: VariableSchema
  ): ValidationError | null {
    const actualType = this.getType(value);

    switch (schema.type) {
      case "string":
        if (typeof value !== "string") {
          return {
            field: fieldName,
            message: `Expected string for ${fieldName}`,
            expected: "string",
            received: value,
          };
        }
        break;

      case "number":
        if (typeof value !== "number") {
          return {
            field: fieldName,
            message: `Expected number for ${fieldName}`,
            expected: "number",
            received: value,
          };
        }
        break;

      case "boolean":
        if (typeof value !== "boolean") {
          return {
            field: fieldName,
            message: `Expected boolean for ${fieldName}`,
            expected: "boolean",
            received: value,
          };
        }
        break;

      case "array":
        if (!Array.isArray(value)) {
          return {
            field: fieldName,
            message: `Expected array for ${fieldName}`,
            expected: "array",
            received: value,
          };
        }

        // Validate array items if schema provided
        if (schema.items) {
          for (let i = 0; i < value.length; i++) {
            const itemError = this.validateType(
              `${fieldName}[${i}]`,
              value[i],
              schema.items
            );
            if (itemError) {
              return itemError;
            }
          }
        }
        break;

      case "object":
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          return {
            field: fieldName,
            message: `Expected object for ${fieldName}`,
            expected: "object",
            received: value,
          };
        }

        // Validate object properties if schema provided
        if (schema.properties) {
          for (const [propName, propSchema] of Object.entries(schema.properties)) {
            const propValue = (value as Record<string, unknown>)[propName];
            if (propSchema.required && propValue === undefined) {
              return {
                field: `${fieldName}.${propName}`,
                message: `Missing required property: ${fieldName}.${propName}`,
                expected: propSchema.type,
                received: undefined,
              };
            }
            if (propValue !== undefined) {
              const propError = this.validateType(
                `${fieldName}.${propName}`,
                propValue,
                propSchema
              );
              if (propError) {
                return propError;
              }
            }
          }
        }
        break;

      default:
        return {
          field: fieldName,
          message: `Unknown type in schema: ${schema.type}`,
          expected: "string | number | boolean | object | array",
          received: schema.type,
        };
    }

    return null;
  }

  /**
   * Get the type of a value as a string
   */
  private getType(value: unknown): string {
    if (Array.isArray(value)) return "array";
    if (value === null) return "null";
    return typeof value;
  }

  /**
   * Apply default values to variables
   */
  applyDefaults(
    variables: Record<string, unknown>,
    schema: Record<string, VariableSchema>
  ): Record<string, unknown> {
    const result = { ...variables };

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      if (!(fieldName in result) && fieldSchema.default !== undefined) {
        result[fieldName] = fieldSchema.default;
      }
    }

    return result;
  }

  /**
   * Get a helpful error message from validation result
   */
  formatErrors(result: ValidationResult): string {
    if (result.valid) {
      return "";
    }

    const errorMessages = result.errors.map((error) => {
      return `  - ${error.field}: ${error.message} (expected ${error.expected}, received ${JSON.stringify(error.received)})`;
    });

    return `Validation failed:\n${errorMessages.join("\n")}`;
  }
}

/**
 * Singleton validator instance
 */
export const validator = new PromptValidator();
