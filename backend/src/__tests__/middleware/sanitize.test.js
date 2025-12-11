const sanitizeInput = require('../../middleware/sanitize');

describe('Sanitize Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {}
    };
    res = {};
    next = jest.fn();
  });

  test('should sanitize XSS in request body', () => {
    req.body = {
      name: 'John<script>alert("xss")</script>Doe',
      email: 'test@example.com'
    };

    sanitizeInput(req, res, next);

    expect(req.body.name).not.toContain('<script>');
    expect(req.body.email).toBe('test@example.com');
    expect(next).toHaveBeenCalled();
  });

  test('should sanitize event handlers', () => {
    req.body = {
      name: '<div onclick="alert(\'xss\')">Click me</div>'
    };

    sanitizeInput(req, res, next);

    expect(req.body.name).not.toContain('onclick');
    expect(next).toHaveBeenCalled();
  });

  test('should sanitize javascript protocol', () => {
    req.body = {
      link: 'javascript:alert("xss")'
    };

    sanitizeInput(req, res, next);

    expect(req.body.link).not.toContain('javascript:');
    expect(next).toHaveBeenCalled();
  });

  test('should handle nested objects', () => {
    req.body = {
      user: {
        name: 'John<script>alert("xss")</script>',
        profile: {
          bio: '<div onclick="alert(1)">Bio</div>'
        }
      }
    };

    sanitizeInput(req, res, next);

    expect(req.body.user.name).not.toContain('<script>');
    expect(req.body.user.profile.bio).not.toContain('onclick');
    expect(next).toHaveBeenCalled();
  });

  test('should handle arrays', () => {
    req.body = {
      items: [
        { name: 'Item<script>xss</script>1' },
        { name: 'Item2' }
      ]
    };

    sanitizeInput(req, res, next);

    expect(req.body.items[0].name).not.toContain('<script>');
    expect(req.body.items[1].name).toBe('Item2');
    expect(next).toHaveBeenCalled();
  });

  test('should not modify safe content', () => {
    req.body = {
      name: 'John Doe',
      age: 25,
      email: 'john@example.com'
    };

    sanitizeInput(req, res, next);

    expect(req.body.name).toBe('John Doe');
    expect(req.body.age).toBe(25);
    expect(req.body.email).toBe('john@example.com');
    expect(next).toHaveBeenCalled();
  });

  test('should sanitize query parameters', () => {
    req.query = {
      search: '<script>alert("xss")</script>test'
    };

    sanitizeInput(req, res, next);

    expect(req.query.search).not.toContain('<script>');
    expect(next).toHaveBeenCalled();
  });

  test('should sanitize URL parameters', () => {
    req.params = {
      id: '<script>alert("xss")</script>123'
    };

    sanitizeInput(req, res, next);

    expect(req.params.id).not.toContain('<script>');
    expect(next).toHaveBeenCalled();
  });
});
