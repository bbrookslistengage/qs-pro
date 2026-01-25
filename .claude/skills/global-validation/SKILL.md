---
name: Global Validation
description: Implement comprehensive input validation with server-side security, client-side UX feedback, and protection against injection attacks. Use this skill when validating user input, form data, API request bodies, query parameters, or any external data entering the system. Apply when writing validation schemas (Zod, Yup, Joi), sanitizing input, implementing business rule checks, or adding validation to API endpoints and form handlers.
---

## When to use this skill

- When validating user input from forms or API requests
- When creating validation error messages (use `ValidationViolations` constants)
- When throwing validation errors (use `AppError` with `MCE_VALIDATION_FAILED`)
- When implementing server-side validation for security
- When adding client-side validation for immediate user feedback
- When writing validation schemas with Zod or class-validator
- When sanitizing input to prevent SQL injection, XSS, or command injection
- When validating data types, formats, ranges, and required fields
- When implementing SQL query validation (prohibited statements)
- When editing form handlers, API endpoint handlers, or input processing code
- When implementing consistent validation across web forms, APIs, and background jobs

# Global Validation

This skill provides guidance on validation patterns and pre-approved error messages.

## Instructions

For details, refer to the information provided in this file:
[global validation](../../../agent-os/standards/global/validation.md)
