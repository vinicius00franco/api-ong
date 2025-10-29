import { extractToken, verifyJWT } from '@/middleware/auth'
import { NextApiRequest } from 'next'
import { UnauthorizedError } from '@/lib/errors'
import jwt from 'jsonwebtoken'

describe('Auth Middleware', () => {
  describe('extractToken', () => {
    it('should extract token from Bearer header', () => {
      const req = {
        headers: {
          authorization: 'Bearer valid_token_here'
        }
      } as NextApiRequest

      const token = extractToken(req)
      expect(token).toBe('valid_token_here')
    })

    it('should throw UnauthorizedError when no authorization header', () => {
      const req = {
        headers: {}
      } as NextApiRequest

      expect(() => extractToken(req)).toThrow(UnauthorizedError)
    })

    it('should throw UnauthorizedError when empty token', () => {
      const req = {
        headers: {
          authorization: 'Bearer '
        }
      } as NextApiRequest

      expect(() => extractToken(req)).toThrow(UnauthorizedError)
    })
  })

  describe('verifyJWT', () => {
    const originalEnv = process.env.JWT_SECRET

    beforeEach(() => {
      process.env.JWT_SECRET = 'test_secret'
    })

    afterEach(() => {
      process.env.JWT_SECRET = originalEnv
    })

    it('should verify valid JWT and return payload', () => {
      const payload = { userId: 1, organizationId: 2 }
      const token = jwt.sign(payload, 'test_secret')

      const result = verifyJWT(token)

      expect(result).toMatchObject(payload)
    })

    it('should throw UnauthorizedError for invalid token', () => {
      const invalidToken = 'invalid_token'

      expect(() => verifyJWT(invalidToken)).toThrow(UnauthorizedError)
    })

    it('should throw Error when JWT_SECRET not configured', () => {
      delete process.env.JWT_SECRET

      expect(() => verifyJWT('any_token')).toThrow('JWT_SECRET not configured')
    })
  })
})