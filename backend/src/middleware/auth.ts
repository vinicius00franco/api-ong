import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next'
import jwt from 'jsonwebtoken'
import { UnauthorizedError } from '@/lib/errors'

interface AuthenticatedRequest extends NextApiRequest {
  userId: number
  organizationId: number
}

interface JWTPayload {
  userId: number
  organizationId: number
}

export const withAuth = (handler: NextApiHandler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = extractToken(req)
      const payload = verifyJWT(token)
      
      // Adiciona dados do usuário à requisição
      ;(req as AuthenticatedRequest).userId = payload.userId
      ;(req as AuthenticatedRequest).organizationId = payload.organizationId
      
      return handler(req, res)
    } catch (error) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: error instanceof Error ? error.message : 'Invalid token'
      })
    }
  }
}

export const extractToken = (req: NextApiRequest): string => {
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    throw new UnauthorizedError('Authorization header missing')
  }
  
  const token = authHeader.replace('Bearer ', '')
  
  if (!token) {
    throw new UnauthorizedError('Token missing')
  }
  
  return token
}

export const verifyJWT = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET
  
  if (!secret) {
    throw new Error('JWT_SECRET not configured')
  }
  
  try {
    const payload = jwt.verify(token, secret) as JWTPayload
    return payload
  } catch (error) {
    throw new UnauthorizedError('Invalid token')
  }
}