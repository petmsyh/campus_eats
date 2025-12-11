# Security Policy

## Reporting a Vulnerability

We take the security of Campus Eats seriously. If you discover a security vulnerability, we appreciate your help in disclosing it to us in a responsible manner.

### How to Report

**Please do NOT create a public GitHub issue for security vulnerabilities.**

Instead, please report security vulnerabilities by emailing: **security@campuseats.et**

### What to Include

When reporting a vulnerability, please include:

1. **Description**: A clear description of the vulnerability
2. **Impact**: The potential impact of the vulnerability
3. **Steps to Reproduce**: Detailed steps to reproduce the issue
4. **Proof of Concept**: If possible, include a proof of concept
5. **Suggested Fix**: If you have a suggested fix, please include it
6. **Your Contact Information**: So we can follow up with you

### Response Timeline

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
- **Initial Response**: We will provide a detailed response within 7 days
- **Fix Timeline**: We aim to release security fixes within 30 days, depending on complexity
- **Disclosure**: We will work with you on a coordinated disclosure timeline

### Scope

The following are in scope for security reporting:

- Authentication and authorization bypasses
- SQL injection, XSS, CSRF vulnerabilities
- Remote code execution vulnerabilities
- Data exposure or leakage
- API security issues
- Payment processing vulnerabilities
- Session management issues

### Out of Scope

The following are generally out of scope:

- Social engineering attacks
- Physical attacks
- Denial of Service (DoS) attacks
- Issues in third-party dependencies (report directly to the vendor)
- Issues requiring physical access to a user's device
- Recently disclosed zero-day vulnerabilities (give us time to patch)

## Security Measures

### Current Security Implementations

Campus Eats implements the following security measures:

#### OWASP Top 10 Protection

1. **Injection Prevention**
   - Using Prisma ORM with parameterized queries
   - Input validation on all endpoints
   - Input sanitization middleware

2. **Broken Authentication**
   - JWT-based authentication with secure tokens
   - bcrypt password hashing (10 rounds)
   - Rate limiting on authentication endpoints
   - Account lockout after failed attempts

3. **Sensitive Data Exposure**
   - HTTPS-only in production
   - Encrypted passwords with bcrypt
   - Secure token storage
   - No sensitive data in logs

4. **XML External Entities (XXE)**
   - Not applicable (JSON API only)

5. **Broken Access Control**
   - Role-based access control (RBAC)
   - Authorization checks on all protected routes
   - User-owned resource validation

6. **Security Misconfiguration**
   - Security headers via Helmet.js
   - Secure default configurations
   - Environment-based config
   - Regular dependency updates

7. **Cross-Site Scripting (XSS)**
   - Input sanitization middleware
   - Content Security Policy headers
   - Output encoding

8. **Insecure Deserialization**
   - No object deserialization from untrusted sources
   - JSON parsing with size limits

9. **Using Components with Known Vulnerabilities**
   - Regular dependency audits
   - Automated security scanning in CI/CD
   - npm audit in development

10. **Insufficient Logging & Monitoring**
    - Winston logger with multiple levels
    - Request/response logging
    - Error tracking
    - Security event logging

#### Additional Security Measures

- **Rate Limiting**: Protection against brute force and DoS attacks
- **CORS**: Whitelist-based origin validation
- **Request Size Limits**: Prevention of large payload attacks
- **HTTP Security Headers**: Via Helmet.js
  - HSTS (HTTP Strict Transport Security)
  - X-Content-Type-Options
  - X-Frame-Options
  - X-XSS-Protection
  - Content Security Policy
  - Referrer Policy
- **Error Handling**: No sensitive information leakage
- **Database Security**: Connection pooling, timeout management
- **API Security**: Input validation with express-validator

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Security Updates

Security updates will be released as patch versions (e.g., 2.0.1) and announced through:

1. GitHub Security Advisories
2. Release notes
3. Email notifications to registered users
4. Project README updates

## Acknowledgments

We appreciate the security researchers and users who help keep Campus Eats secure. Security researchers who responsibly disclose vulnerabilities will be acknowledged (with permission) in our security acknowledgments page.

## Contact

For security concerns: security@campuseats.et

For general inquiries: support@campuseats.et

---

Last Updated: December 2024
